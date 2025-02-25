// src/pages/Me.tsx
import { useNavigate } from 'react-router-dom';
import { User } from 'firebase/auth';
import { auth, db } from '../firebase';
import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

interface MeProps {
  user: User | null;
}

const Me: React.FC<MeProps> = ({ user }) => {
  const navigate = useNavigate();
  const [roomIdInput, setRoomIdInput] = useState('');
  const [raveIdInput, setRaveIdInput] = useState('');
  const [myRaves, setMyRaves] = useState<string[]>([]);

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, 'raves'), where('creator', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const raves = snapshot.docs.map((doc) => doc.id);
      setMyRaves(raves);
    });

    return () => unsubscribe();
  }, [user]);

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

  const createOrJoinRave = () => {
    if (raveIdInput.trim() && /^[a-zA-Z0-9]+$/.test(raveIdInput.trim())) {
      navigate(`/rave/${raveIdInput.trim()}`);
    } else {
      alert('Rave ID must contain only letters and numbers.');
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
        <div className="flex flex-col gap-2">
          <input
            type="text"
            value={raveIdInput}
            onChange={(e) => setRaveIdInput(e.target.value)}
            placeholder="Enter Rave ID (letters/numbers only)"
            className="p-2 border rounded text-black focus:outline-none focus:ring-2 focus:ring-purple-600"
          />
          <button
            onClick={createOrJoinRave}
            className="bg-orange-600 text-white p-3 rounded-full hover:bg-orange-700 transition"
          >
            Create/Join Rave
          </button>
        </div>
        <div className="mt-4">
          <h2 className="text-2xl font-semibold text-center">My Raves</h2>
          {myRaves.length > 0 ? (
            <ul className="mt-2 flex flex-col gap-2">
              {myRaves.map((raveId) => (
                <li key={raveId} className="text-center">
                  <button
                    onClick={() => navigate(`/rave/${raveId}`)}
                    className="bg-yellow-600 text-white p-2 rounded hover:bg-yellow-700 transition"
                  >
                    {raveId}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-center">No raves created yet.</p>
          )}
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