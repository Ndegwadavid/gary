"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Repeat,
  Shuffle,
  ListMusic,
  Heart,
  Share2,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import Image from "next/image"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/components/ui/use-toast"

type Track = {
  id: string
  title: string
  artist: string
  duration: string
  isPlaying: boolean
  coverArt: string
}

type MusicPlayerProps = {
  currentTrack: Track
  playlist: Track[]
}

export function MusicPlayer({ currentTrack, playlist }: MusicPlayerProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [volume, setVolume] = useState(80)
  const [isMuted, setIsMuted] = useState(false)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [isLiked, setIsLiked] = useState(false)

  // Simulate playback progress
  useEffect(() => {
    let interval: NodeJS.Timeout

    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentTime((prev) => {
          if (prev >= duration) {
            setIsPlaying(false)
            return 0
          }
          return prev + 1
        })
      }, 1000)
    }

    return () => clearInterval(interval)
  }, [isPlaying, duration])

  // Set duration based on the track duration string (e.g., "3:45" -> 225 seconds)
  useEffect(() => {
    const [minutes, seconds] = currentTrack.duration.split(":").map(Number)
    setDuration(minutes * 60 + seconds)
    setCurrentTime(0)
    setIsLiked(false)
  }, [currentTrack])

  // Update progress based on current time
  useEffect(() => {
    setProgress((currentTime / duration) * 100 || 0)
  }, [currentTime, duration])

  const togglePlay = () => {
    setIsPlaying(!isPlaying)
  }

  const toggleMute = () => {
    setIsMuted(!isMuted)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const handleProgressChange = (value: number[]) => {
    const newProgress = value[0]
    setProgress(newProgress)
    setCurrentTime((newProgress / 100) * duration)
  }

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0]
    setVolume(newVolume)
    setIsMuted(newVolume === 0)
  }

  const handleLike = () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "You need to sign in to like tracks.",
        variant: "destructive",
      })
      return
    }

    setIsLiked(!isLiked)
    toast({
      title: isLiked ? "Removed from Liked Songs" : "Added to Liked Songs",
      description: `${currentTrack.title} by ${currentTrack.artist}`,
    })
  }

  const handleShare = () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "You need to sign in to share tracks.",
        variant: "destructive",
      })
      return
    }

    toast({
      title: "Share Link Copied",
      description: "Track share link copied to clipboard!",
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <Card className="glass-card overflow-hidden">
        <CardHeader className="pb-0">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-2xl">{currentTrack.title}</CardTitle>
              <CardDescription>{currentTrack.artist}</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="icon" onClick={handleLike} className={isLiked ? "text-primary" : ""}>
                <Heart className="h-5 w-5" fill={isLiked ? "currentColor" : "none"} />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleShare}>
                <Share2 className="h-5 w-5" />
              </Button>
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon">
                    <ListMusic className="h-4 w-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent>
                  <SheetHeader>
                    <SheetTitle>Playlist</SheetTitle>
                    <SheetDescription>Current room playlist</SheetDescription>
                  </SheetHeader>
                  <div className="mt-4 space-y-2">
                    {playlist.map((track) => (
                      <div
                        key={track.id}
                        className={`p-3 rounded-md flex items-center gap-3 ${
                          track.id === currentTrack.id ? "bg-secondary" : ""
                        }`}
                      >
                        <div className="relative h-10 w-10 flex-shrink-0 rounded overflow-hidden">
                          <Image
                            src={track.coverArt || "/placeholder.svg"}
                            alt={track.title}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{track.title}</div>
                          <div className="text-sm text-muted-foreground">{track.artist}</div>
                        </div>
                        <div className="text-sm text-muted-foreground">{track.duration}</div>
                      </div>
                    ))}
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-6">
            {/* Album art */}
            <div className="relative aspect-square max-w-xs mx-auto rounded-md overflow-hidden">
              <Image
                src={currentTrack.coverArt || "/placeholder.svg"}
                alt={`${currentTrack.title} by ${currentTrack.artist}`}
                fill
                className="object-cover"
              />

              {/* Play/Pause overlay */}
              <div
                className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 hover:opacity-100 transition-opacity cursor-pointer"
                onClick={togglePlay}
              >
                <div className="bg-background/80 backdrop-blur-sm p-4 rounded-full">
                  {isPlaying ? <Pause className="h-8 w-8 text-primary" /> : <Play className="h-8 w-8 text-primary" />}
                </div>
              </div>
            </div>

            {/* Progress bar */}
            <div className="space-y-2">
              <Slider
                value={[progress]}
                max={100}
                step={0.1}
                onValueChange={handleProgressChange}
                className="cursor-pointer"
              />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{formatTime(currentTime)}</span>
                <span>{currentTrack.duration}</span>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <div className="w-full space-y-4">
            {/* Controls */}
            <div className="flex justify-center items-center gap-4">
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                <Shuffle className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                <SkipBack className="h-6 w-6" />
              </Button>
              <Button
                onClick={togglePlay}
                size="icon"
                className="h-14 w-14 rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {isPlaying ? <Pause className="h-7 w-7" /> : <Play className="h-7 w-7 ml-1" />}
              </Button>
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                <SkipForward className="h-6 w-6" />
              </Button>
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                <Repeat className="h-5 w-5" />
              </Button>
            </div>

            {/* Volume control */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleMute}
                className="text-muted-foreground hover:text-foreground"
              >
                {isMuted || volume === 0 ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
              </Button>
              <Slider
                value={[isMuted ? 0 : volume]}
                max={100}
                step={1}
                onValueChange={handleVolumeChange}
                className="w-32"
              />
            </div>
          </div>
        </CardFooter>
      </Card>

      {/* Room members currently listening */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg">Currently Listening</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center">
                <div className="relative h-14 w-14 rounded-full overflow-hidden border-2 border-primary">
                  <Image
                    src={`/assets/images/avatars/${["alex", "taylor", "jordan", "casey"][i]}.jpg`}
                    alt={`User ${i + 1}`}
                    fill
                    className="object-cover"
                  />
                </div>
                <span className="text-xs mt-1">{["Alex", "Taylor", "Jordan", "Casey"][i]}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

