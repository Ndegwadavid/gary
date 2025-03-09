"use client"

import type React from "react"
import { useEffect, useState, useRef } from "react"
import { Play, Pause, SkipBack, Volume2, Music, Disc } from "lucide-react"
import io from "socket.io-client"
import { Card, CardContent } from "../components/ui/card"
import { Button } from "../components/ui/button"
import YouTube from "react-youtube"

const getSocketUrl = () => {
  return process.env.NODE_ENV === "production"
    ? "https://gary-server.onrender.com"
    : "http://localhost:5000"
}

const socket = io(getSocketUrl(), { transports: ["websocket", "polling"] })

interface Track {
  audioUrl?: string
  title?: string
  timestamp?: number
  isPlaying?: boolean
  source?: "youtube" | "jamendo"
}

interface PlayerProps {
  audioUrl?: string
  roomId?: string
  currentTrack?: Track
}

const Player: React.FC<PlayerProps> = ({ audioUrl, roomId, currentTrack = {} }) => {
  const audioRef = useRef<HTMLAudioElement>(null)
  const youtubeRef = useRef<any>(null)
  const progressRef = useRef<HTMLDivElement>(null)
  const [isPlaying, setIsPlaying] = useState(currentTrack.isPlaying || false)
  const [currentTime, setCurrentTime] = useState(currentTrack.timestamp || 0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(0.7)
  const [isCompact, setIsCompact] = useState(false)

  useEffect(() => {
    const checkSize = () => {
      if (progressRef.current) {
        setIsCompact(progressRef.current.offsetWidth < 300)
      }
    }
    checkSize()
    window.addEventListener("resize", checkSize)
    return () => window.removeEventListener("resize", checkSize)
  }, []);

  useEffect(() => {
    if (!roomId || !audioUrl) return;

    // Initialize playback state on mount
    if (currentTrack.audioUrl && currentTrack.source === "youtube" && youtubeRef.current) {
      youtubeRef.current.loadVideoById(currentTrack.audioUrl.split("/").pop()?.split("?")[0]);
      youtubeRef.current.seekTo(currentTrack.timestamp || 0);
      if (currentTrack.isPlaying) {
        youtubeRef.current.playVideo();
      } else {
        youtubeRef.current.pauseVideo();
      }
    } else if (currentTrack.audioUrl && audioRef.current) {
      audioRef.current.src = currentTrack.audioUrl;
      audioRef.current.currentTime = currentTrack.timestamp || 0;
      if (currentTrack.isPlaying) {
        audioRef.current.play().catch(err => console.error("Initial play error:", err));
      } else {
        audioRef.current.pause();
      }
    }

    socket.on("play", (timestamp: number) => {
      if (currentTrack.source === "youtube" && youtubeRef.current) {
        youtubeRef.current.seekTo(timestamp);
        youtubeRef.current.playVideo();
        setIsPlaying(true);
      } else if (audioRef.current) {
        audioRef.current.currentTime = timestamp;
        audioRef.current.play().catch(err => console.error("Play error:", err));
        setIsPlaying(true);
      }
      setCurrentTime(timestamp);
    });

    socket.on("pause", (timestamp: number) => {
      if (currentTrack.source === "youtube" && youtubeRef.current) {
        youtubeRef.current.seekTo(timestamp);
        youtubeRef.current.pauseVideo();
        setIsPlaying(false);
      } else if (audioRef.current) {
        audioRef.current.currentTime = timestamp;
        audioRef.current.pause();
        setIsPlaying(false);
      }
      setCurrentTime(timestamp);
    });

    socket.on("stop", () => {
      if (currentTrack.source === "youtube" && youtubeRef.current) {
        youtubeRef.current.seekTo(0);
        youtubeRef.current.pauseVideo();
        setIsPlaying(false);
        setCurrentTime(0);
      } else if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        setIsPlaying(false);
        setCurrentTime(0);
      }
    });

    socket.on("track-changed", (track: Track) => {
      setCurrentTime(track.timestamp || 0);
      setIsPlaying(track.isPlaying || false);
      if (track.source === "youtube" && youtubeRef.current && track.audioUrl) {
        youtubeRef.current.loadVideoById(track.audioUrl.split("/").pop()?.split("?")[0]);
        youtubeRef.current.seekTo(track.timestamp || 0);
        if (track.isPlaying) youtubeRef.current.playVideo();
      } else if (audioRef.current && track.audioUrl) {
        audioRef.current.src = track.audioUrl;
        audioRef.current.currentTime = track.timestamp || 0;
        if (track.isPlaying) {
          audioRef.current.play().catch(err => console.error("Broadcast play error:", err));
        } else {
          audioRef.current.pause();
        }
      }
    });

    return () => {
      socket.off("play");
      socket.off("pause");
      socket.off("stop");
      socket.off("track-changed");
    };
  }, [audioUrl, roomId, currentTrack]);

  useEffect(() => {
    if (currentTrack.source === "youtube" && youtubeRef.current) {
      const interval = setInterval(() => {
        setCurrentTime(youtubeRef.current.getCurrentTime());
        setDuration(youtubeRef.current.getDuration());
      }, 1000);
      return () => clearInterval(interval);
    } else if (audioRef.current) {
      const audio = audioRef.current;
      const updateTime = () => setCurrentTime(audio.currentTime);
      const updateDuration = () => setDuration(audio.duration);
      audio.addEventListener("timeupdate", updateTime);
      audio.addEventListener("durationchange", updateDuration);
      audio.addEventListener("ended", handleStop);
      return () => {
        audio.removeEventListener("timeupdate", updateTime);
        audio.removeEventListener("durationchange", updateDuration);
        audio.removeEventListener("ended", handleStop);
      };
    }
  }, [currentTrack.source]);

  useEffect(() => {
    if (currentTrack.source === "youtube" && youtubeRef.current) {
      youtubeRef.current.setVolume(volume * 100);
    } else if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume, currentTrack.source]);

  const handlePlay = () => {
    if (roomId) {
      const timestamp = currentTrack.source === "youtube" ? youtubeRef.current?.getCurrentTime() || 0 : audioRef.current?.currentTime || 0;
      if (currentTrack.source === "youtube" && youtubeRef.current) {
        youtubeRef.current.playVideo();
        socket.emit("play", { roomId, timestamp });
      } else if (audioRef.current) {
        audioRef.current.play().catch(err => console.error("Play error:", err));
        socket.emit("play", { roomId, timestamp });
      }
      setIsPlaying(true);
    } else if (currentTrack.source === "youtube" && youtubeRef.current) {
      youtubeRef.current.playVideo();
      setIsPlaying(true);
    } else if (audioRef.current) {
      audioRef.current.play().catch(err => console.error("Preview play error:", err));
      setIsPlaying(true);
    }
  };

  const handlePause = () => {
    if (roomId) {
      const timestamp = currentTrack.source === "youtube" ? youtubeRef.current?.getCurrentTime() || 0 : audioRef.current?.currentTime || 0;
      if (currentTrack.source === "youtube" && youtubeRef.current) {
        youtubeRef.current.pauseVideo();
        socket.emit("pause", { roomId, timestamp });
      } else if (audioRef.current) {
        audioRef.current.pause();
        socket.emit("pause", { roomId, timestamp });
      }
      setIsPlaying(false);
    } else if (currentTrack.source === "youtube" && youtubeRef.current) {
      youtubeRef.current.pauseVideo();
      setIsPlaying(false);
    } else if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleStop = () => {
    if (roomId) {
      if (currentTrack.source === "youtube" && youtubeRef.current) {
        youtubeRef.current.seekTo(0);
        youtubeRef.current.pauseVideo();
        socket.emit("stop", { roomId });
      } else if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        socket.emit("stop", { roomId });
      }
      setIsPlaying(false);
      setCurrentTime(0);
    } else if (currentTrack.source === "youtube" && youtubeRef.current) {
      youtubeRef.current.seekTo(0);
      youtubeRef.current.pauseVideo();
      setIsPlaying(false);
      setCurrentTime(0);
    } else if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
      setCurrentTime(0);
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current) return;
    const rect = progressRef.current.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    const newTime = pos * duration;

    if (currentTrack.source === "youtube" && youtubeRef.current) {
      youtubeRef.current.seekTo(newTime);
      setCurrentTime(newTime);
      if (roomId) socket.emit("pause", { roomId, timestamp: newTime });
    } else if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
      if (roomId) socket.emit("pause", { roomId, timestamp: newTime });
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const generateWaveform = () => {
    const bars = 40;
    return Array(bars)
      .fill(0)
      .map((_, i) => {
        const height = 10 + Math.sin(i * 0.5) * 15 + Math.random() * 15;
        const isActive = i / bars < currentTime / duration;
        return (
          <div
            key={i}
            className={`w-1 rounded-full mx-[1px] transition-all duration-200 ${isActive ? "bg-primary" : "bg-primary/20"}`}
            style={{ height: `${height}px` }}
          />
        );
      });
  };

  const onYouTubeReady = (event: { target: any }) => {
    youtubeRef.current = event.target;
    if (currentTrack.isPlaying) {
      event.target.playVideo();
    }
    setDuration(event.target.getDuration());
  };

  return (
    <Card className="shadow-lg border-primary/10 backdrop-blur-sm bg-card/80 overflow-hidden">
      <CardContent className="p-4">
        {currentTrack.source === "youtube" && audioUrl ? (
          <YouTube
            videoId={audioUrl.split("/").pop()?.split("?")[0]}
            opts={{ height: "0", width: "0", playerVars: { autoplay: currentTrack.isPlaying ? 1 : 0, controls: 0 } }}
            onReady={onYouTubeReady}
          />
        ) : (
          <audio ref={audioRef} controls={false} className="hidden">
            <source src={audioUrl} type="audio/mpeg" />
            Your browser does not support the audio element.
          </audio>
        )}

        {audioUrl ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 rounded-full p-2 flex-shrink-0">
                <Disc className="h-6 w-6 text-primary animate-spin-slow" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium truncate text-white">{currentTrack.title || "Now Playing"}</h3>
                <p className="text-xs text-muted-foreground truncate">{roomId ? `Room: ${roomId}` : "Preview Mode"}</p>
              </div>
            </div>

            <div className="h-[30px] flex items-center justify-center">{generateWaveform()}</div>

            <div
              ref={progressRef}
              className="h-1.5 bg-muted rounded-full cursor-pointer overflow-hidden"
              onClick={handleProgressClick}
            >
              <div className="h-full bg-primary transition-all" style={{ width: `${(currentTime / duration) * 100 || 0}%` }} />
            </div>

            <div className="flex items-center justify-between">
              <div className="text-xs text-muted-foreground">
                {formatTime(currentTime)} / {formatTime(duration)}
              </div>

              <div className="flex items-center gap-2">
                {!isCompact && (
                  <div className="flex items-center gap-2 mr-2">
                    <Volume2 className="h-4 w-4 text-muted-foreground" />
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={volume}
                      onChange={(e) => setVolume(Number.parseFloat(e.target.value))}
                      className="w-20 h-1.5 bg-muted rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary"
                    />
                  </div>
                )}

                <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={handleStop}>
                  <SkipBack className="h-4 w-4" />
                </Button>

                {isPlaying ? (
                  <Button variant="default" size="icon" className="h-10 w-10 rounded-full" onClick={handlePause}>
                    <Pause className="h-5 w-5" />
                  </Button>
                ) : (
                  <Button variant="default" size="icon" className="h-10 w-10 rounded-full" onClick={handlePlay}>
                    <Play className="h-5 w-5 ml-0.5" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Music className="h-12 w-12 mb-3 opacity-20" />
            <p className="font-medium">No track selected</p>
            <p className="text-sm mt-1">Select a track to start listening</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default Player;