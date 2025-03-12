"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import io, { type Socket } from "socket.io-client";
import { Peer, type MediaConnection } from "peerjs";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { User } from "firebase/auth";
import {
  Video,
  Mic,
  MicOff,
  Share2,
  Users,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  X,
  Music,
  Sparkles,
} from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import * as CollapsiblePrimitive from "@radix-ui/react-collapsible";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "../components/ui/tab";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../components/ui/tooltip";
import { Input } from "../components/ui/input";
import Chat from "../components/Chat";

const Collapsible = CollapsiblePrimitive.Root;
const CollapsibleTrigger = CollapsiblePrimitive.Trigger;
const CollapsibleContent = CollapsiblePrimitive.Content;

interface RaveProps {
  user: User | null;
}

interface Reaction {
  emoji: string;
  userId: string;
  userName: string;
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

interface Song {
  url: string;
  title: string;
  requester: string;
}

const getSocketUrl = () => {
  return process.env.NODE_ENV === "production" ? "https://gary-server.onrender.com" : "http://localhost:5000";
};

const Rave = ({ user }: RaveProps) => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [peers, setPeers] = useState<{ [key: string]: { call: MediaConnection; stream?: MediaStream } }>({});
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [participants, setParticipants] = useState<{ uid: string; name: string }[]>([]);
  const [roomName, setRoomName] = useState("Rave Party");
  const [activeTab, setActiveTab] = useState("video");
  const [showParticipants, setShowParticipants] = useState(false);
  const [songQueue, setSongQueue] = useState<Song[]>([]); // New: Song queue
  const [currentSong, setCurrentSong] = useState<Song | null>(null); // New: Current song
  const [spotlightUser, setSpotlightUser] = useState<string | null>(null); // New: Spotlight feature
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<{ [key: string]: HTMLVideoElement | null }>({});
  const audioRef = useRef<HTMLAudioElement>(null);
  const socket = useRef<Socket | null>(null);
  const peerInstance = useRef<Peer | null>(null);

  const connectToNewUser = useCallback(
    (userId: string, stream: MediaStream | null) => {
      if (!stream || !peerInstance.current) return;

      const call = peerInstance.current.call(userId, stream);
      if (!call) return;

      call.on("stream", (remoteStream: MediaStream) => {
        if (remoteVideoRef.current[userId]) {
          remoteVideoRef.current[userId]!.srcObject = remoteStream;
        }
        setPeers((prev) => ({ ...prev, [userId]: { ...prev[userId], stream: remoteStream } }));
      });

      call.on("close", () => {
        if (remoteVideoRef.current[userId]) {
          remoteVideoRef.current[userId]!.srcObject = null;
        }
      });

      call.peerConnection.onicecandidate = (event: RTCPeerConnectionIceEvent) => {
        if (event.candidate) {
          socket.current?.emit("ice-candidate", { to: userId, candidate: event.candidate });
        }
      };

      setPeers((prevPeers) => ({
        ...prevPeers,
        [userId]: { call },
      }));
    },
    []
  );

  useEffect(() => {
    const generateUserId = () => Math.random().toString(36).substring(2, 15);
    const newUserId = user?.uid || generateUserId();
    setUserId(newUserId);

    socket.current = io(getSocketUrl(), { transports: ["websocket", "polling"] });

    const initializePeer = () => {
      peerInstance.current = new Peer(newUserId);

      peerInstance.current.on("call", (call) => {
        if (!localStream) return;
        call.answer(localStream);
        call.on("stream", (remoteStream: MediaStream) => {
          if (remoteVideoRef.current[call.peer]) {
            remoteVideoRef.current[call.peer]!.srcObject = remoteStream;
          }
          setPeers((prev) => ({ ...prev, [call.peer]: { call, stream: remoteStream } }));
        });
      });
    };

    initializePeer();

    socket.current.on("connect", () => {
      if (roomId && newUserId) {
        socket.current?.emit("join-room", {
          roomId,
          userId: newUserId,
          userName: user?.displayName || "Anonymous",
        });
      }
    });

    socket.current.on("user-connected", (userId: string) => {
      connectToNewUser(userId, localStream);
    });

    socket.current.on("user-list", (users: { [key: string]: { roomId?: string; userName?: string; uid?: string } }) => {
      const roomUsers = Object.values(users)
        .filter((u) => u.roomId === roomId && u.uid)
        .map((u) => ({ uid: u.uid!, name: u.userName || "Anonymous" }));
      setParticipants(roomUsers);
    });

    socket.current.on("user-joined", ({ userName, userId }) => {
      if (userId !== newUserId) {
        toast.success(`${userName} has joined the rave!`, { autoClose: 3000 });
      }
      socket.current?.emit("request-user-list", { roomId });
    });

    socket.current.on("room-info", (info: { name: string }) => {
      if (info.name) setRoomName(info.name);
    });

    socket.current.on("chat-message", (message: Message) => {
      if (!message.id) {
        message.id = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      }
      setMessages((prev) => [...prev, message]);
    });

    socket.current.on("song-request", (song: Song) => {
      setSongQueue((prev) => [...prev, song]);
      if (!currentSong) {
        setCurrentSong(song);
        if (audioRef.current) {
          audioRef.current.src = song.url;
          audioRef.current.play();
        }
      }
    });

    socket.current.on("user-disconnected", (userId: string) => {
      if (peers[userId]) {
        peers[userId].call.close();
        const updatedPeers = { ...peers };
        delete updatedPeers[userId];
        setPeers(updatedPeers);
      }
      setParticipants((prev) => prev.filter((p) => p.uid !== userId));
      if (spotlightUser === userId) setSpotlightUser(null);
    });

    const enableStream = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setLocalStream(stream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error("Could not get user media", error);
        toast.error("Could not get user media");
      }
    };

    enableStream();
    socket.current.emit("request-user-list", { roomId });

    return () => {
      socket.current?.disconnect();
      peerInstance.current?.destroy();
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [roomId, user, navigate, connectToNewUser]);

  useEffect(() => {
    if (socket.current) {
      socket.current.on("disconnect", () => {
        toast.error("Disconnected from server");
        setTimeout(() => navigate("/rooms"), 2000);
      });

      socket.current.on("room-full", () => {
        toast.error("Room is full. Redirecting...");
        setTimeout(() => navigate("/rooms"), 2000);
      });

      socket.current.on("invalid-room", () => {
        toast.error("Invalid room ID. Redirecting...");
        setTimeout(() => navigate("/rooms"), 2000);
      });
    }
  }, [navigate]);

  const toggleCamera = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (isCameraOn) {
        videoTrack.stop();
        setIsCameraOn(false);
      } else {
        navigator.mediaDevices
          .getUserMedia({ video: true, audio: true })
          .then((newStream) => {
            setLocalStream(newStream);
            if (localVideoRef.current) {
              localVideoRef.current.srcObject = newStream;
            }
            Object.keys(peers).forEach((peerId) => {
              connectToNewUser(peerId, newStream);
            });
            setIsCameraOn(true);
          })
          .catch((err) => {
            console.error("Failed to restart camera", err);
            toast.error("Failed to restart camera");
          });
      }
    }
  };

  const toggleMute = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      audioTrack.enabled = !audioTrack.enabled;
      setIsMuted(!audioTrack.enabled);
    }
  };

  const sendMessage = useCallback(
    (text: string, file?: MessageFile, replyTo?: string) => {
      if (!text.trim() || !roomId || !userId) return;

      const messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const message = {
        id: messageId,
        userId,
        userName: user?.displayName || "Anonymous",
        text,
        timestamp: Date.now(),
        file,
        replyTo,
        readBy: [userId],
      };
      socket.current?.emit("chat-message", { roomId, message });
    },
    [roomId, userId, user]
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
    if (socket.current && roomId && userId) {
      socket.current.emit("leave-room", { roomId, userId });
    }
    navigate("/rooms");
  };

  const requestSong = (url: string, title: string) => {
    const song = { url, title, requester: user?.displayName || "Anonymous" };
    socket.current?.emit("song-request", { roomId, song });
  };

  const spotlightParticipant = (uid: string) => {
    setSpotlightUser(uid);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/90 to-primary/20 pb-20 md:pb-6">
      {/* Header */}
      <header className="sticky top-0 z-10 backdrop-blur-md bg-background/80 border-b border-primary/10 shadow-sm">
        <div className="container mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/rooms")} className="text-white">
              <X className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-white truncate max-w-[180px] sm:max-w-xs">{roomName}</h1>
              <div className="flex items-center gap-2">
                <p className="text-xs text-muted-foreground">Room ID: {roomId}</p>
                <Badge variant="outline" className="bg-green-500/20 text-green-300 border-green-500/30">
                  Live ({participants.length})
                </Badge>
              </div>
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
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Share Room</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Button variant="ghost" size="icon" onClick={leaveRoom} className="text-white hover:bg-primary/20">
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto max-w-6xl px-4 py-6">
        {/* Mobile Tabs */}
        <div className="md:hidden mb-6">
          <Tabs defaultValue="video" onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-3 w-full bg-primary/10 rounded-lg p-1">
              <TabsTrigger value="video" className="flex items-center gap-2 data-[state=active]:bg-primary/20 rounded">
                <Video className="h-4 w-4" />
                <span>Video</span>
              </TabsTrigger>
              <TabsTrigger value="chat" className="flex items-center gap-2 data-[state=active]:bg-primary/20 rounded">
                <MessageSquare className="h-4 w-4" />
                <span>Chat</span>
              </TabsTrigger>
              <TabsTrigger value="dj" className="flex items-center gap-2 data-[state=active]:bg-primary/20 rounded">
                <Music className="h-4 w-4" />
                <span>DJ</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Video Section */}
          <div className={`md:col-span-2 ${activeTab !== "video" && activeTab !== "dj" ? "hidden md:block" : ""}`}>
            <Card className="shadow-lg border-primary/20 backdrop-blur-md bg-card/90">
              <CardHeader>
                <CardTitle className="flex items-center text-lg text-white">
                  <Video className="h-5 w-5 text-primary mr-2" />
                  Rave Video Streams
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Local Video */}
                  <div
                    className={`relative rounded-lg overflow-hidden aspect-video bg-black ${
                      spotlightUser === userId ? "border-4 border-yellow-500" : ""
                    }`}
                  >
                    <video
                      ref={localVideoRef}
                      autoPlay
                      muted
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-2 left-2 text-xs bg-black/60 text-white px-2 py-1 rounded">
                      {user?.displayName || "You"}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={toggleCamera}
                      variant={isCameraOn ? "outline" : "default"}
                      className="flex-1"
                    >
                      {isCameraOn ? "Turn Off Camera" : "Turn On Camera"}
                    </Button>
                    <Button
                      onClick={toggleMute}
                      variant={isMuted ? "default" : "outline"}
                      className="flex-1"
                    >
                      {isMuted ? <MicOff className="h-4 w-4 mr-2" /> : <Mic className="h-4 w-4 mr-2" />}
                      {isMuted ? "Unmute" : "Mute"}
                    </Button>
                  </div>

                  {/* Remote Videos */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-h-[60vh] overflow-y-auto">
                    {Object.keys(peers).map((peerId) => (
                      <div
                        key={peerId}
                        className={`relative rounded-lg overflow-hidden aspect-video bg-black ${
                          spotlightUser === peerId ? "border-4 border-yellow-500" : ""
                        }`}
                      >
                        <video
                          ref={(el) => {
                            remoteVideoRef.current[peerId] = el;
                          }}
                          autoPlay
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute bottom-2 left-2 text-xs bg-black/60 text-white px-2 py-1 rounded">
                          {participants.find((p) => p.uid === peerId)?.name || peerId}
                        </div>
                        <Button
                          size="sm"
                          className="absolute top-2 right-2 bg-yellow-500 hover:bg-yellow-600"
                          onClick={() => spotlightParticipant(peerId)}
                        >
                          <Sparkles className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Participants */}
            <div className="mt-6">
              <Collapsible open={showParticipants} onOpenChange={setShowParticipants} className="md:hidden">
                <Card className="shadow-lg border-primary/20 backdrop-blur-md bg-card/90">
                  <CardHeader className="pb-2 flex flex-row items-center justify-between">
                    <CardTitle className="flex items-center text-lg text-white">
                      <Users className="h-5 w-5 text-primary mr-2" />
                      Participants ({participants.length})
                    </CardTitle>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm">
                        {showParticipants ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
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

            {/* DJ Booth */}
            {activeTab === "dj" && (
              <Card className="mt-6 shadow-lg border-primary/20 backdrop-blur-md bg-card/90">
                <CardHeader>
                  <CardTitle className="flex items-center text-lg text-white">
                    <Music className="h-5 w-5 text-primary mr-2" />
                    DJ Booth
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <audio ref={audioRef} controls className="w-full mb-4" />
                  {currentSong && (
                    <p className="text-white mb-2">
                      Now Playing: {currentSong.title} (Requested by {currentSong.requester})
                    </p>
                  )}
                  <div className="space-y-2">
                    <Input
                      placeholder="Paste YouTube/SoundCloud URL"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          requestSong(e.currentTarget.value, "User Song");
                          e.currentTarget.value = "";
                        }
                      }}
                      className="bg-white/10 border-white/20 text-white"
                    />
                    <div className="max-h-40 overflow-y-auto">
                      {songQueue.map((song, index) => (
                        <p key={index} className="text-white/80 text-sm">
                          {index + 1}. {song.title} - {song.requester}
                        </p>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Chat Section */}
          <div
            className={`${activeTab !== "chat" ? "hidden md:block" : ""} md:resize md:overflow-auto`}
            style={{ minWidth: "200px", maxWidth: "50%" }}
          >
            {roomId && userId && (
              <Card className="shadow-lg border-primary/20 backdrop-blur-md bg-card/90 h-full">
                <CardHeader>
                  <CardTitle className="flex items-center text-lg text-white">
                    <MessageSquare className="h-5 w-5 text-primary mr-2" />
                    Chat
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Chat roomId={roomId} userId={userId} messages={messages} sendMessage={sendMessage} />
                </CardContent>
              </Card>
            )}
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
          <Button variant="outline" size="sm" className="flex items-center gap-1" onClick={leaveRoom}>
            <X className="h-4 w-4" />
            Leave
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Rave;