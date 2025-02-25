// src/components/Sidebar.tsx
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';

const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const user = auth.currentUser;

  const createRoom = () => {
    if (user) {
      const roomId = Math.random().toString(36).substring(7);
      navigate(`/room/${roomId}`);
    } else {
      navigate('/'); // Redirect to landing for login
    }
  };

  return (
    <div className="w-64 bg-gray-800 text-white h-screen p-4 fixed top-0 left-0">
      <div className="flex items-center mb-6">
        <img src="/gary_logo.png" alt="Gary Logo" className="h-10" />
        <span className="ml-2 text-xl font-bold">Gary</span>
      </div>
      <nav>
        <ul>
          <li className="mb-4">
            <button
              onClick={() => navigate('/')}
              className="w-full text-left hover:bg-gray-700 p-2 rounded"
            >
              Home
            </button>
          </li>
          <li className="mb-4">
            <button
              onClick={createRoom}
              className="w-full text-left hover:bg-gray-700 p-2 rounded"
            >
              Create Room
            </button>
          </li>
          {user ? (
            <li>
              <button
                onClick={() => auth.signOut()}
                className="w-full text-left hover:bg-gray-700 p-2 rounded"
              >
                Logout
              </button>
            </li>
          ) : (
            <li>
              <button
                onClick={() => navigate('/')} // Trigger auth via Landing
                className="w-full text-left hover:bg-gray-700 p-2 rounded"
              >
                Login / Sign Up
              </button>
            </li>
          )}
        </ul>
      </nav>
    </div>
  );
};

export default Sidebar;