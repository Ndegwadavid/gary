// src/App.tsx
import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { auth } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import Sidebar from './components/Sidebar';
import Landing from './pages/Landing';
import Room from './pages/Room';
import Me from './pages/Me';
import Rooms from './pages/Rooms';
import Rave from './pages/Rave';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return <div className="p-6 text-center text-white">Loading...</div>;
  }

  return (
    <Router>
      <div className="flex min-h-screen">
        <Sidebar user={user} />
        <div className="flex-1 ml-64">
          <Routes>
            <Route path="/" element={<Landing user={user} />} />
            <Route path="/me" element={<Me user={user} />} />
            <Route path="/rooms" element={<Rooms user={user} />} />
            <Route path="/room/:id" element={<Room user={user} />} />
            <Route path="/rave/:id" element={<Rave user={user} />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
};

export default App;