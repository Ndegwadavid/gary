"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import io, { type Socket } from "socket.io-client";
import { Peer } from "peerjs";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { User } from "firebase/auth"; // Adjust import based on your setup
import Chat from "../components/Chat";

interface RaveProps {
  user: User | null;
}

interface Message {
  id: string;
  userId: string;
  userName: string;
  text: string;
  timestamp: number;
}

const Rave = ({ user }: RaveProps) => {
  const { roomId } = useParams<{ roomId: string }>();
  const [userId, setUserId] = useState<string | null>(null);
  const [peers, setPeers] = useState<{ [key: string]: { call: any } }>({});
  const [incomingCall, setIncomingCall] = useState<{ from: string; offer: RTCSessionDescriptionInit } | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<{ [key: string]: HTMLVideoElement | null }>({});
  const socket = useRef<Socket | null>(null);
  const peerInstance = useRef<Peer | null>(null);
  const navigate = useNavigate();

  // Define connectToNewUser outside useEffect with useCallback
  const connectToNewUser = useCallback(
    (userId: string, stream: MediaStream | null) => {
      if (!stream || !peerInstance.current) return;

      const call = peerInstance.current.call(userId, stream);
      if (!call) return;

      call.on("stream", (remoteStream: MediaStream) => {
        if (remoteVideoRef.current[userId]) {
          remoteVideoRef.current[userId]!.srcObject = remoteStream;
        }
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
    const generateUserId = () => {
      return Math.random().toString(36).substring(2, 15);
    };

    const newUserId = user?.uid || generateUserId();
    setUserId(newUserId);

    socket.current = io(process.env.REACT_APP_SERVER_URL || "http://localhost:5000");

    const initializePeer = () => {
      peerInstance.current = new Peer(newUserId);

      peerInstance.current.on("call", (call) => {
        navigator.mediaDevices
          .getUserMedia({ video: true, audio: true })
          .then((stream) => {
            setLocalStream(stream);
            if (localVideoRef.current) {
              localVideoRef.current.srcObject = stream;
            }
            call.answer(stream);
            call.on("stream", (remoteStream: MediaStream) => {
              if (remoteVideoRef.current[call.peer]) {
                remoteVideoRef.current[call.peer]!.srcObject = remoteStream;
              }
            });
          })
          .catch((err) => {
            console.error("Failed to get local stream", err);
            toast.error("Failed to get local stream");
          });
      });
    };

    initializePeer();

    socket.current.on("connect", () => {
      if (roomId && newUserId) {
        socket.current?.emit("join-room", { roomId, userId: newUserId, userName: user?.displayName || "Anonymous" });
      }
    });

    socket.current.on("user-connected", (userId: string) => {
      connectToNewUser(userId, localStream);
    });

    socket.current.on("offer", (data: { from: string; offer: RTCSessionDescriptionInit }) => {
      setIncomingCall(data);
      toast(`Incoming call from ${data.from}`);
    });

    socket.current.on("answer", (data: { from: string; answer: RTCSessionDescriptionInit }) => {
      if (peers[data.from] && peers[data.from].call) {
        peers[data.from].call.peerConnection.setRemoteDescription(data.answer);
      }
    });

    socket.current.on("ice-candidate", (data: { from: string; candidate: RTCIceCandidateInit }) => {
      if (peers[data.from] && peers[data.from].call) {
        peers[data.from].call.peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
      }
    });

    socket.current.on("user-disconnected", (userId: string) => {
      if (peers[userId]) {
        peers[userId].call.close();
        const updatedPeers = { ...peers };
        delete updatedPeers[userId];
        setPeers(updatedPeers);
      }
    });

    socket.current.on("chat-message", (message: { userId: string; userName: string; text: string; timestamp: number }) => {
      setMessages((prev) => [
        ...prev,
        {
          id: `${message.userId}-${message.timestamp}`,
          userId: message.userId,
          userName: message.userName,
          text: message.text,
          timestamp: message.timestamp,
        },
      ]);
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

    return () => {
      socket.current?.disconnect();
      peerInstance.current?.destroy();
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [roomId, navigate, user, connectToNewUser]); // Add connectToNewUser to dependencies

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

  const handleJoinRoom = async () => {
    if (!roomId) {
      toast.error("Room ID is required");
      return;
    }

    try {
      socket.current?.emit("join-room", { roomId, userId, userName: user?.displayName || "Anonymous" });
    } catch (error) {
      console.error("Join room error:", error);
      toast.error("Error joining rave: " + (error instanceof Error ? error.message : "Unknown error"));
      setTimeout(() => navigate("/rooms"), 2000);
    }
  };

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
            // Reconnect peers with the new stream
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

  const sendMessage = (text: string, file?: any, replyTo?: string) => {
    if (!text.trim() || !roomId || !userId) return;

    const message = {
      roomId,
      message: {
        userId,
        userName: user?.displayName || "Anonymous",
        text,
        timestamp: Date.now(),
      },
    };
    socket.current?.emit("chat-message", message);
  };

  return (
    <div className="container flex flex-col h-screen">
      <h1 className="text-2xl font-bold mb-4">Rave Room: {roomId}</h1>
      <div className="flex flex-grow gap-4">
        {/* Video Section */}
        <div className="flex flex-col w-1/2">
          <video ref={localVideoRef} autoPlay muted className="local-video w-full h-64 object-cover rounded" />
          <div className="mt-2 flex gap-2">
            <button
              onClick={toggleCamera}
              className={`px-4 py-2 rounded text-white ${isCameraOn ? "bg-red-500" : "bg-green-500"}`}
            >
              {isCameraOn ? "Turn Off Camera" : "Turn On Camera"}
            </button>
          </div>
          <div className="remote-videos mt-4 grid grid-cols-2 gap-2">
            {Object.keys(peers).map((peerId) => (
              <video
                key={peerId}
                ref={(el) => {
                  remoteVideoRef.current[peerId] = el;
                }}
                autoPlay
                className="remote-video w-full h-48 object-cover rounded"
              />
            ))}
          </div>
        </div>
        {/* Chat Section */}
        <div className="w-1/2 h-full">
          {roomId && userId && (
            <Chat
              roomId={roomId}
              userId={userId}
              messages={messages}
              sendMessage={sendMessage}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default Rave;