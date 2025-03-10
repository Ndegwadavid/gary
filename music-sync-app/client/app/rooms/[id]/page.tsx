"use client"

import { useState, useEffect } from "react"
import { MusicPlayer } from "@/components/music-player"
import { ChatPanel } from "@/components/chat-panel"
import { RoomHeader } from "@/components/room-header"
import { VideoCallPanel } from "@/components/video-call-panel"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MessageSquare, Music, Video } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

// Mock data
const roomData = {
  id: "1",
  name: "Chill Vibes",
  description: "Relaxing music for study and focus",
  coverImage: "/assets/images/room-covers/chill.jpg",
  isPrivate: true,
  members: [
    { id: "1", name: "Alex", isHost: true, avatar: "/assets/images/avatars/alex.jpg" },
    { id: "2", name: "Taylor", isHost: false, avatar: "/assets/images/avatars/taylor.jpg" },
    { id: "3", name: "Jordan", isHost: false, avatar: "/assets/images/avatars/jordan.jpg" },
    { id: "4", name: "Casey", isHost: false, avatar: "/assets/images/avatars/casey.jpg" },
  ],
  playlist: [
    {
      id: "1",
      title: "Lofi Study Mix",
      artist: "ChilledCow",
      duration: "3:45",
      isPlaying: true,
      coverArt: "/assets/images/covers/lofi.jpg",
    },
    {
      id: "2",
      title: "Ambient Sounds",
      artist: "Nature Recordings",
      duration: "4:20",
      isPlaying: false,
      coverArt: "/assets/images/covers/ambient.jpg",
    },
    {
      id: "3",
      title: "Piano Sonata",
      artist: "Classical Masters",
      duration: "5:12",
      isPlaying: false,
      coverArt: "/assets/images/covers/piano.jpg",
    },
  ],
  messages: [
    {
      id: "1",
      userId: "2",
      userName: "Taylor",
      text: "This track is so relaxing!",
      timestamp: "2 min ago",
      avatar: "/assets/images/avatars/taylor.jpg",
    },
    {
      id: "2",
      userId: "3",
      userName: "Jordan",
      text: "Perfect for studying!",
      timestamp: "1 min ago",
      avatar: "/assets/images/avatars/jordan.jpg",
    },
    {
      id: "3",
      userId: "1",
      userName: "Alex",
      text: "I'll add more tracks to the playlist soon",
      timestamp: "Just now",
      avatar: "/assets/images/avatars/alex.jpg",
      reactions: ["👍", "❤️"],
    },
  ],
}

export default function RoomPage({ params }: { params: { id: string } }) {
  const { user } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("music")
  const [isVideoCallActive, setIsVideoCallActive] = useState(false)

  useEffect(() => {
    // Check if room is private and user is not authenticated
    if (roomData.isPrivate && !user) {
      toast({
        title: "Authentication Required",
        description: "You need to sign in to access private rooms.",
        variant: "destructive",
      })
      router.push("/rooms")
    }
  }, [user, router])

  const toggleVideoCall = () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "You need to sign in to use video calls.",
        variant: "destructive",
      })
      return
    }

    setIsVideoCallActive(!isVideoCallActive)
    if (!isVideoCallActive) {
      setActiveTab("video")
    }
  }

  return (
    <div className="flex flex-col h-screen">
      <RoomHeader room={roomData} onVideoCallToggle={toggleVideoCall} isVideoCallActive={isVideoCallActive} />

      <div className="md:hidden">
        <Tabs defaultValue="music" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="music" className="gap-2">
              <Music className="h-4 w-4" /> Music
            </TabsTrigger>
            <TabsTrigger value="chat" className="gap-2">
              <MessageSquare className="h-4 w-4" /> Chat
            </TabsTrigger>
            <TabsTrigger value="video" className="gap-2" disabled={!isVideoCallActive}>
              <Video className="h-4 w-4" /> Video
            </TabsTrigger>
          </TabsList>
          <TabsContent value="music" className="flex-1 overflow-auto">
            <div className="p-4">
              <MusicPlayer currentTrack={roomData.playlist[0]} playlist={roomData.playlist} />
            </div>
          </TabsContent>
          <TabsContent value="chat" className="flex-1 overflow-auto">
            <ChatPanel messages={roomData.messages} roomId={params.id} isAuthenticated={!!user} />
          </TabsContent>
          <TabsContent value="video" className="flex-1 overflow-auto">
            {isVideoCallActive ? (
              <VideoCallPanel members={roomData.members} />
            ) : (
              <div className="flex flex-col items-center justify-center h-64 p-4">
                <Button onClick={toggleVideoCall}>Start Video Call</Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <div className="hidden md:flex flex-1 overflow-hidden">
        <div className="flex-1 p-4 overflow-auto">
          <MusicPlayer currentTrack={roomData.playlist[0]} playlist={roomData.playlist} />

          {isVideoCallActive && (
            <div className="mt-6">
              <h2 className="text-xl font-bold mb-4">Video Call</h2>
              <VideoCallPanel members={roomData.members} />
            </div>
          )}
        </div>
        <div className="w-80 border-l">
          <ChatPanel messages={roomData.messages} roomId={params.id} isAuthenticated={!!user} />
        </div>
      </div>
    </div>
  )
}

