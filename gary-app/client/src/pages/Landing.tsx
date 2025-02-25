import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import Player from '../components/Player';
import AuthComponent from '../components/Auth';

interface Track {
  id: string;
  title: string;
}

const Landing: React.FC = () => {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [showAuth, setShowAuth] = useState(false);
  const navigate = useNavigate();
  const user = auth.currentUser;

  useEffect(() => {
    fetch(
      `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=5&playlistId=PL9tY0BWXOZFt1L3Xv4cOYJGLP2QfNx8nG&key=${process.env.REACT_APP_YOUTUBE_API_KEY}`
    )
      .then((res) => res.json())
      .then((data) =>
        setTracks(
          data.items.map((item: any) => ({
            id: item.snippet.resourceId.videoId,
            title: item.snippet.title,
          }))
        )
      );
  }, []);

  const createRoom = () => {
    if (!user) {
      setShowAuth(true);
    } else {
      const roomId = Math.random().toString(36).substring(7);
      navigate(`/room/${roomId}`);
    }
  };

  return (
    <div className="p-6">
      <header className="flex justify-between items-center">
        <img src="/gary_logo.png" alt="Gary Logo" className="h-12" />
        {user ? (
          <button
            onClick={() => auth.signOut()}
            className="bg-white text-purple-600 px-4 py-2 rounded-full hover:bg-purple-100"
          >
            Logout
          </button>
        ) : (
          <button
            onClick={() => setShowAuth(true)}
            className="bg-white text-purple-600 px-4 py-2 rounded-full hover:bg-purple-100"
          >
            Login
          </button>
        )}
      </header>
      <h1 className="text-4xl font-bold mt-8 text-center">
        Share the Beat, Feel the Moment
      </h1>
      <div className="mt-8 grid gap-4">
        {tracks.map((track) => (
          <div
            key={track.id}
            className="bg-white bg-opacity-20 p-4 rounded-lg flex items-center hover:bg-opacity-30 transition"
          >
            <Player videoId={track.id} />
            <span className="ml-4">{track.title}</span>
          </div>
        ))}
      </div>
      <button
        onClick={createRoom}
        className="mt-8 w-full bg-purple-600 text-white p-3 rounded-full hover:bg-purple-700"
      >
        Create a Room
      </button>
      {showAuth && <AuthComponent onClose={() => setShowAuth(false)} />}
    </div>
  );
};

export default Landing;