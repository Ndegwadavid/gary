// src/pages/Me.tsx
import { useNavigate } from 'react-router-dom';
import { User } from 'firebase/auth';
import { auth } from '../firebase';
import { useState } from 'react';

interface MeProps {
  user: User | null;
}

const Me: React.FC<MeProps> = ({ user }) => {
  const navigate = useNavigate();
  const [roomIdInput, setRoomIdInput] = useState('');

  if (!user) {
    navigate('/');
    return null;
  }

  const createRoom = () => {
    const roomId = Math.random().toString(36).substring(7);
    navigate(`/room/${roomId}`);
  };

  const joinRoom = () => {
    if (roomIdInput.trim()) {
      navigate(`/room/${roomIdInput.trim()}`);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-4xl font-bold mt-8 text-center">
        Welcome, {user.email || 'User'}!
      </h1>
      <div className="mt-8 flex flex-col gap-4 max-w-md mx-auto">
        <button
          onClick={createRoom}
          className="bg-purple-600 text-white p-3 rounded-full hover:bg-purple-700 transition"
        >
          Create a Room
        </button>
        <div className="flex flex-col gap-2">
          <input
            type="text"
            value={roomIdInput}
            onChange={(e) => setRoomIdInput(e.target.value)}
            placeholder="Paste Room ID"
            className="p-2 border rounded text-black focus:outline-none focus:ring-2 focus:ring-purple-600"
          />
          <button
            onClick={joinRoom}
            className="bg-green-600 text-white p-3 rounded-full hover:bg-green-700 transition"
          >
            Join Room
          </button>
        </div>
        <button
          onClick={() => navigate('/rooms')}
          className="bg-blue-600 text-white p-3 rounded-full hover:bg-blue-700 transition"
        >
          View Rooms
        </button>
        <button
          onClick={() => auth.signOut()}
          className="bg-gray-600 text-white p-3 rounded-full hover:bg-gray-700 transition"
        >
          Logout
        </button>
      </div>
    </div>
  );
};

export default Me;