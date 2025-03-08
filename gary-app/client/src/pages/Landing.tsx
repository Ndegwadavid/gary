"use client";

import React, { useEffect, useState, useRef } from "react";
import { User } from "firebase/auth";
import { Music, Headphones, ArrowRight, Search, Play, Pause } from "lucide-react";
import AuthComponent from "../components/Auth";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import Sidebar from "../components/Sidebar";


interface Track {
  id: string;
  title: string;
  thumbnail: string;
  videoId: string;
  audioUrl?: string; // Simulated for demo; requires server in production
}

interface LandingProps {
  user: User | null;
}

const CustomAudioPlayer: React.FC<{ track: Track; isPlaying: boolean; onTogglePlay: () => void }> = ({
  track,
  isPlaying,
  onTogglePlay,
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch((err) => console.error("Audio play failed:", err));
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying]);

  return (
    <div className="w-full mt-4 relative">
      <audio ref={audioRef} src={track.audioUrl} />
      <div className="flex items-center justify-between">
        <Button
          size="sm"
          variant="outline"
          className="rounded-full"
          onClick={onTogglePlay}
        >
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>
        <div className="flex-1 flex justify-around items-center">
          <span className={`h-8 w-1 bg-primary ${isPlaying ? "animate-pulse" : ""}`}></span>
          <span className={`h-12 w-1 bg-accent ${isPlaying ? "animate-pulse delay-100" : ""}`}></span>
          <span className={`h-10 w-1 bg-primary ${isPlaying ? "animate-pulse delay-200" : ""}`}></span>
        </div>
      </div>
    </div>
  );
};

const Landing: React.FC<LandingProps> = ({ user }) => {
  const [trendingTracks, setTrendingTracks] = useState<Track[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Track[]>([]);
  const [showAuth, setShowAuth] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);

  // Caching with localStorage
  const cacheKey = "trendingTracks";
  useEffect(() => {
    const cachedTracks = localStorage.getItem(cacheKey);
    if (cachedTracks) {
      setTrendingTracks(JSON.parse(cachedTracks));
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoCategoryId=10&maxResults=6&order=viewCount&key=${process.env.REACT_APP_YOUTUBE_API_KEY}`
    )
      .then((res) => res.json())
      .then((data) => {
        const tracks = data.items.map((item: any) => ({
          id: item.id.videoId,
          title: item.snippet.title,
          thumbnail: item.snippet.thumbnails.high.url,
          videoId: item.id.videoId,
          audioUrl: `https://example.com/audio/${item.id.videoId}.mp3`, // Placeholder; requires server-side extraction
        }));
        setTrendingTracks(tracks);
        localStorage.setItem(cacheKey, JSON.stringify(tracks));
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("YouTube fetch failed:", err);
        setIsLoading(false);
      });
  }, []);

  // Search YouTube videos
  const handleSearch = () => {
    if (!searchQuery) return;
    setIsLoading(true);
    fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoCategoryId=10&maxResults=6&q=${encodeURIComponent(
        searchQuery
      )}&key=${process.env.REACT_APP_YOUTUBE_API_KEY}`
    )
      .then((res) => res.json())
      .then((data) => {
        const tracks = data.items.map((item: any) => ({
          id: item.id.videoId,
          title: item.snippet.title,
          thumbnail: item.snippet.thumbnails.high.url,
          videoId: item.id.videoId,
          audioUrl: `https://example.com/audio/${item.id.videoId}.mp3`, // Placeholder
        }));
        setSearchResults(tracks);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("YouTube search failed:", err);
        setIsLoading(false);
      });
  };

  const handleLoginClick = () => setShowAuth(true);

  const togglePlay = (trackId: string) => {
    setPlayingTrackId(playingTrackId === trackId ? null : trackId);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/10 text-foreground overflow-x-hidden">
      {/* Fixed Search Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-md border-b border-border/40 md:ml-[18rem]">
        <div className="container mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 max-w-6xl">
          <div className="flex items-center gap-2">
            <Music className="h-6 w-6 text-primary animate-spin-slow" />
            <span className="text-xl font-bold gradient-text">Gary Music</span>
          </div>
          <div className="flex-1 w-full sm:w-auto max-w-xl">
            <div className="relative">
              <Input
                type="text"
                placeholder="Search songs, artists, or vibes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                className="w-full pr-12 py-2 text-base rounded-full glass border-primary/30 focus:ring-2 focus:ring-primary shadow-md"
              />
              <Button
                size="icon"
                onClick={handleSearch}
                className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full bg-primary hover:bg-primary/90"
              >
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <Button
            size="sm"
            onClick={user ? () => (window.location.href = "/me") : handleLoginClick}
            className="rounded-full shadow-md hover:scale-105 transition-transform"
          >
            {user ? "Dashboard" : "Login"}
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="pt-24 md:pt-28">
        {/* Hero Section */}
        <section className="relative h-[50vh] md:h-[60vh] flex items-center justify-center text-center bg-gradient-to-br from-primary/20 via-background to-accent/20">
          <div className="absolute inset-0 z-0 overflow-hidden">
            <video
              autoPlay
              loop
              muted
              className="w-full h-full object-cover opacity-20"
            >
              <source src="https://cdn.pixabay.com/video/2023/08/23/176391-856795693_tiny.mp4" type="video/mp4" />
            </video>
            <div className="absolute inset-0 bg-black/60"></div>
          </div>
          <div className="relative z-10 space-y-6 px-4">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight animate-fade-in">
              <span className="gradient-text">Pulse of the Future</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              Unleash your music universe—search, play, and sync with friends in real-time.
            </p>
            <Button
              size="lg"
              onClick={user ? () => (window.location.href = "/rooms") : handleLoginClick}
              className="px-8 py-5 text-lg rounded-full shadow-lg hover:scale-105 transition-transform bg-gradient-to-r from-primary to-accent"
            >
              {user ? "Create Room" : "Start Vibing"} <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </section>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <section className="container mx-auto px-4 py-8 max-w-6xl">
            <h2 className="text-2xl md:text-3xl font-semibold mb-6 flex items-center">
              <Headphones className="mr-2 h-6 w-6 text-primary animate-spin-slow" />
              Your Search
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {searchResults.map((track) => (
                <Card
                  key={track.id}
                  className="bg-card/70 glass hover:bg-card/90 transition-all duration-300 border-primary/30 shadow-lg hover:shadow-xl hover:scale-105 relative overflow-hidden"
                >
                  <CardContent className="p-4 flex flex-col items-center">
                    <img
                      src={track.thumbnail}
                      alt={track.title}
                      className="w-full h-40 object-cover rounded-lg mb-4 shadow-md"
                    />
                    <span className="font-medium text-center truncate w-full text-foreground">
                      {track.title}
                    </span>
                    <CustomAudioPlayer
                      track={track}
                      isPlaying={playingTrackId === track.id}
                      onTogglePlay={() => togglePlay(track.id)}
                    />
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Trending Tracks */}
        <section className="container mx-auto px-4 py-8 max-w-6xl">
          <h2 className="text-2xl md:text-3xl font-semibold mb-6 flex items-center">
            <Headphones className="mr-2 h-6 w-6 text-primary animate-spin-slow" />
            Trending Vibes
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {isLoading
              ? Array(6)
                  .fill(0)
                  .map((_, i) => (
                    <Card key={i} className="bg-card/70 glass shadow-lg">
                      <CardContent className="p-4 flex flex-col items-center">
                        <div className="h-40 w-full bg-muted animate-pulse rounded-lg mb-4"></div>
                        <div className="h-4 w-48 bg-muted animate-pulse rounded"></div>
                      </CardContent>
                    </Card>
                  ))
              : trendingTracks.map((track) => (
                  <Card
                    key={track.id}
                    className="bg-card/70 glass hover:bg-card/90 transition-all duration-300 border-primary/30 shadow-lg hover:shadow-xl hover:scale-105 relative overflow-hidden"
                  >
                    <CardContent className="p-4 flex flex-col items-center">
                      <img
                        src={track.thumbnail}
                        alt={track.title}
                        className="w-full h-40 object-cover rounded-lg mb-4 shadow-md"
                      />
                      <span className="font-medium text-center truncate w-full text-foreground">
                        {track.title}
                      </span>
                      <CustomAudioPlayer
                        track={track}
                        isPlaying={playingTrackId === track.id}
                        onTogglePlay={() => togglePlay(track.id)}
                      />
                    </CardContent>
                  </Card>
                ))}
          </div>
        </section>

        {/* Call to Action */}
        <section className="bg-gradient-to-r from-primary/20 to-accent/20 py-12 text-center">
          <div className="container mx-auto px-4 max-w-6xl">
            <h2 className="text-2xl md:text-3xl font-bold mb-4 gradient-text">Amplify Your Sound</h2>
            <p className="text-lg text-muted-foreground mb-6">
              Join the sonic revolution—sync, share, and vibe with the world.
            </p>
            <Button
              size="lg"
              onClick={user ? () => (window.location.href = "/rooms") : handleLoginClick}
              className="px-8 py-5 text-lg rounded-full shadow-lg hover:scale-105 transition-transform bg-gradient-to-r from-primary to-accent"
            >
              {user ? "Start a Room" : "Join Now"} <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-6 border-t border-border/40 text-center text-sm text-muted-foreground">
          <div className="container mx-auto px-4 max-w-6xl">
            <p>© {new Date().getFullYear()} Gary App. All rights reserved.</p>
          </div>
        </footer>
      </div>

      {showAuth && <AuthComponent onClose={() => setShowAuth(false)} />}
    </div>
  );
};

export default Landing;