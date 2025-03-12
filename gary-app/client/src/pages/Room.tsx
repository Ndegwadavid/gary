"use client";

import type React from "react";
import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import type { User } from "firebase/auth";
import {
  Music2,
  Users,
  Share2,
  ArrowLeft,
  Video,
  LogOut,
  Search,
  X,
  Youtube,
  Music,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Play,
  Pause,
  SkipForward,
  Volume2,
  VolumeX,
} from "lucide-react";
import io, { type Socket } from "socket.io-client";
import { toast } from "sonner";
import * as Dialog from "@radix-ui/react-dialog";
import * as CollapsiblePrimitive from "@radix-ui/react-collapsible";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "../components/ui/card";
import { Separator } from "../components/ui/separator";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tab";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../components/ui/tooltip";
import Player from "../components/Player";
import Chat from "../components/Chat";

const getSocketUrl = () => {
  return process.env.NODE_ENV === "production" ? "https://gary-server.onrender.com" : "http://localhost:5000";
};

const Collapsible = CollapsiblePrimitive.Root;
const CollapsibleTrigger = CollapsiblePrimitive.Trigger;
const CollapsibleContent = CollapsiblePrimitive.Content;

interface Reaction {
  emoji: string;
  userId: string;
  userName: string;
}

interface Track {
  audioUrl?: string;
  title?: string;
  timestamp?: number;
  isPlaying?: boolean;
  source?: "youtube" | "jamendo";
}

interface MessageFile {
  url: string;
  type: "image" | "file";
  name: string;
}

interface Message {
  id: string;
  userId: string;
  userName: string;
  text: string;
  timestamp: number;
  reactions?: Reaction[];
  file?: MessageFile;
  replyTo?: string;
  isDeleted?: boolean;
  readBy?: string[];
}

interface RoomProps {
  user: User | null;
}

const Room: React.FC<RoomProps> = ({ user }) => {
  const { id: roomId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentTrack, setCurrentTrack] = useState<Track>({});
  const [participants, setParticipants] = useState<{ uid: string; name: string }[]>([]);
  const [roomName, setRoomName] = useState("Music Room");
  const [isLoading, setIsLoading] = useState(true);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [peerConnection, setPeerConnection] = useState<RTCPeerConnection | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchSource, setSearchSource] = useState<"youtube" | "jamendo">("youtube");
  const [showParticipants, setShowParticipants] = useState(false);
  const [activeTab, setActiveTab] = useState("music");
  const [isVideoCallOpen, setIsVideoCallOpen] = useState(false);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const socketRef = useRef<Socket | null>(null);

  const YOUTUBE_API_KEY = process.env.REACT_APP_YOUTUBE_API_KEY || "YOUR_YOUTUBE_API_KEY";
  const JAMENDO_CLIENT_ID = process.env.REACT_APP_JAMENDO_CLIENT_ID || "YOUR_JAMENDO_CLIENT_ID";

  useEffect(() => {
    if (!user) {
      navigate("/");
      return;
    }

    if (!roomId) {
      navigate("/me");
      return;
    }

    socketRef.current = io(getSocketUrl(), { transports: ["websocket", "polling"] });

    const socket = socketRef.current;

    socket.emit("join-room", {
      roomId,
      userId: user.uid,
      userName: user.displayName || user.email || "Anonymous",
    });

    socket.on("chat-message", (message: Message) => {
      if (!message.id) {
        message.id = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      }
      setMessages((prev) => [...prev, message]);
    });

    socket.on("track-changed", (track: Track) => {
      setCurrentTrack(track);
    });

    socket.on("play", (timestamp: number) => {
      setCurrentTrack((prev) => ({ ...prev, timestamp, isPlaying: true }));
    });

    socket.on("pause", (timestamp: number) => {
      setCurrentTrack((prev) => ({ ...prev, timestamp, isPlaying: false }));
    });

    socket.on("stop", () => {
      setCurrentTrack((prev) => ({ ...prev, timestamp: 0, isPlaying: false }));
    });

    socket.on("user-list", (users: { [key: string]: { roomId?: string; userName?: string; uid?: string } }) => {
      const roomUsers = Object.values(users)
        .filter((u) => u.roomId === roomId && u.uid)
        .map((u) => ({ uid: u.uid!, name: u.userName || "Anonymous" }));
      setParticipants((prev) => {
        const uniqueUsers = new Map(prev.map((p) => [p.uid, p]));
        roomUsers.forEach((u) => uniqueUsers.set(u.uid, u));
        return Array.from(uniqueUsers.values());
      });
    });

    socket.on("user-joined", ({ userName, userId }) => {
      if (userId !== user.uid) {
        toast.success(
          <div className="flex items-center gap-2 bg-green-500/10 backdrop-blur-md border border-green-500/20 rounded-lg p-4">
            <span>{userName} has joined the room!</span>
          </div>,
          { duration: 3000 }
        );
      }
      socket.emit("request-user-list", { roomId });
    });

    socket.on("room-info", (info: { name: string }) => {
      if (info.name) setRoomName(info.name);
    });

    socket.on("offer", async ({ from, offer }) => {
      setIsVideoCallOpen(true);
      toast(
        <div className="flex items-center gap-2 bg-yellow-500/10 backdrop-blur-md border border-yellow-500/20 rounded-lg p-4">
          <span>{from} is calling...</span>
          <Button size="sm" onClick={() => handleAnswer(from, offer)}>
            Accept
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => socket.emit("call-ignored", { roomId, from })}
          >
            Ignore
          </Button>
        </div>,
        { duration: 10000 }
      );
    });

    socket.on("answer", async (answer) => {
      if (peerConnection) {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
        toast.success("Video call connected!", { duration: 3000 });
      }
    });

    socket.on("ice-candidate", async (candidate) => {
      if (peerConnection) {
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      }
    });

    socket.on("call-ignored", (from) => {
      toast.error(`${from} ignored your call.`);
      cleanupCall();
    });

    socket.emit("request-user-list", { roomId });

    setTimeout(() => setIsLoading(false), 1000);

    return () => {
      if (socket) {
        socket.emit("leave-room", { roomId, userId: user.uid });
        socket.disconnect();
      }
      cleanupCall();
    };
  }, [roomId, user, navigate]);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [localStream, remoteStream]);

  const startVideoCall = async () => {
    try {
      const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
      setPeerConnection(pc);

      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setLocalStream(stream);
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.ontrack = (event) => {
        setRemoteStream(event.streams[0]);
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socketRef.current?.emit("ice-candidate", { roomId, candidate: event.candidate });
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socketRef.current?.emit("offer", {
        roomId,
        offer,
        from: user!.displayName || user!.email || "Anonymous",
      });
      toast.info("Starting video call...");
    } catch (error) {
      console.error("Error starting video call:", error);
      toast.error("Failed to start video call. Please check your camera and microphone permissions.");
    }
  };

  const handleAnswer = async (from: string, offer: RTCSessionDescriptionInit) => {
    try {
      const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
      setPeerConnection(pc);

      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setLocalStream(stream);
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.ontrack = (event) => {
        setRemoteStream(event.streams[0]);
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socketRef.current?.emit("ice-candidate", { roomId, candidate: event.candidate });
        }
      };

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socketRef.current?.emit("answer", { roomId, answer });
    } catch (error) {
      console.error("Error answering call:", error);
      toast.error("Failed to answer call. Please check your camera and microphone permissions.");
    }
  };

  const cleanupCall = () => {
    if (peerConnection) {
      peerConnection.close();
      setPeerConnection(null);
    }
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
      setLocalStream(null);
    }
    setRemoteStream(null);
    setIsVideoCallOpen(false);
  };

  const sendMessage = useCallback(
    (text: string, file?: MessageFile, replyTo?: string) => {
      if (!user || !roomId || !text.trim()) return;
      const messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const message = {
        id: messageId,
        userId: user.uid,
        userName: user.displayName || user.email || "Anonymous",
        text,
        timestamp: Date.now(),
        file,
        replyTo,
        readBy: [user.uid],
      };
      socketRef.current?.emit("chat-message", { roomId, message });
    },
    [user, roomId]
  );

  const shareRoom = () => {
    if (navigator.share) {
      navigator
        .share({ title: `Join ${roomName}`, text: `Join me in ${roomName}!`, url: window.location.href })
        .catch((err) => console.error("Error sharing:", err));
    } else {
      navigator.clipboard
        .writeText(window.location.href)
        .then(() => toast.success("Room link copied!"))
        .catch((err) => console.error("Error copying:", err));
    }
  };

  const leaveRoom = () => {
    if (!user || !roomId) return;
    socketRef.current?.emit("leave-room", { roomId, userId: user.uid });
    navigate("/me");
  };

  const searchSong = async () => {
    if (!searchQuery.trim()) return;
    try {
      if (searchSource === "youtube") {
        const response = await fetch(
          `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(
            searchQuery
          )}&type=video&key=${YOUTUBE_API_KEY}`
        );
        const data = await response.json();
        if (data.items && data.items.length > 0) {
          const videoId = data.items[0].id.videoId;
          const audioUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
          const newTrack: Track = {
            audioUrl,
            title: data.items[0].snippet.title,
            timestamp: 0,
            isPlaying: true,
            source: "youtube",
          };
          setCurrentTrack(newTrack);
          socketRef.current?.emit("track-changed", { roomId, track: newTrack });
          toast.success(`Now Playing: ${newTrack.title}`, { duration: 3000 });
        } else {
          toast.error("No songs found on YouTube");
        }
      } else if (searchSource === "jamendo") {
        const response = await fetch(
          `https://api.jamendo.com/v3.0/tracks/?client_id=${JAMENDO_CLIENT_ID}&format=json&limit=1&search=${encodeURIComponent(
            searchQuery
          )}`
        );
        const data = await response.json();
        if (data.results && data.results.length > 0) {
          const audioUrl = data.results[0].audio;
          const newTrack: Track = {
            audioUrl,
            title: data.results[0].name,
            timestamp: 0,
            isPlaying: true,
            source: "jamendo",
          };
          setCurrentTrack(newTrack);
          socketRef.current?.emit("track-changed", { roomId, track: newTrack });
          toast.success(`Now Playing: ${newTrack.title}`, { duration: 3000 });
        } else {
          toast.error("No songs found on Jamendo");
        }
      }
    } catch (error) {
      console.error("Error searching song:", error);
      toast.error("Failed to search song");
    }
    setSearchQuery("");
  };

  const handlePlayPause = () => {
    if (!currentTrack.audioUrl) return;
    if (currentTrack.isPlaying) {
      socketRef.current?.emit("pause", { roomId, timestamp: currentTrack.timestamp || 0 });
    } else {
      socketRef.current?.emit("play", { roomId, timestamp: currentTrack.timestamp || 0 });
    }
  };

  const handleStop = () => {
    if (!currentTrack.audioUrl) return;
    socketRef.current?.emit("stop", { roomId });
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background/90 to-primary/20">
        <Card className="w-full max-w-md shadow-xl border-primary/20 backdrop-blur-md bg-card/90 animate-fade-in">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">Authentication Required</CardTitle>
            <CardDescription className="text-center">Please login to join a room</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <Button onClick={() => navigate("/")} className="w-full">
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background/90 to-primary/20">
        <div className="text-center animate-fade-in">
          <div className="inline-block p-4 bg-primary/20 rounded-full mb-6 backdrop-blur-md">
            <Music2 className="h-10 w-10 text-primary animate-pulse" />
          </div>
          <h2 className="text-2xl font-bold mb-3 text-white">Joining Room...</h2>
          <p className="text-muted-foreground">Connecting to {roomId}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/90 to-primary/20 pb-20 md:pb-6">
      {/* Header */}
      <header className="sticky top-0 z-10 backdrop-blur-md bg-background/80 border-b border-primary/10 shadow-sm">
        <div className="container mx-auto max-w-6xl px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate("/me")} className="text-white">
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold text-white truncate max-w-[180px] sm:max-w-xs">{roomName}</h1>
                <p className="text-xs text-muted-foreground">Room ID: {roomId}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-white hover:bg-primary/20"
                      onClick={shareRoom}
                    >
                      <Share2 className="h-5 w-5" />
                      <span className="sr-only">Share Room</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Share Room</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Dialog.Root open={isVideoCallOpen} onOpenChange={setIsVideoCallOpen}>
                      <Dialog.Trigger asChild>
                        <Button variant="ghost" size="icon" className="text-white hover:bg-primary/20">
                          <Video className="h-5 w-5" />
                          <span className="sr-only">Video Call</span>
                        </Button>
                      </Dialog.Trigger>
                      <Dialog.Portal>
                        <Dialog.Overlay className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50" />
                        <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-card p-6 rounded-xl shadow-xl w-full max-w-md border border-primary/20 z-50">
                          <div className="flex items-center justify-between mb-4">
                            <Dialog.Title className="text-xl font-bold">Video Call</Dialog.Title>
                            <Dialog.Close asChild>
                              <Button variant="ghost" size="icon" className="rounded-full">
                                <X className="h-4 w-4" />
                              </Button>
                            </Dialog.Close>
                          </div>
                          <div className="space-y-4">
                            {localStream && (
                              <div className="relative rounded-lg overflow-hidden aspect-video bg-black">
                                <video ref={localVideoRef} autoPlay muted className="w-full h-full object-cover" />
                                <div className="absolute bottom-2 left-2 text-xs bg-black/60 text-white px-2 py-1 rounded">
                                  You
                                </div>
                              </div>
                            )}
                            {remoteStream && (
                              <div className="relative rounded-lg overflow-hidden aspect-video bg-black">
                                <video ref={remoteVideoRef} autoPlay className="w-full h-full object-cover" />
                                <div className="absolute bottom-2 left-2 text-xs bg-black/60 text-white px-2 py-1 rounded">
                                  Remote
                                </div>
                              </div>
                            )}
                            {!localStream && (
                              <Button onClick={startVideoCall} className="w-full">
                                <Video className="h-4 w-4 mr-2" />
                                Start Video Call
                              </Button>
                            )}
                            {localStream && (
                              <Button variant="destructive" onClick={cleanupCall} className="w-full">
                                End Call
                              </Button>
                            )}
                          </div>
                        </Dialog.Content>
                      </Dialog.Portal>
                    </Dialog.Root>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Video Call</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-white hover:bg-primary/20"
                      onClick={leaveRoom}
                    >
                      <LogOut className="h-5 w-5" />
                      <span className="sr-only">Leave Room</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Leave Room</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto max-w-6xl px-4 py-6">
        <div className="md:hidden mb-6">
          <Tabs defaultValue="music" onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="music" className="flex items-center gap-2">
                <Music2 className="h-4 w-4" />
                <span>Music</span>
              </TabsTrigger>
              <TabsTrigger value="chat" className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                <span>Chat</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Music Player Section */}
          <div className={`md:col-span-2 ${activeTab !== "music" ? "hidden md:block" : ""}`}>
            <Card className="shadow-lg border-primary/20 backdrop-blur-md bg-card/90 overflow-hidden">
              <CardHeader className="pb-2 space-y-1">
                <CardTitle className="flex items-center text-lg text-white">
                  <Music2 className="h-5 w-5 text-primary mr-2" />
                  Now Playing
                </CardTitle>
                {currentTrack.title && (
                  <CardDescription className="text-sm font-medium text-white/80 truncate">
                    {currentTrack.title}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="pt-4">
                <div className="relative rounded-lg overflow-hidden bg-black/40 aspect-video mb-6">
                  <Player audioUrl={currentTrack.audioUrl} roomId={roomId!} currentTrack={currentTrack} />
                  {!currentTrack.title && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <Music className="h-12 w-12 mx-auto text-primary/50 mb-2" />
                        <p className="text-white/60">Search for a song to play</p>
                      </div>
                    </div>
                  )}
                </div>

                {currentTrack.title && (
                  <div className="flex items-center justify-center gap-4 mb-6">
                    <Button
                      variant="outline"
                      size="icon"
                      className="rounded-full h-10 w-10 bg-primary/10 border-primary/20 text-white hover:bg-primary/20"
                      onClick={handlePlayPause}
                    >
                      {currentTrack.isPlaying ? (
                        <Pause className="h-5 w-5" />
                      ) : (
                        <Play className="h-5 w-5" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="rounded-full h-10 w-10 bg-primary/10 border-primary/20 text-white hover:bg-primary/20"
                      onClick={handleStop}
                    >
                      <SkipForward className="h-5 w-5" />
                    </Button>
                  </div>
                )}

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 relative">
                      <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={`Search for music...`}
                        className="pr-10 bg-white/10 border-white/20 text-white placeholder-gray-400"
                        onKeyDown={(e) => e.key === "Enter" && searchSong()}
                      />
                      <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    </div>
                    <Button onClick={searchSong} disabled={!searchQuery.trim()}>
                      Search
                    </Button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={searchSource === "youtube" ? "default" : "outline"}
                        className="cursor-pointer flex items-center gap-1"
                        onClick={() => setSearchSource("youtube")}
                      >
                        <Youtube className="h-3 w-3" />
                        YouTube
                      </Badge>
                      <Badge
                        variant={searchSource === "jamendo" ? "default" : "outline"}
                        className="cursor-pointer flex items-center gap-1"
                        onClick={() => setSearchSource("jamendo")}
                      >
                        <Music className="h-3 w-3" />
                        Jamendo
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="mt-6">
              <Collapsible
                open={showParticipants}
                onOpenChange={setShowParticipants}
                className="md:hidden"
              >
                <Card className="shadow-lg border-primary/20 backdrop-blur-md bg-card/90">
                  <CardHeader className="pb-2 flex flex-row items-center justify-between">
                    <CardTitle className="flex items-center text-lg text-white">
                      <Users className="h-5 w-5 text-primary mr-2" />
                      Participants ({participants.length})
                    </CardTitle>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm">
                        {showParticipants ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </CollapsibleTrigger>
                  </CardHeader>
                  <CollapsibleContent>
                    <CardContent className="pt-4">
                      <div className="flex flex-wrap gap-2">
                        {participants.map((p, index) => (
                          <Badge
                            key={index}
                            variant="outline"
                            className="flex items-center gap-1 py-1 px-3 bg-primary/10 border-primary/20 text-white"
                          >
                            <div className="h-2 w-2 rounded-full bg-green-500 mr-1" />
                            {p.name}
                          </Badge>
                        ))}
                        {participants.length === 0 && (
                          <p className="text-muted-foreground text-sm">No participants yet</p>
                        )}
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>

              <Card className="shadow-lg border-primary/20 backdrop-blur-md bg-card/90 hidden md:block">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center text-lg text-white">
                    <Users className="h-5 w-5 text-primary mr-2" />
                    Participants ({participants.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="flex flex-wrap gap-2">
                    {participants.map((p, index) => (
                      <Badge
                        key={index}
                        variant="outline"
                        className="flex items-center gap-1 py-1 px-3 bg-primary/10 border-primary/20 text-white"
                      >
                        <div className="h-2 w-2 rounded-full bg-green-500 mr-1" />
                        {p.name}
                      </Badge>
                    ))}
                    {participants.length === 0 && (
                      <p className="text-muted-foreground text-sm">No participants yet</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Chat Section */}
          <div className={`${activeTab !== "chat" ? "hidden md:block" : ""}`}>
            <Chat roomId={roomId!} userId={user.uid} messages={messages} sendMessage={sendMessage} />
          </div>
        </div>
      </div>

      {/* Mobile Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 md:hidden bg-background/90 backdrop-blur-md border-t border-primary/20 py-3 px-4 z-10">
        <div className="flex items-center justify-between">
          <Button variant="outline" size="sm" className="flex items-center gap-1" onClick={shareRoom}>
            <Share2 className="h-4 w-4" />
            Share
          </Button>
          <Dialog.Root open={isVideoCallOpen} onOpenChange={setIsVideoCallOpen}>
            <Dialog.Trigger asChild>
              <Button variant="outline" size="sm" className="flex items-center gap-1">
                <Video className="h-4 w-4" />
                Video Call
              </Button>
            </Dialog.Trigger>
          </Dialog.Root>
          <Button variant="outline" size="sm" className="flex items-center gap-1" onClick={leaveRoom}>
            <LogOut className="h-4 w-4" />
            Leave
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Room;