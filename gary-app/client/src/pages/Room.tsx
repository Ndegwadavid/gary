import { useEffect, useState } from 'react';
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
  text: string;
  timestamp: number;
}

const Room: React.FC<RoomProps> = ({ user }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isHost, setIsHost] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<{ videoId?: string; audioUrl?: string }>({
    videoId: 'dQw4w9WgXcQ',
  });
  const [messages, setMessages] = useState<Message[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);

  useEffect(() => {
    if (!user || !id) {
      navigate('/');
      return;
    }

    socket.emit('join-room', id);
    socket.on('user-joined', (userId: string) => {
      if (!isHost) setIsHost(userId === socket.id);
      setOnlineUsers((prev) => [...new Set([...prev, userId])]);
    });
    socket.on('track-changed', (track: { videoId?: string; audioUrl?: string }) => {
      setCurrentTrack(track);
      setDoc(doc(db, 'rooms', id), { currentTrack: track }, { merge: true });
    });
    socket.on('chat-message', (message: Message) => {
      setMessages((prev) => [...prev, message]);
      setDoc(doc(db, 'rooms', id), { messages: [...messages, message] }, { merge: true });
    });
    socket.on('user-list', (users: { [key: string]: { roomId?: string } }) => {
      const roomUsers = Object.entries(users)
        .filter(([_, data]) => data.roomId === id)
        .map(([userId]) => userId);
      setOnlineUsers(roomUsers);
    });

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
      unsubscribe();
    };
  }, [user, id, navigate, isHost, messages]);

  const changeTrack = (track: { videoId?: string; audioUrl?: string }) => {
    if (isHost && id) {
      setCurrentTrack(track);
      socket.emit('track-changed', { roomId: id, ...track });
      setDoc(doc(db, 'rooms', id), { currentTrack: track }, { merge: true });
    }
  };

  const sendMessage = (text: string) => {
    if (id && text.trim()) {
      const message: Message = { userId: socket.id ?? '', text, timestamp: Date.now() }; // Fallback to empty string
      socket.emit('chat-message', { roomId: id, message });
      setMessages((prev) => [...prev, message]);
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
        <p>Online Users: {onlineUsers.length} {onlineUsers.map((u) => u.slice(0, 6)).join(', ')}</p>
      </div>
      <div className="mt-8 flex justify-center">
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
      <Chat roomId={id} userId={socket.id ?? ''} messages={messages} sendMessage={sendMessage} />
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