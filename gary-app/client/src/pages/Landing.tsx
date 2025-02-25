// src/pages/Landing.tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import Player from '../components/Player';
import AuthComponent from '../components/Auth';

interface Track {
  id: string;
  title: string;
  videoId?: string; // YouTube
  audioUrl?: string; // Jamendo
}

const Landing: React.FC = () => {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [showAuth, setShowAuth] = useState(false);
  const navigate = useNavigate();
  const user = auth.currentUser;

  useEffect(() => {
    // Fetch YouTube tracks
    fetch(
      `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=5&playlistId=PL9tY0BWXOZFt1L3Xv4cOYJGLP2QfNx8nG&key=${process.env.REACT_APP_YOUTUBE_API_KEY}`
    )
      .then((res) => res.json())
      .then((youtubeData) => {
        const youtubeTracks = youtubeData.items.map((item: any) => ({
          id: item.snippet.resourceId.videoId,
          title: item.snippet.title,
          videoId: item.snippet.resourceId.videoId,
        }));

        // Fetch Jamendo tracks
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

            setTracks([...youtubeTracks, ...jamendoTracks]);
          });
      });
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
      <h1 className="text-4xl font-bold mt-8 text-center">
        Share the Beat, Feel the Moment
      </h1>
      <div className="mt-8 grid gap-4">
        {tracks.map((track) => (
          <div
            key={track.id}
            className="bg-white bg-opacity-20 p-4 rounded-lg flex items-center hover:bg-opacity-30 transition"
          >
            <Player videoId={track.videoId} audioUrl={track.audioUrl} />
            <span className="ml-4">{track.title}</span>
          </div>
        ))}
      </div>
      <button
        onClick={createRoom}
        className="mt-8 w-full bg-purple-600 text-white p-3 rounded-full hover:bg-purple-700 transition"
      >
        {user ? 'Create a Room' : 'Login to Create a Room'}
      </button>
      {showAuth && <AuthComponent onClose={() => setShowAuth(false)} />}
    </div>
  );
};

export default Landing;