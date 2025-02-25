// src/components/Player.tsx
import { useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';

const getSocketUrl = () => {
  const host = window.location.hostname === 'localhost' ? 'localhost' : window.location.hostname;
  return `http://${host}:5000`; // Update to deployed URL in production
};

const socket = io(getSocketUrl(), { transports: ['websocket', 'polling'] });

interface PlayerProps {
  audioUrl?: string;
  roomId?: string;
}

const audioCache = new Map<string, string>(); // Simple in-memory cache

const Player: React.FC<PlayerProps> = ({ audioUrl, roomId }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

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

    return () => {
      socket.off('play');
      socket.off('pause');
      socket.off('stop');
    };
  }, [audioUrl, roomId]);

  const handlePlay = () => {
    if (roomId && audioRef.current) {
      const timestamp = audioRef.current.currentTime || 0;
      audioRef.current.play().catch((err) => console.error('Play error:', err));
      socket.emit('play', { roomId, timestamp });
      setIsPlaying(true);
    }
  };

  const handlePause = () => {
    if (roomId && audioRef.current) {
      const timestamp = audioRef.current.currentTime || 0;
      audioRef.current.pause();
      socket.emit('pause', { roomId, timestamp });
      setIsPlaying(false);
    }
  };

  const handleStop = () => {
    if (roomId && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      socket.emit('stop', { roomId });
      setIsPlaying(false);
    }
  };

  useEffect(() => {
    if (audioUrl && !audioCache.has(audioUrl)) {
      audioCache.set(audioUrl, audioUrl); // Cache the URL (in real scenarios, preload or store blob)
    }
  }, [audioUrl]);

  return (
    <div className="bg-white bg-opacity-20 p-4 rounded-lg w-full max-w-md">
      {audioUrl ? (
        <>
          <audio
            ref={audioRef}
            controls={false}
            className="w-full mb-2"
          >
            <source src={audioCache.get(audioUrl) || audioUrl} type="audio/mpeg" />
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