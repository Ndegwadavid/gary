// src/pages/Landing.tsx
import { useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import Player from '../components/Player';
import AuthComponent from '../components/Auth';

interface Track {
  id: string;
  title: string;
  audioUrl?: string;
}

interface LandingProps {
  user: User | null;
}

const Landing: React.FC<LandingProps> = ({ user }) => {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [showAuth, setShowAuth] = useState(false);

  useEffect(() => {
    fetch(
      `https://api.jamendo.com/v3.0/tracks/?client_id=${process.env.REACT_APP_JAMENDO_CLIENT_ID}&format=json&limit=5&order=downloads_total`
    )
      .then((res) => res.json())
      .then((jamendoData) => {
        const jamendoTracks = jamendoData.results.map((track: any) => ({
          id: track.id,
          title: track.name,
          audioUrl: track.audio,
        }));
        setTracks(jamendoTracks);
      })
      .catch((err) => console.error('Jamendo fetch failed:', err));
  }, []);

  const handleLoginClick = () => {
    setShowAuth(true);
  };

  return (
    <div className="p-6">
      <h1 className="text-4xl font-bold mt-8 text-center">
        Share the Beat, Feel the Moment
      </h1>
      <p className="text-center mt-2 text-lg">
        Listen to music below or login to create and join rooms!
      </p>
      <div className="mt-8 grid gap-4">
        {tracks.map((track) => (
          <div
            key={track.id}
            className="bg-white bg-opacity-20 p-4 rounded-lg flex items-center hover:bg-opacity-30 transition"
          >
            <Player audioUrl={track.audioUrl} /> {/* No roomId or currentTrack needed */}
            <span className="ml-4">{track.title}</span>
          </div>
        ))}
      </div>
      {!user && (
        <button
          onClick={handleLoginClick}
          className="mt-8 w-full max-w-md mx-auto bg-purple-600 text-white p-3 rounded-full hover:bg-purple-700 transition"
        >
          Login / Sign Up
        </button>
      )}
      {showAuth && <AuthComponent onClose={() => setShowAuth(false)} />}
    </div>
  );
};

export default Landing;