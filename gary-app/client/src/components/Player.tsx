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
  roomId?: string; // Made optional
  isHost?: boolean; // Made optional
}

const Player: React.FC<PlayerProps> = ({ videoId, audioUrl, roomId, isHost = false }) => {
  const [player, setPlayer] = useState<YouTubePlayer | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const opts: YouTubeProps['opts'] = {
    height: '200',
    width: '300',
    playerVars: { autoplay: 0 },
  };

  useEffect(() => {
    if (!roomId) return; // Skip sync logic if not in a room

    socket.on('play', (timestamp: number) => {
      if (!isHost) {
        if (player) player.seekTo(timestamp, true).playVideo();
        if (audioRef.current) {
          audioRef.current.currentTime = timestamp;
          audioRef.current.play();
        }
      }
    });

    socket.on('pause', (timestamp: number) => {
      if (!isHost) {
        if (player) player.seekTo(timestamp, true).pauseVideo();
        if (audioRef.current) {
          audioRef.current.currentTime = timestamp;
          audioRef.current.pause();
        }
      }
    });

    return () => {
      socket.off('play');
      socket.off('pause');
    };
  }, [player, audioRef, isHost, roomId]);

  const onReady = (event: { target: YouTubePlayer }) => {
    setPlayer(event.target);
  };

  const onPlay = () => {
    if (isHost && roomId) {
      const timestamp = player ? player.getCurrentTime() : audioRef.current?.currentTime || 0;
      socket.emit('play', { roomId, timestamp });
    }
  };

  const onPause = () => {
    if (isHost && roomId) {
      const timestamp = player ? player.getCurrentTime() : audioRef.current?.currentTime || 0;
      socket.emit('pause', { roomId, timestamp });
    }
  };

  return (
    <div>
      {videoId && (
        <YouTube
          videoId={videoId}
          opts={opts}
          onReady={onReady}
          onPlay={onPlay}
          onPause={onPause}
        />
      )}
      {audioUrl && (
        <audio
          ref={audioRef}
          controls
          onPlay={onPlay}
          onPause={onPause}
          className="w-full max-w-[300px]"
        >
          <source src={audioUrl} type="audio/mpeg" />
          Your browser does not support the audio element.
        </audio>
      )}
    </div>
  );
};

export default Player;