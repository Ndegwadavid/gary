"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { useParams, useNavigate } from "react-router-dom"
import type { User } from "firebase/auth"
import { Music2, Users, Share2, ArrowLeft, Video, LogOut } from "lucide-react"
import io from "socket.io-client"
import { toast } from 'sonner'
import * as Dialog from '@radix-ui/react-dialog'
import { Input } from "../components/ui/input"
import { Button } from "../components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card"
import { Separator } from "../components/ui/separator"
import { Badge } from "../components/ui/badge"
import Player from "../components/Player"
import Chat from "../components/Chat"

const getSocketUrl = () => {
  return process.env.NODE_ENV === "production" ? "https://gary-server.onrender.com" : "http://localhost:5000"
}

const socket = io(getSocketUrl(), { transports: ["websocket", "polling"] })
const YOUTUBE_API_KEY = process.env.REACT_APP_YOUTUBE_API_KEY || "YOUR_YOUTUBE_API_KEY"
const JAMENDO_CLIENT_ID = process.env.REACT_APP_JAMENDO_CLIENT_ID || "YOUR_JAMENDO_CLIENT_ID"

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
  source?: "youtube" | "jamendo"
}

interface RoomProps {
  user: User | null
}

const Room: React.FC<RoomProps> = ({ user }) => {
  const { id: roomId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [messages, setMessages] = useState<Message[]>([])
  const [currentTrack, setCurrentTrack] = useState<Track>({})
  const [participants, setParticipants] = useState<{ uid: string; name: string }[]>([])
  const [roomName, setRoomName] = useState("Music Room")
  const [isLoading, setIsLoading] = useState(true)
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)
  const [peerConnection, setPeerConnection] = useState<RTCPeerConnection | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchSource, setSearchSource] = useState<"youtube" | "jamendo">("youtube")
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (!user) {
      navigate("/")
      return
    }

    if (!roomId) {
      navigate("/me")
      return
    }

    socket.emit("join-room", {
      roomId,
      userId: user.uid,
      userName: user.displayName || user.email || "Anonymous",
    })

    socket.on("chat-message", (message: Message) => {
      setMessages((prev) => [...prev, message])
    })

    socket.on("track-changed", (track: Track) => {
      setCurrentTrack(track)
    })

    socket.on("play", (timestamp: number) => {
      setCurrentTrack(prev => ({ ...prev, timestamp, isPlaying: true }))
    })

    socket.on("pause", (timestamp: number) => {
      setCurrentTrack(prev => ({ ...prev, timestamp, isPlaying: false }))
    })

    socket.on("stop", () => {
      setCurrentTrack(prev => ({ ...prev, timestamp: 0, isPlaying: false }))
    })

    socket.on("user-list", (users: { [key: string]: { roomId?: string; userName?: string; uid?: string } }) => {
      const roomUsers = Object.values(users)
        .filter(u => u.roomId === roomId && u.uid)
        .map(u => ({ uid: u.uid!, name: u.userName || "Anonymous" }))
      setParticipants(prev => {
        const uniqueUsers = new Map(prev.map(p => [p.uid, p]))
        roomUsers.forEach(u => uniqueUsers.set(u.uid, u))
        return Array.from(uniqueUsers.values())
      })
    })

    socket.on("user-joined", ({ userName, userId }) => {
      if (userId !== user.uid) {
        toast.success(
          <div className="flex items-center gap-2 bg-green-500/10 backdrop-blur-md border border-green-500/20 rounded-lg p-4">
            <span>{userName} has joined the room!</span>
          </div>,
          { duration: 3000 }
        )
      }
      socket.emit("request-user-list", { roomId })
    })

    socket.on("room-info", (info: { name: string }) => {
      if (info.name) setRoomName(info.name)
    })

    socket.on("offer", async ({ from, offer }) => {
      toast(
        <div className="flex items-center gap-2 bg-yellow-500/10 backdrop-blur-md border border-yellow-500/20 rounded-lg p-4">
          <span>{from} is calling...</span>
          <Button size="sm" onClick={() => handleAnswer(from, offer)}>Accept</Button>
          <Button size="sm" variant="outline" onClick={() => socket.emit("call-ignored", { roomId, from })}>Ignore</Button>
        </div>,
        { duration: 10000 }
      )
    })

    socket.on("answer", async (answer) => {
      if (peerConnection) {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(answer))
        toast.success("Video call connected!", { duration: 3000 })
      }
    })

    socket.on("ice-candidate", async (candidate) => {
      if (peerConnection) {
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
      }
    })

    socket.on("call-ignored", (from) => {
      toast.error(`${from} ignored your call.`)
      cleanupCall()
    })

    socket.emit("request-user-list", { roomId })

    setTimeout(() => setIsLoading(false), 1000)

    return () => {
      socket.emit("leave-room", { roomId, userId: user.uid })
      socket.off("chat-message")
      socket.off("track-changed")
      socket.off("play")
      socket.off("pause")
      socket.off("stop")
      socket.off("user-list")
      socket.off("user-joined")
      socket.off("room-info")
      socket.off("offer")
      socket.off("answer")
      socket.off("ice-candidate")
      socket.off("call-ignored")
      cleanupCall()
    }
  }, [roomId, user, navigate])

  const startVideoCall = async () => {
    const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] })
    setPeerConnection(pc)

    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    setLocalStream(stream)
    stream.getTracks().forEach(track => pc.addTrack(track, stream))

    pc.ontrack = (event) => {
      setRemoteStream(event.streams[0])
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("ice-candidate", { roomId, candidate: event.candidate })
      }
    }

    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)
    socket.emit("offer", { roomId, offer, from: user!.displayName || user!.email || "Anonymous" })
    toast.info("Starting video call...")
  }

  const handleAnswer = async (from: string, offer: RTCSessionDescriptionInit) => {
    const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] })
    setPeerConnection(pc)

    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    setLocalStream(stream)
    stream.getTracks().forEach(track => pc.addTrack(track, stream))

    pc.ontrack = (event) => {
      setRemoteStream(event.streams[0])
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("ice-candidate", { roomId, candidate: event.candidate })
      }
    }

    await pc.setRemoteDescription(new RTCSessionDescription(offer))
    const answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)
    socket.emit("answer", { roomId, answer })
  }

  const cleanupCall = () => {
    if (peerConnection) {
      peerConnection.close()
      setPeerConnection(null)
    }
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop())
      setLocalStream(null)
    }
    setRemoteStream(null)
  }

  const sendMessage = (text: string) => {
    if (!user || !roomId) return
    const message = { userId: user.uid, userName: user.displayName || user.email || "Anonymous", text, timestamp: Date.now() }
    socket.emit("chat-message", { roomId, message })
  }

  const shareRoom = () => {
    if (navigator.share) {
      navigator.share({ title: `Join ${roomName}`, text: `Join me in ${roomName}!`, url: window.location.href })
        .catch(err => console.error("Error sharing:", err))
    } else {
      navigator.clipboard.writeText(window.location.href)
        .then(() => toast.success("Room link copied!"))
        .catch(err => console.error("Error copying:", err))
    }
  }

  const leaveRoom = () => {
    if (!user || !roomId) return
    socket.emit("leave-room", { roomId, userId: user.uid })
    navigate("/me")
  }

  const searchSong = async () => {
    if (!searchQuery.trim()) return
    try {
      if (searchSource === "youtube") {
        const response = await fetch(
          `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(searchQuery)}&type=video&key=${YOUTUBE_API_KEY}`
        )
        const data = await response.json()
        if (data.items && data.items.length > 0) {
          const videoId = data.items[0].id.videoId
          const audioUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1`
          const newTrack: Track = { audioUrl, title: data.items[0].snippet.title, timestamp: 0, isPlaying: true, source: "youtube" }
          setCurrentTrack(newTrack)
          socket.emit("track-changed", { roomId, track: newTrack })
          toast.success(`Now Playing: ${newTrack.title}`, { duration: 3000 })
        } else {
          toast.error("No songs found on YouTube")
        }
      } else if (searchSource === "jamendo") {
        const response = await fetch(
          `https://api.jamendo.com/v3.0/tracks/?client_id=${JAMENDO_CLIENT_ID}&format=json&limit=1&search=${encodeURIComponent(searchQuery)}`
        )
        const data = await response.json()
        if (data.results && data.results.length > 0) {
          const audioUrl = data.results[0].audio
          const newTrack: Track = { audioUrl, title: data.results[0].name, timestamp: 0, isPlaying: true, source: "jamendo" }
          setCurrentTrack(newTrack)
          socket.emit("track-changed", { roomId, track: newTrack })
          toast.success(`Now Playing: ${newTrack.title}`, { duration: 3000 })
        } else {
          toast.error("No songs found on Jamendo")
        }
      }
    } catch (error) {
      console.error("Error searching song:", error)
      toast.error("Failed to search song")
    }
    setSearchQuery("")
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-secondary/20">
        <Card className="w-full max-w-md shadow-lg border-primary/10 backdrop-blur-sm bg-card/80">
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>Please login to join a room</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/")} className="w-full">Go to Login</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-secondary/20">
        <div className="text-center">
          <div className="inline-block p-3 bg-primary/10 rounded-full mb-4">
            <Music2 className="h-8 w-8 text-primary animate-pulse" />
          </div>
          <h2 className="text-2xl font-semibold mb-2 text-white">Joining Room...</h2>
          <p className="text-muted-foreground">Connecting to {roomId}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 py-6 px-4">
      <div className="container mx-auto max-w-6xl">
        <div className="flex flex-col items-start mb-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center">
            <Button variant="ghost" size="icon" onClick={() => navigate("/me")} className="mr-2">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold text-white">{roomName}</h1>
          </div>
          <div className="flex flex-wrap gap-2 mt-4 sm:mt-0">
            <Button variant="outline" size="sm" className="flex items-center gap-1" onClick={shareRoom}>
              <Share2 className="h-4 w-4" />
              Share
            </Button>
            <Dialog.Root>
              <Dialog.Trigger asChild>
                <Button variant="outline" size="sm" className="flex items-center gap-1">
                  <Video className="h-4 w-4" />
                  Video Call
                </Button>
              </Dialog.Trigger>
              <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/50" />
                <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white p-4 rounded-lg shadow-lg w-full max-w-md">
                  <Dialog.Title className="text-lg font-semibold">Video Call</Dialog.Title>
                  <div className="mt-4 space-y-4">
                    {localStream && <video ref={localVideoRef} autoPlay muted className="w-full rounded-lg border" />}
                    {remoteStream && <video ref={remoteVideoRef} autoPlay className="w-full rounded-lg border" />}
                    {!localStream && (
                      <Button onClick={startVideoCall} className="w-full">Start Video Call</Button>
                    )}
                  </div>
                  <Dialog.Close asChild>
                    <Button variant="outline" className="mt-4 w-full">Close</Button>
                  </Dialog.Close>
                </Dialog.Content>
              </Dialog.Portal>
            </Dialog.Root>
            <Button variant="outline" size="sm" className="flex items-center gap-1" onClick={leaveRoom}>
              <LogOut className="h-4 w-4" />
              Leave Room
            </Button>
          </div>
        </div>

        <Card className="shadow-lg border-primary/10 backdrop-blur-sm bg-card/80">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center text-lg sm:text-xl text-white">
              <Music2 className="h-5 w-5 text-primary mr-2" />
              Music Room
            </CardTitle>
            <CardDescription className="text-muted-foreground">Room ID: {roomId}</CardDescription>
          </CardHeader>
          <Separator />
          <CardContent className="pt-6 flex flex-col gap-6">
            <div className="w-full">
              <div className="flex flex-col sm:flex-row gap-2 mb-4">
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={`Search on ${searchSource === "youtube" ? "YouTube" : "Jamendo"}...`}
                  className="flex-1 bg-white/10 border-white/20 text-white placeholder-gray-400"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSearchSource(searchSource === "youtube" ? "jamendo" : "youtube")}
                  className="bg-white/10 text-white border-white/20"
                >
                  Switch to {searchSource === "youtube" ? "Jamendo" : "YouTube"}
                </Button>
                <Button onClick={searchSong} disabled={!searchQuery.trim()}>Search</Button>
              </div>
              {currentTrack.title && (
                <div className="mb-4 p-3 bg-white/10 rounded-lg flex items-center gap-2">
                  <Music2 className="h-5 w-5 text-primary" />
                  <span className="text-sm text-white">Now Playing: {currentTrack.title}</span>
                </div>
              )}
              <Player audioUrl={currentTrack.audioUrl} roomId={roomId} currentTrack={currentTrack} />
            </div>

            <div className="w-full">
              <h3 className="text-lg font-semibold flex items-center mb-2 text-white">
                <Users className="h-5 w-5 text-primary mr-2" />
                Participants ({participants.length})
              </h3>
              <div className="flex flex-wrap gap-3">
                {participants.map((p, index) => (
                  <Badge key={index} variant="outline" className="flex items-center gap-1 py-1 px-3 bg-white/10 border-white/20 text-white">
                    <div className="h-2 w-2 rounded-full bg-green-500 mr-1" />
                    {p.name}
                  </Badge>
                ))}
                {participants.length === 0 && <p className="text-muted-foreground text-sm">No participants yet</p>}
              </div>
            </div>

            <div className="w-full">
              <Chat roomId={roomId || ""} userId={user.uid} messages={messages} sendMessage={sendMessage} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default Room