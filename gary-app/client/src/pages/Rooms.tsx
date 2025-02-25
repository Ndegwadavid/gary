// src/pages/Rooms.tsx
import { useNavigate } from 'react-router-dom';
import { User } from 'firebase/auth';

interface RoomsProps {
  user: User | null;
}

const Rooms: React.FC<RoomsProps> = ({ user }) => {
  const navigate = useNavigate();

  if (!user) {
    navigate('/');
    return null;
  }

  return (
    <div className="p-6">
      <h1 className="text-4xl font-bold mt-8 text-center">Available Rooms</h1>
      <p className="mt-4 text-center">No rooms available yet. Create one from your profile!</p>
      <button
        onClick={() => navigate('/me')}
        className="mt-8 w-full max-w-md mx-auto bg-purple-600 text-white p-3 rounded-full hover:bg-purple-700 transition"
      >
        Back to Profile
      </button>
    </div>
  );
};

export default Rooms;