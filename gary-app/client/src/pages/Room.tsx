// src/pages/Room.tsx
import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { User } from 'firebase/auth';
import { db } from '../firebase';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import Player from '../components/Player';
import Chat from '../components/Chat';
import io from 'socket.io-client';

const socket = io('http://localhost:5000');

interface RoomProps {
  user: User | null;
}

interface Message {
  userId: string;
  userName: string;
  text: string;
  timestamp: number;
}

interface Track {
  videoId?: string;
  audioUrl?: string;
}

const Room: React.FC<RoomProps> = ({ user }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isHost, setIsHost] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<Track>({
    videoId: 'dQw4w9WgXcQ',
  });
  const [messages, setMessages] = useState<Message[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<{ id: string; name: string }[]>([]);
  const [peerConnection, setPeerConnection] = useState<RTCPeerConnection | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!user || !id) {
      navigate('/');
      return;
    }

    // Join room with username
    socket.emit('join-room', { roomId: id, userName: user.email || 'Guest' });
    socket.on('user-joined', ({ userId, userName }: { userId: string; userName: string }) => {
      if (!isHost) setIsHost(userId === socket.id);
      setOnlineUsers((prev) => [...new Set([...prev, { id: userId, name: userName }])]);
    });
    socket.on('track-changed', (track: Track) => {
      setCurrentTrack(track);
      setDoc(doc(db, 'rooms', id), { currentTrack: track }, { merge: true });
    });
    socket.on('chat-message', (message: Message) => {
      setMessages((prev) => {
        if (!prev.some((m) => m.timestamp === message.timestamp && m.text === message.text)) {
          return [...prev, message];
        }
        return prev;
      });
    });
    socket.on('user-list', (users: { [key: string]: { roomId?: string; userName?: string } }) => {
      const roomUsers = Object.entries(users)
        .filter(([_, data]) => data.roomId === id)
        .map(([userId, data]) => ({ id: userId, name: data.userName || 'Guest' }));
      setOnlineUsers(roomUsers);
    });

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });
    setPeerConnection(pc);

    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));
      })
      .catch((err) => console.error('Media error:', err));

    pc.ontrack = (event) => {
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = event.streams[0];
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('ice-candidate', { roomId: id, candidate: event.candidate });
      }
    };

    socket.on('offer', async (offer: RTCSessionDescriptionInit) => {
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('answer', { roomId: id, answer });
    });

    socket.on('answer', (answer: RTCSessionDescriptionInit) => {
      pc.setRemoteDescription(new RTCSessionDescription(answer));
    });

    socket.on('ice-candidate', (candidate: RTCIceCandidateInit) => {
      pc.addIceCandidate(new RTCIceCandidate(candidate));
    });

    if (isHost) {
      pc.createOffer()
        .then((offer) => pc.setLocalDescription(offer))
        .then(() => socket.emit('offer', { roomId: id, offer: pc.localDescription }));
    }

    const unsubscribe = onSnapshot(doc(db, 'rooms', id), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.currentTrack) setCurrentTrack(data.currentTrack);
        if (data.messages) setMessages(data.messages);
      }
    });

    return () => {
      socket.off('user-joined');
      socket.off('track-changed');
      socket.off('chat-message');
      socket.off('user-list');
      socket.off('offer');
      socket.off('answer');
      socket.off('ice-candidate');
      unsubscribe();
      pc.close();
    };
  }, [user, id, navigate, isHost]);

  const changeTrack = (track: Track) => {
    if (isHost && id) {
      setCurrentTrack(track);
      socket.emit('track-changed', { roomId: id, ...track });
      setDoc(doc(db, 'rooms', id), { currentTrack: track }, { merge: true });
    }
  };

  const sendMessage = (text: string) => {
    if (id && text.trim() && user) {
      const message: Message = {
        userId: socket.id || '', // Fallback to empty string if undefined
        userName: user.email || 'Guest',
        text,
        timestamp: Date.now(),
      };
      socket.emit('chat-message', { roomId: id, message });
      setMessages((prev) => {
        if (!prev.some((m) => m.timestamp === message.timestamp && m.text === message.text)) {
          return [...prev, message];
        }
        return prev;
      });
      setDoc(doc(db, 'rooms', id), { messages: [...messages, message] }, { merge: true });
    }
  };

  if (!user || !id) {
    return <div className="p-6 text-center">Please login to join a room.</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mt-4 text-center">Room: {id}</h1>
      <div className="mt-4 text-center">
        <p>Online Users: {onlineUsers.length} {onlineUsers.map((u) => u.name).join(', ')}</p>
      </div>
      <div className="mt-8 flex flex-col items-center gap-4">
        <div className="flex justify-center gap-4">
          <div>
            <h3 className="text-lg font-semibold mb-2">Your Video</h3>
            <video ref={localVideoRef} autoPlay muted className="w-64 h-48 rounded-lg" />
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-2">Partner's Video</h3>
            <video ref={remoteVideoRef} autoPlay className="w-64 h-48 rounded-lg" />
          </div>
        </div>
        <Player
          videoId={currentTrack.videoId}
          audioUrl={currentTrack.audioUrl}
          roomId={id}
          isHost={isHost}
        />
      </div>
      {isHost && (
        <div className="mt-4 flex flex-col gap-2 max-w-md mx-auto">
          <button
            onClick={() => changeTrack({ videoId: 'dQw4w9WgXcQ' })}
            className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700 transition"
          >
            Play Rickroll (YouTube)
          </button>
          <button
            onClick={() => changeTrack({ audioUrl: 'https://prod-1.storage.jamendo.com/?trackid=143356&format=mp31' })}
            className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700 transition"
          >
            Play Sample Jamendo Track
          </button>
        </div>
      )}
      <Chat
        roomId={id}
        userId={socket.id || ''} // Fallback to empty string
        messages={messages}
        sendMessage={sendMessage}
      />
      <button
        onClick={() => navigate('/me')}
        className="mt-8 w-full max-w-md mx-auto bg-gray-600 text-white p-3 rounded-full hover:bg-gray-700 transition"
      >
        Leave Room
      </button>
    </div>
  );
};

export default Room;