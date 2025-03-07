"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Plus, Users, Music, Headphones, Lock, Globe } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { CreateRoomDialog } from "@/components/create-room-dialog"
import { useToast } from "@/components/ui/use-toast"
import Image from "next/image"

// Mock data for rooms
const rooms = [
  {
    id: "1",
    name: "Chill Vibes",
    members: 4,
    currentTrack: "Lofi Study Mix",
    coverImage: "/assets/images/room-covers/chill.jpg",
    isPrivate: false,
  },
  {
    id: "2",
    name: "Rock Classics",
    members: 2,
    currentTrack: "Queen - Bohemian Rhapsody",
    coverImage: "/assets/images/room-covers/rock.jpg",
    isPrivate: true,
  },
  {
    id: "3",
    name: "Jazz Club",
    members: 3,
    currentTrack: "Miles Davis - So What",
    coverImage: "/assets/images/room-covers/jazz.jpg",
    isPrivate: false,
  },
  {
    id: "4",
    name: "EDM Party",
    members: 8,
    currentTrack: "Avicii - Levels",
    coverImage: "/assets/images/room-covers/edm.jpg",
    isPrivate: false,
  },
  {
    id: "5",
    name: "Indie Discoveries",
    members: 1,
    currentTrack: "No music playing",
    coverImage: "/assets/images/room-covers/indie.jpg",
    isPrivate: true,
  },
]

export default function RoomsPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [searchQuery, setSearchQuery] = useState("")
  const [filteredRooms, setFilteredRooms] = useState(rooms)
  const [isCreateRoomOpen, setIsCreateRoomOpen] = useState(false)

  useEffect(() => {
    setFilteredRooms(rooms.filter((room) => room.name.toLowerCase().includes(searchQuery.toLowerCase())))
  }, [searchQuery])

  const handleJoinRoom = (roomId: string, isPrivate: boolean) => {
    if (!user && isPrivate) {
      toast({
        title: "Authentication Required",
        description: "You need to sign in to join private rooms.",
        variant: "destructive",
      })
      return
    }

    // Navigate to room
    window.location.href = `/rooms/${roomId}`
  }

  const handleCreateRoom = () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "You need to sign in to create rooms.",
        variant: "destructive",
      })
      return
    }

    setIsCreateRoomOpen(true)
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">Music Rooms</h1>
          <p className="text-muted-foreground">Join a room or create your own</p>
        </div>
        <Button onClick={handleCreateRoom} className="gap-2 rounded-full">
          <Plus className="h-4 w-4" /> Create Room
        </Button>
      </div>

      <div className="mb-6">
        <Input
          placeholder="Search rooms..."
          className="max-w-md"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredRooms.map((room) => (
          <Card key={room.id} className="room-card overflow-hidden">
            <div className="relative h-40">
              <Image src={room.coverImage || "/placeholder.svg"} alt={room.name} fill className="object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent"></div>
              <div className="absolute top-2 right-2">
                {room.isPrivate ? (
                  <div className="bg-background/80 backdrop-blur-sm p-1 rounded-full">
                    <Lock className="h-4 w-4 text-primary" />
                  </div>
                ) : (
                  <div className="bg-background/80 backdrop-blur-sm p-1 rounded-full">
                    <Globe className="h-4 w-4 text-primary" />
                  </div>
                )}
              </div>
            </div>
            <CardContent className="pt-4">
              <h2 className="text-xl font-bold mb-1">{room.name}</h2>
              <div className="flex items-center text-sm text-muted-foreground mb-3">
                <Users className="h-4 w-4 mr-1" />
                <span>{room.members} listening</span>
              </div>
              <div className="flex items-center text-sm">
                <Headphones className="h-4 w-4 mr-2 text-primary" />
                <span className="truncate">{room.currentTrack}</span>
              </div>
            </CardContent>
            <CardFooter>
              <Button
                className="w-full gap-2"
                onClick={() => handleJoinRoom(room.id, room.isPrivate)}
                variant={room.isPrivate ? "outline" : "default"}
              >
                <Music className="h-4 w-4" />
                {room.isPrivate ? "Join Private Room" : "Join Room"}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      <CreateRoomDialog open={isCreateRoomOpen} onOpenChange={setIsCreateRoomOpen} />
    </div>
  )
}

