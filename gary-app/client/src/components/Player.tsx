// src/components/Player.tsx
import { useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';

const getSocketUrl = () => {
  return process.env.NODE_ENV === 'production'
    ? 'https://gary-server.onrender.com' // Secure WebSocket via HTTPS
    : 'http://localhost:5000'; // Local development (HTTP for simplicity)
};

const socket = io(getSocketUrl(), { transports: ['websocket', 'polling'] });

interface Track {
  audioUrl?: string;
  title?: string;
  timestamp?: number;
  isPlaying?: boolean;
}

interface PlayerProps {
  audioUrl?: string;
  roomId?: string;
  currentTrack?: Track; // Made optional for Landing.tsx
}

const Player: React.FC<PlayerProps> = ({ audioUrl, roomId, currentTrack = {} }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(currentTrack.isPlaying || false);

  useEffect(() => {
    if (!roomId || !audioUrl) return;

    socket.on('play', (timestamp: number) => {
      if (audioRef.current) {
        audioRef.current.currentTime = timestamp;
        audioRef.current.play().catch((err) => console.error('Play error:', err));
        setIsPlaying(true);
      }
    });

    socket.on('pause', (timestamp: number) => {
      if (audioRef.current) {
        audioRef.current.currentTime = timestamp;
        audioRef.current.pause();
        setIsPlaying(false);
      }
    });

    socket.on('stop', () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        setIsPlaying(false);
      }
    });

    socket.on('track-changed', (track: Track) => {
      if (audioRef.current && track.audioUrl) {
        audioRef.current.src = track.audioUrl;
        audioRef.current.currentTime = track.timestamp || 0;
        if (track.isPlaying) {
          audioRef.current.play().catch((err) => console.error('Broadcast play error:', err));
          setIsPlaying(true);
        } else {
          audioRef.current.pause();
          setIsPlaying(false);
        }
      }
    });

    // Sync on join or prop change (only if roomId exists)
    if (audioRef.current && audioUrl && roomId) {
      audioRef.current.src = audioUrl;
      audioRef.current.currentTime = currentTrack.timestamp || 0;
      if (currentTrack.isPlaying) {
        audioRef.current.play().catch((err) => console.error('Join sync play error:', err));
        setIsPlaying(true);
      } else {
        audioRef.current.pause();
        setIsPlaying(false);
      }
    }

    return () => {
      socket.off('play');
      socket.off('pause');
      socket.off('stop');
      socket.off('track-changed');
    };
  }, [audioUrl, roomId, currentTrack]);

  const handlePlay = () => {
    if (roomId && audioRef.current) {
      const timestamp = audioRef.current.currentTime || 0;
      audioRef.current.play().catch((err) => console.error('Play error:', err));
      socket.emit('play', { roomId, timestamp });
      setIsPlaying(true);
    } else if (audioRef.current) {
      // For Landing.tsx (no roomId)
      audioRef.current.play().catch((err) => console.error('Preview play error:', err));
      setIsPlaying(true);
    }
  };

  const handlePause = () => {
    if (roomId && audioRef.current) {
      const timestamp = audioRef.current.currentTime || 0;
      audioRef.current.pause();
      socket.emit('pause', { roomId, timestamp });
      setIsPlaying(false);
    } else if (audioRef.current) {
      // For Landing.tsx
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleStop = () => {
    if (roomId && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      socket.emit('stop', { roomId });
      setIsPlaying(false);
    } else if (audioRef.current) {
      // For Landing.tsx
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  };

  return (
    <div className="bg-white bg-opacity-20 p-4 rounded-lg w-full max-w-md">
      {audioUrl ? (
        <>
          <audio
            ref={audioRef}
            controls={false}
            className="w-full mb-2"
          >
            <source src={audioUrl} type="audio/mpeg" />
            Your browser does not support the audio element.
          </audio>
          <div className="flex justify-center gap-4">
            <button
              onClick={handlePlay}
              className="bg-green-600 text-white p-2 rounded hover:bg-green-700 transition"
              disabled={isPlaying}
            >
              Play
            </button>
            <button
              onClick={handlePause}
              className="bg-yellow-600 text-white p-2 rounded hover:bg-yellow-700 transition"
              disabled={!isPlaying}
            >
              Pause
            </button>
            <button
              onClick={handleStop}
              className="bg-red-600 text-white p-2 rounded hover:bg-red-700 transition"
            >
              Stop
            </button>
          </div>
        </>
      ) : (
        <p className="text-center text-white">No track selected</p>
      )}
    </div>
  );
};

export default Player;