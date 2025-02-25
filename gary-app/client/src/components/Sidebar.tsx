// src/components/Sidebar.tsx
import { useNavigate } from 'react-router-dom';
import { User } from 'firebase/auth';
import { auth } from '../firebase';

interface SidebarProps {
  user: User | null;
}

const Sidebar: React.FC<SidebarProps> = ({ user }) => {
  const navigate = useNavigate();

  const createRoom = () => {
    if (user) {
      const roomId = Math.random().toString(36).substring(7);
      navigate(`/room/${roomId}`);
    } else {
      navigate('/');
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
          {user && (
            <>
              <li className="mb-4">
                <button
                  onClick={() => navigate('/me')}
                  className="w-full text-left hover:bg-gray-700 p-2 rounded"
                >
                  My Profile
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
              <li className="mb-4">
                <button
                  onClick={() => navigate('/rooms')}
                  className="w-full text-left hover:bg-gray-700 p-2 rounded"
                >
                  View Rooms
                </button>
              </li>
            </>
          )}
          <li>
            {user ? (
              <button
                onClick={() => auth.signOut()}
                className="w-full text-left hover:bg-gray-700 p-2 rounded"
              >
                Logout
              </button>
            ) : (
              <button
                onClick={() => navigate('/')}
                className="w-full text-left hover:bg-gray-700 p-2 rounded"
              >
                Login / Sign Up
              </button>
            )}
          </li>
        </ul>
      </nav>
    </div>
  );
};

export default Sidebar;