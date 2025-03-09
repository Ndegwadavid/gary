"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import type { User } from "firebase/auth"
import { Music2, Users, Share2, ArrowLeft } from "lucide-react"
import io from "socket.io-client"
import { toast } from 'sonner'

import Player from "../components/Player"
import Chat from "../components/Chat"
import { Button } from "../components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card"
import { Separator } from "../components/ui/separator"
import { Badge } from "../components/ui/badge"

// Socket.io setup
const getSocketUrl = () => {
  return process.env.NODE_ENV === "production" ? "https://gary-server.onrender.com" : "http://localhost:5000"
}

const socket = io(getSocketUrl(), { transports: ["websocket", "polling"] })

interface Message {
  userId: string
  userName: string
  text: string
  timestamp: number
}

interface Track {
  audioUrl?: string
  title?: string
  timestamp?: number
  isPlaying?: boolean
}

interface RoomProps {
  user: User | null
}

const Room: React.FC<RoomProps> = ({ user }) => {
  const { id: roomId } = useParams<{ id: string }>() // Renamed from roomId to id to match route
  const navigate = useNavigate()
  const [messages, setMessages] = useState<Message[]>([])
  const [currentTrack, setCurrentTrack] = useState<Track>({})
  const [participants, setParticipants] = useState<string[]>([])
  const [roomName, setRoomName] = useState("Music Room")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    console.log("Room component mounted with roomId:", roomId)
    console.log("User:", user)

    if (!user) {
      navigate("/")
      return
    }

    if (!roomId) {
      console.error("No roomId found in URL parameters")
      navigate("/me")
      return
    }

    // Join room
    socket.emit("join-room", {
      roomId,
      userId: user.uid,
      userName: user.displayName || user.email || "Anonymous",
    })

    // Listen for messages
    socket.on("chat-message", (message: Message) => {
      setMessages((prev) => [...prev, message])
    })

    // Listen for track changes
    socket.on("track-changed", (track: Track) => {
      setCurrentTrack(track)
    })

    // Listen for participant updates
    socket.on("user-list", (users: { [key: string]: { roomId?: string; userName?: string } }) => {
      const roomUsers = Object.values(users)
        .filter(u => u.roomId === roomId)
        .map(u => u.userName || "Anonymous")
      setParticipants(roomUsers)
    })

    // Listen for room info
    socket.on("room-info", (info: { name: string }) => {
      if (info.name) setRoomName(info.name)
    })

    setTimeout(() => setIsLoading(false), 1000)

    return () => {
      console.log("Room component unmounting, leaving room:", roomId)
      socket.emit("leave-room", { roomId, userId: user.uid })
      socket.off("chat-message")
      socket.off("track-changed")
      socket.off("user-list")
      socket.off("room-info")
    }
  }, [roomId, user, navigate])

  const sendMessage = (text: string) => {
    if (!user || !roomId) return

    const message = {
      userId: user.uid,
      userName: user.displayName || user.email || "Anonymous",
      text,
      timestamp: Date.now(),
    }

    socket.emit("chat-message", { roomId, message })
  }

  const shareRoom = () => {
    if (navigator.share) {
      navigator
        .share({
          title: `Join ${roomName}`,
          text: `Join me in ${roomName} on Gary Music App!`,
          url: window.location.href,
        })
        .catch((err) => console.error("Error sharing:", err))
    } else {
      navigator.clipboard
        .writeText(window.location.href)
        .then(() => toast.success("Room link copied to clipboard!"))
        .catch((err) => console.error("Error copying:", err))
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>Please login to join a room</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/")} className="w-full">
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block p-3 bg-primary/10 rounded-full mb-4">
            <Music2 className="h-8 w-8 text-primary animate-pulse" />
          </div>
          <h2 className="text-2xl font-semibold mb-2">Joining Room...</h2>
          <p className="text-muted-foreground">Connecting to {roomId}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 py-6 px-4">
      <div className="container mx-auto max-w-6xl">
        <div className="flex items-center mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate("/me")} className="mr-2">
            <ArrowLeft className="h-5 w-5" />
            <span className="sr-only">Back</span>
          </Button>
          <h1 className="text-2xl font-bold">{roomName}</h1>
        </div>

        <div className="flex flex-col md:flex-row gap-6">
          <div className="w-full md:w-2/3 space-y-6">
            <Card className="shadow-lg border-primary/10 backdrop-blur-sm bg-card/80">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center">
                      <Music2 className="h-5 w-5 text-primary mr-2" />
                      Music Room
                    </CardTitle>
                    <CardDescription>Room ID: {roomId}</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" className="flex items-center gap-1" onClick={shareRoom}>
                    <Share2 className="h-4 w-4" />
                    Share
                  </Button>
                </div>
              </CardHeader>
              <Separator />
              <CardContent className="pt-6">
                <Player audioUrl={currentTrack.audioUrl} roomId={roomId} currentTrack={currentTrack} />
              </CardContent>
            </Card>

            <Card className="shadow-lg border-primary/10 backdrop-blur-sm bg-card/80">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center">
                  <Users className="h-5 w-5 text-primary mr-2" />
                  Participants ({participants.length})
                </CardTitle>
              </CardHeader>
              <Separator />
              <CardContent className="pt-4">
                <div className="flex flex-wrap gap-3">
                  {participants.map((name, index) => (
                    <Badge key={index} variant="outline" className="flex items-center gap-1 py-1 px-3">
                      <div className="h-2 w-2 rounded-full bg-green-500 mr-1"></div>
                      {name}
                    </Badge>
                  ))}
                  {participants.length === 0 && <p className="text-muted-foreground text-sm">No participants yet</p>}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="w-full md:w-1/3">
            <Chat roomId={roomId || ""} userId={user.uid} messages={messages} sendMessage={sendMessage} />
          </div>
        </div>
      </div>
    </div>
  )
}

export default Room