// src/components/Player.tsx
import { useEffect, useState, useRef } from 'react';
import YouTube, { YouTubeProps, YouTubePlayer } from 'react-youtube';
import io from 'socket.io-client';

const getSocketUrl = () => {
  const host = window.location.hostname === 'localhost' ? 'localhost' : window.location.hostname;
  return `http://${host}:5000`; // Update to deployed URL in production
};

const socket = io(getSocketUrl(), { transports: ['websocket', 'polling'] });

interface PlayerProps {
  videoId?: string;
  audioUrl?: string;
  roomId?: string;
  isHost?: boolean;
}

const Player: React.FC<PlayerProps> = ({ videoId, audioUrl, roomId, isHost = false }) => {
  const [player, setPlayer] = useState<YouTubePlayer | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const opts: YouTubeProps['opts'] = {
    height: '200',
    width: '300',
    playerVars: { autoplay: 0 },
  };

  useEffect(() => {
    if (!roomId) return;

    socket.on('play', (timestamp: number) => {
      if (!isHost) {
        if (player) {
          player.seekTo(timestamp, true).playVideo();
          setIsPlaying(true);
        }
        if (audioRef.current) {
          audioRef.current.currentTime = timestamp;
          audioRef.current.play();
          setIsPlaying(true);
        }
      }
    });

    socket.on('pause', (timestamp: number) => {
      if (!isHost) {
        if (player) {
          player.seekTo(timestamp, true).pauseVideo();
          setIsPlaying(false);
        }
        if (audioRef.current) {
          audioRef.current.currentTime = timestamp;
          audioRef.current.pause();
          setIsPlaying(false);
        }
      }
    });

    socket.on('stop', () => {
      if (!isHost) {
        if (player) {
          player.stopVideo();
          setIsPlaying(false);
        }
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
          setIsPlaying(false);
        }
      }
    });

    return () => {
      socket.off('play');
      socket.off('pause');
      socket.off('stop');
    };
  }, [player, audioRef, isHost, roomId]);

  const onReady = (event: { target: YouTubePlayer }) => {
    setPlayer(event.target);
  };

  const handlePlay = () => {
    if (isHost && roomId) {
      const timestamp = player ? player.getCurrentTime() : audioRef.current?.currentTime || 0;
      if (player) player.playVideo();
      if (audioRef.current) audioRef.current.play();
      socket.emit('play', { roomId, timestamp });
      setIsPlaying(true);
    }
  };

  const handlePause = () => {
    if (isHost && roomId) {
      const timestamp = player ? player.getCurrentTime() : audioRef.current?.currentTime || 0;
      if (player) player.pauseVideo();
      if (audioRef.current) audioRef.current.pause();
      socket.emit('pause', { roomId, timestamp });
      setIsPlaying(false);
    }
  };

  const handleStop = () => {
    if (isHost && roomId) {
      if (player) player.stopVideo();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      socket.emit('stop', { roomId });
      setIsPlaying(false);
    }
  };

  return (
    <div className="bg-white bg-opacity-20 p-4 rounded-lg w-full max-w-md">
      {videoId && (
        <>
          <YouTube
            videoId={videoId}
            opts={opts}
            onReady={onReady}
            className="mb-2"
          />
          {isHost ? (
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
          ) : (
            <p className="text-center text-white">Now Playing: {videoId} (Host Controlled)</p>
          )}
        </>
      )}
      {audioUrl && (
        <>
          <audio
            ref={audioRef}
            controls={false}
            className="w-full mb-2"
          >
            <source src={audioUrl} type="audio/mpeg" />
            Your browser does not support the audio element.
          </audio>
          {isHost ? (
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
          ) : (
            <p className="text-center text-white">Now Playing: Audio Track (Host Controlled)</p>
          )}
        </>
      )}
      {!videoId && !audioUrl && (
        <p className="text-center text-white">No track selected</p>
      )}
    </div>
  );
};

export default Player;