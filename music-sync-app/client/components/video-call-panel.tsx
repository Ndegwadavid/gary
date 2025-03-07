"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Mic, MicOff, Video, VideoOff, PhoneOff } from "lucide-react"
import Image from "next/image"

type Member = {
  id: string
  name: string
  isHost: boolean
  avatar: string
}

type VideoCallPanelProps = {
  members: Member[]
}

export function VideoCallPanel({ members }: VideoCallPanelProps) {
  const [isMicMuted, setIsMicMuted] = useState(false)
  const [isVideoOff, setIsVideoOff] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)

  useEffect(() => {
    // Request user media when component mounts
    async function setupCamera() {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        })

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream
        }

        setStream(mediaStream)
      } catch (error) {
        console.error("Error accessing camera and microphone:", error)
      }
    }

    setupCamera()

    // Cleanup function to stop all tracks when component unmounts
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop())
      }
    }
  }, [])

  const toggleMic = () => {
    if (stream) {
      const audioTracks = stream.getAudioTracks()
      audioTracks.forEach((track) => {
        track.enabled = isMicMuted
      })
      setIsMicMuted(!isMicMuted)
    }
  }

  const toggleVideo = () => {
    if (stream) {
      const videoTracks = stream.getVideoTracks()
      videoTracks.forEach((track) => {
        track.enabled = isVideoOff
      })
      setIsVideoOff(!isVideoOff)
    }
  }

  return (
    <div className="space-y-4">
      <div className="video-grid">
        {/* Your video */}
        <div className="video-container">
          {isVideoOff ? (
            <div className="flex items-center justify-center h-full bg-muted">
              <div className="relative h-20 w-20 rounded-full overflow-hidden">
                <Image src="/assets/images/avatars/default.jpg" alt="You" fill className="object-cover" />
              </div>
            </div>
          ) : (
            <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
          )}
          <div className="video-overlay">
            <div className="flex items-center gap-2">
              <span className="text-white text-sm font-medium">You</span>
              {isMicMuted && <MicOff className="h-3 w-3 text-red-500" />}
            </div>
          </div>
        </div>

        {/* Other members' videos (placeholders) */}
        {members.slice(0, 3).map((member) => (
          <div key={member.id} className="video-container">
            <div className="flex items-center justify-center h-full bg-muted">
              <div className="relative h-20 w-20 rounded-full overflow-hidden">
                <Image src={member.avatar || "/placeholder.svg"} alt={member.name} fill className="object-cover" />
              </div>
            </div>
            <div className="video-overlay">
              <div className="flex items-center gap-2">
                <span className="text-white text-sm font-medium">{member.name}</span>
                {member.isHost && (
                  <span className="bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded-full">Host</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Video call controls */}
      <div className="flex justify-center gap-4">
        <Button
          variant={isMicMuted ? "outline" : "default"}
          size="icon"
          className="rounded-full h-12 w-12"
          onClick={toggleMic}
        >
          {isMicMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </Button>

        <Button
          variant={isVideoOff ? "outline" : "default"}
          size="icon"
          className="rounded-full h-12 w-12"
          onClick={toggleVideo}
        >
          {isVideoOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
        </Button>

        <Button variant="destructive" size="icon" className="rounded-full h-12 w-12">
          <PhoneOff className="h-5 w-5" />
        </Button>
      </div>
    </div>
  )
}

