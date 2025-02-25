import { useEffect, useState } from 'react';
import YouTube, { YouTubeProps, YouTubePlayer } from 'react-youtube';
import io from 'socket.io-client';

const socket = io('http://localhost:5000');

interface PlayerProps {
  videoId: string;
  roomId?: string;
  isHost?: boolean;
}

const Player: React.FC<PlayerProps> = ({ videoId, roomId, isHost = false }) => {
  const [player, setPlayer] = useState<YouTubePlayer | null>(null);

  const opts: YouTubeProps['opts'] = {
    height: '200',
    width: '300',
    playerVars: { autoplay: 0 },
  };

  useEffect(() => {
    if (!roomId) return;

    socket.on('play', (timestamp: number) => {
      if (!isHost && player) player.seekTo(timestamp, true).playVideo();
    });

    socket.on('pause', (timestamp: number) => {
      if (!isHost && player) player.seekTo(timestamp, true).pauseVideo();
    });

    return () => {
      socket.off('play');
      socket.off('pause');
    };
  }, [player, isHost, roomId]);

  const onReady = (event: { target: YouTubePlayer }) => {
    setPlayer(event.target);
  };

  const onPlay = () => {
    if (isHost && player && roomId) {
      socket.emit('play', { roomId, timestamp: player.getCurrentTime() });
    }
  };

  const onPause = () => {
    if (isHost && player && roomId) {
      socket.emit('pause', { roomId, timestamp: player.getCurrentTime() });
    }
  };

  return (
    <YouTube
      videoId={videoId}
      opts={opts}
      onReady={onReady}
      onPlay={onPlay}
      onPause={onPause}
    />
  );
};

export default Player;