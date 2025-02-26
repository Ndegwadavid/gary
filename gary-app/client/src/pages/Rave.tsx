// src/pages/Rave.tsx
import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { User } from 'firebase/auth';
import { db } from '../firebase';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import Player from '../components/Player';
import Chat from '../components/Chat';
import io from 'socket.io-client';

const getSocketUrl = () => {
  const host = window.location.hostname === 'localhost' ? 'localhost' : window.location.hostname;
  return `http://${host}:5000`;
};

const socket = io(getSocketUrl(), { transports: ['websocket', 'polling'] });

interface RaveProps {
  user: User | null;
}

interface Message {
  userId: string;
  userName: string;
  text: string;
  timestamp: number;
}

interface Track {
  audioUrl?: string;
  title?: string;
  timestamp?: number;
  isPlaying?: boolean;
}

const Rave: React.FC<RaveProps> = ({ user }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isHost, setIsHost] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<Track>({});
  const [messages, setMessages] = useState<Message[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<{ id: string; name: string }[]>([]);
  const [peerConnection, setPeerConnection] = useState<RTCPeerConnection | null>(null);
  const [videoChatActive, setVideoChatActive] = useState(false);
  const [isCallPending, setIsCallPending] = useState(false); // New state for pending call
  const [incomingCall, setIncomingCall] = useState<{ from: string; offer: RTCSessionDescriptionInit } | null>(null);
  const [callStatus, setCallStatus] = useState<string | null>(null);
  const [declinedUsers, setDeclinedUsers] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Track[]>([]);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!user || !id || !/^[a-zA-Z0-9]+$/.test(id)) {
      navigate('/');
      return;
    }

    const raveId = `rave-${id}`;
    socket.emit('join-room', { roomId: raveId, userName: user.email || user.uid });

    socket.on('user-joined', ({ userId }: { userId: string }) => {
      if (!isHost) setIsHost(userId === socket.id);
    });

    socket.on('track-changed', (track: Track) => {
      setCurrentTrack(track);
    });

    socket.on('play', (timestamp: number) => {
      setCurrentTrack((prev) => ({ ...prev, timestamp, isPlaying: true }));
    });

    socket.on('pause', (timestamp: number) => {
      setCurrentTrack((prev) => ({ ...prev, timestamp, isPlaying: false }));
    });

    socket.on('stop', () => {
      setCurrentTrack((prev) => ({ ...prev, timestamp: 0, isPlaying: false }));
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
        .filter(([_, data]) => data.roomId === raveId)
        .map(([userId, data]) => ({ id: userId, name: data.userName || 'Unknown' }));
      setOnlineUsers(Array.from(new Map(roomUsers.map((u) => [u.id, u])).values()));
    });

    socket.on('offer', (data: { from: string; offer: RTCSessionDescriptionInit }) => {
      setIncomingCall(data);
    });

    socket.on('answer', (answer: RTCSessionDescriptionInit) => {
      if (peerConnection) {
        peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
        setVideoChatActive(true);
        setIsCallPending(false);
      }
    });

    socket.on('ice-candidate', (candidate: RTCIceCandidateInit) => {
      if (peerConnection) {
        peerConnection.addIceCandidate(new RTCIceCandidate(candidate)).catch((err) =>
          console.error('ICE candidate error:', err)
        );
      }
    });

    socket.on('call-ignored', (from: string) => {
      setDeclinedUsers((prev) => [...prev, from]);
      setCallStatus(`${declinedUsers.concat(from).join(' and ')} declined your video call`);
      setVideoChatActive(false);
      setIsCallPending(false);
      setPeerConnection(null);
    });

    socket.on('call-cancelled', () => {
      setIncomingCall(null);
      setCallStatus('Video call was cancelled by the initiator.');
    });

    setDoc(doc(db, 'raves', id), { creator: user.uid, createdAt: Date.now() }, { merge: true });

    const unsubscribe = onSnapshot(doc(db, 'raves', id), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.currentTrack) {
          setCurrentTrack(data.currentTrack);
        }
        if (data.messages) setMessages(data.messages);
      }
    });

    return () => {
      socket.off('user-joined');
      socket.off('track-changed');
      socket.off('play');
      socket.off('pause');
      socket.off('stop');
      socket.off('chat-message');
      socket.off('user-list');
      socket.off('offer');
      socket.off('answer');
      socket.off('ice-candidate');
      socket.off('call-ignored');
      socket.off('call-cancelled');
      unsubscribe();
      if (peerConnection) peerConnection.close();
    };
  }, [user, id, navigate, isHost, peerConnection, declinedUsers]);

  const startVideoChat = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.error('getUserMedia not supported in this browser/environment:', {
        navigatorMediaDevices: !!navigator.mediaDevices,
        getUserMedia: !!navigator.mediaDevices?.getUserMedia,
      });
      setCallStatus('Video chat is not supported in your browser.');
      return;
    }

    if (!user || !id) return;

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });
    setPeerConnection(pc);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.ontrack = (event) => {
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = event.streams[0];
      };

      pc.onicecandidate = (event) => {
        if (event.candidate && id) {
          socket.emit('ice-candidate', { roomId: `rave-${id}`, candidate: event.candidate });
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('offer', { roomId: `rave-${id}`, from: user.email || user.uid, offer });

      setVideoChatActive(true);
      setIsCallPending(true);
      setCallStatus(null);
      setDeclinedUsers([]);
    } catch (err: unknown) {
      const error = err as Error;
      console.error('Error starting video chat:', error);
      setCallStatus(`Failed to start video chat: ${error.message}`);
      setVideoChatActive(false);
      setIsCallPending(false);
    }
  };

  const cancelCall = () => {
    if (id && videoChatActive && isCallPending) {
      socket.emit('call-cancelled', { roomId: `rave-${id}` });
      setVideoChatActive(false);
      setIsCallPending(false);
      setPeerConnection(null);
      setCallStatus('Video call cancelled.');
    }
  };

  const acceptCall = async () => {
    if (!peerConnection || !incomingCall || !id || !user) {
      console.error('Cannot accept call: missing peerConnection, incomingCall, id, or user');
      return;
    }

    try {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(incomingCall.offer));
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      stream.getTracks().forEach((track) => peerConnection.addTrack(track, stream));

      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      socket.emit('answer', { roomId: `rave-${id}`, answer });

      setVideoChatActive(true);
      setIncomingCall(null);
      setCallStatus(null);
    } catch (err: unknown) {
      const error = err as Error;
      console.error('Error accepting call:', error);
      setCallStatus(`Failed to accept call: ${error.message}`);
      setVideoChatActive(false);
    }
  };

  const ignoreCall = () => {
    if (incomingCall && id) {
      socket.emit('call-ignored', { roomId: `rave-${id}`, from: incomingCall.from });
    }
    setIncomingCall(null);
  };

  const changeTrack = (track: Track) => {
    if (id) {
      const newTrack = { ...track, timestamp: 0, isPlaying: false };
      setCurrentTrack(newTrack);
      socket.emit('track-changed', { roomId: `rave-${id}`, ...newTrack });
      setDoc(doc(db, 'raves', id), { currentTrack: newTrack }, { merge: true });
    }
  };

  const sendMessage = (text: string) => {
    if (id && text.trim() && user) {
      const message: Message = {
        userId: socket.id || '',
        userName: user.email || user.uid,
        text,
        timestamp: Date.now(),
      };
      socket.emit('chat-message', { roomId: `rave-${id}`, message });
      setMessages((prev) => {
        if (!prev.some((m) => m.timestamp === message.timestamp && m.text === message.text)) {
          return [...prev, message];
        }
        return prev;
      });
      setDoc(doc(db, 'raves', id), { messages: [...messages, message] }, { merge: true });
    }
  };

  const copyRoomId = () => {
    if (id) {
      navigator.clipboard.writeText(`${window.location.origin}/rave/${id}`);
      alert('Rave Room ID copied to clipboard!');
    }
  };

  const searchSongs = async () => {
    if (!searchQuery.trim()) return;

    try {
      const jamendoResponse = await fetch(
        `https://api.jamendo.com/v3.0/tracks/?client_id=${process.env.REACT_APP_JAMENDO_CLIENT_ID}&format=json&limit=5&search=${encodeURIComponent(searchQuery)}`
      );
      const jamendoData = await jamendoResponse.json();
      const jamendoResults = jamendoData.results.map((track: any) => ({
        audioUrl: track.audio,
        title: track.name,
      }));

      setSearchResults(jamendoResults);
    } catch (err) {
      console.error('Search failed:', err);
    }
  };

  if (!user || !id) {
    return <div className="p-6 text-center">Please login to join a rave.</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mt-4 text-center">Rave: {id}</h1>
      <div className="mt-4 text-center">
        <button
          onClick={copyRoomId}
          className="bg-gray-500 text-white p-2 rounded hover:bg-gray-600 transition"
        >
          Copy Rave ID
        </button>
      </div>
      <div className="mt-4 text-center">
        <p>Online Users: {onlineUsers.length} {onlineUsers.map((u) => u.name).join(', ')}</p>
      </div>
      {callStatus && (
        <div className="mt-4 text-center text-red-500">{callStatus}</div>
      )}
      <div className="mt-8 flex flex-col items-center gap-4">
        {videoChatActive ? (
          isCallPending ? (
            <button
              onClick={cancelCall}
              className="bg-red-600 text-white p-3 rounded-full hover:bg-red-700 transition"
            >
              Cancel Call
            </button>
          ) : (
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
          )
        ) : (
          <button
            onClick={startVideoChat}
            className="bg-green-600 text-white p-3 rounded-full hover:bg-green-700 transition"
          >
            Start Video Chat
          </button>
        )}
        {incomingCall && !videoChatActive && (
          <div className="mt-4 bg-white bg-opacity-20 p-4 rounded-lg">
            <p className="text-center">Incoming video call from {incomingCall.from}</p>
            <div className="flex justify-center gap-4 mt-2">
              <button
                onClick={acceptCall}
                className="bg-green-600 text-white p-2 rounded hover:bg-green-700 transition"
              >
                Accept
              </button>
              <button
                onClick={ignoreCall}
                className="bg-red-600 text-white p-2 rounded hover:bg-red-700 transition"
              >
                Ignore
              </button>
            </div>
          </div>
        )}
        <Player
          audioUrl={currentTrack.audioUrl}
          roomId={`rave-${id}`}
          currentTrack={currentTrack}
        />
        <div className="mt-4 flex flex-col gap-2 max-w-md mx-auto">
          <div className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for an audio track..."
              className="flex-1 p-2 rounded text-black focus:outline-none focus:ring-2 focus:ring-purple-600"
            />
            <button
              onClick={searchSongs}
              className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700 transition"
            >
              Search
            </button>
          </div>
          {searchResults.map((result, index) => (
            <button
              key={index}
              onClick={() => changeTrack({ audioUrl: result.audioUrl, title: result.title })}
              className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600 transition"
            >
              {result.title}
            </button>
          ))}
          <button
            onClick={() => changeTrack({ audioUrl: 'https://prod-1.storage.jamendo.com/?trackid=143356&format=mp31', title: 'Sample Jamendo Track' })}
            className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700 transition"
          >
            Play Sample Jamendo Track
          </button>
        </div>
      </div>
      <Chat
        roomId={`rave-${id}`}
        userId={socket.id || ''}
        messages={messages}
        sendMessage={sendMessage}
      />
      <button
        onClick={() => navigate('/me')}
        className="mt-8 w-full max-w-md mx-auto bg-gray-600 text-white p-3 rounded-full hover:bg-gray-700 transition"
      >
        Leave Rave
      </button>
    </div>
  );
};

export default Rave;