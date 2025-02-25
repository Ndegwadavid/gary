// src/pages/Me.tsx
import { useNavigate } from 'react-router-dom';
import { User } from 'firebase/auth';
import { auth } from '../firebase'; // Use named import from firebase.ts

interface MeProps {
  user: User | null;
}

const Me: React.FC<MeProps> = ({ user }) => {
  const navigate = useNavigate();

  if (!user) {
    navigate('/');
    return null;
  }

  const createRoom = () => {
    const roomId = Math.random().toString(36).substring(7);
    navigate(`/room/${roomId}`);
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