// src/components/Player.tsx
import { useEffect, useState, useRef } from 'react';
import YouTube, { YouTubeProps, YouTubePlayer } from 'react-youtube';
import io from 'socket.io-client';

const socket = io('http://localhost:5000');

interface PlayerProps {
  videoId?: string; // For YouTube
  audioUrl?: string; // For Jamendo
  roomId?: string;
  isHost?: boolean;
}

const Player: React.FC<PlayerProps> = ({ videoId, audioUrl, roomId, isHost = false }) => {
  const [player, setPlayer] = useState<YouTubePlayer | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const opts: YouTubeProps['opts'] = {
    height: '200',
    width: '300',
    playerVars: { autoplay: 0 },
  };

  useEffect(() => {
    if (!roomId) return;

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
      if (player) socket.emit('play', { roomId, timestamp: player.getCurrentTime() });
      if (audioRef.current) {
        audioRef.current.play();
        socket.emit('play', { roomId, timestamp: audioRef.current.currentTime });
      }
    }
  };

  const onPause = () => {
    if (isHost && roomId) {
      if (player) socket.emit('pause', { roomId, timestamp: player.getCurrentTime() });
      if (audioRef.current) {
        audioRef.current.pause();
        socket.emit('pause', { roomId, timestamp: audioRef.current.currentTime });
      }
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