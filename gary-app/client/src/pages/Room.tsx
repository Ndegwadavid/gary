import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { auth } from '../firebase';
import Player from '../components/Player';
import io from 'socket.io-client';

const socket = io('http://localhost:5000');

const Room: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const user = auth.currentUser;
  const isHost = true; // Simplified for demo

  useEffect(() => {
    if (user && id) {
      socket.emit('join-room', id);
    }
  }, [user, id]);

  if (!user) {
    return <div className="p-6 text-center">Please login to join a room.</div>;
  }

  return (
    <div className="p-6">
      <header className="flex justify-between items-center">
        <img src="/gary_logo.png" alt="Gary Logo" className="h-12" />
        <button
          onClick={() => auth.signOut()}
          className="bg-white text-purple-600 px-4 py-2 rounded-full hover:bg-purple-100"
        >
          Logout
        </button>
      </header>
      <h1 className="text-2xl font-bold mt-4">Room: {id}</h1>
      <Player videoId="dQw4w9WgXcQ" roomId={id} isHost={isHost} />
    </div>
  );
};

export default Room;