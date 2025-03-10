"use client"

import { Button } from "@/components/ui/button"
import { Share2, UserPlus, MoreHorizontal, Video, VideoOff } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/components/ui/use-toast"
import Image from "next/image"

type RoomHeaderProps = {
  room: {
    id: string
    name: string
    description: string
    coverImage: string
    members: {
      id: string
      name: string
      isHost: boolean
      avatar: string
    }[]
  }
  onVideoCallToggle: () => void
  isVideoCallActive: boolean
}

export function RoomHeader({ room, onVideoCallToggle, isVideoCallActive }: RoomHeaderProps) {
  const { user } = useAuth()
  const { toast } = useToast()

  const handleInvite = () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "You need to sign in to invite others.",
        variant: "destructive",
      })
      return
    }

    // Copy invite link to clipboard
    navigator.clipboard.writeText(`${window.location.origin}/invite/${room.id}`)

    toast({
      title: "Invite Link Copied",
      description: "Share this link with friends to invite them to the room.",
    })
  }

  const handleShare = () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "You need to sign in to share this room.",
        variant: "destructive",
      })
      return
    }

    // Copy share link to clipboard
    navigator.clipboard.writeText(`${window.location.origin}/rooms/${room.id}`)

    toast({
      title: "Share Link Copied",
      description: "Room link copied to clipboard!",
    })
  }

  return (
    <div className="border-b p-4 flex flex-col md:flex-row justify-between gap-4">
      <div className="flex items-center gap-4">
        <div className="relative h-12 w-12 rounded-md overflow-hidden flex-shrink-0">
          <Image src={room.coverImage || "/placeholder.svg"} alt={room.name} fill className="object-cover" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">{room.name}</h1>
          <p className="text-sm text-muted-foreground">{room.description}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Button
          variant={isVideoCallActive ? "destructive" : "outline"}
          size="sm"
          onClick={onVideoCallToggle}
          className="gap-2"
        >
          {isVideoCallActive ? (
            <>
              <VideoOff className="h-4 w-4" />
              End Video
            </>
          ) : (
            <>
              <Video className="h-4 w-4" />
              Video Call
            </>
          )}
        </Button>

        <Button variant="outline" size="sm" onClick={handleInvite} className="gap-2">
          <UserPlus className="h-4 w-4" />
          Invite
        </Button>

        <Button variant="outline" size="sm" onClick={handleShare} className="gap-2">
          <Share2 className="h-4 w-4" />
          Share
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Room Options</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Edit Room</DropdownMenuItem>
            <DropdownMenuItem>Room Settings</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive">Leave Room</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}

