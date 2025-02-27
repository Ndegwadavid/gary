// server/src/index.ts
import express from 'express';
import http from 'http';
import https from 'https'; // For production HTTPS option
import { Server, Socket } from 'socket.io';
import dotenv from 'dotenv';
import fs from 'fs'; // For reading certificates

dotenv.config();

const app = express();

// Development: Use HTTP server
const server = http.createServer(app);

// Production HTTPS setup (commented out):
/*
const options = {
  key: fs.readFileSync('/path/to/your-key.pem'), // Replace with your certificate paths
  cert: fs.readFileSync('/path/to/your-cert.pem'),
};
const server = https.createServer(options, app);
*/

const io = new Server(server, {
  cors: {
    origin: '*', // Development: Allow all origins
    // origin: 'https://yourdomain.com', // Production: Specify your frontend domain
    methods: ['GET', 'POST'],
  },
});

interface SyncData {
  roomId: string;
  timestamp: number;
}

interface TrackData {
  roomId: string;
  audioUrl?: string;
  title?: string;
  timestamp?: number;
  isPlaying?: boolean;
}

interface ChatMessage {
  roomId: string;
  message: { userId: string; userName: string; text: string; timestamp: number };
}

interface JoinData {
  roomId: string;
  userName: string;
}

interface UserData {
  roomId?: string;
  userName?: string;
}

const onlineUsers: { [key: string]: UserData } = {};

io.on('connection', (socket: Socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-room', ({ roomId, userName }: JoinData) => {
    onlineUsers[socket.id] = { roomId, userName };
    socket.join(roomId);
    socket.to(roomId).emit('user-joined', { userId: socket.id, userName });
    io.to(roomId).emit('user-list', onlineUsers);
  });

  socket.on('play', ({ roomId, timestamp }: SyncData) => {
    socket.to(roomId).emit('play', timestamp);
  });

  socket.on('pause', ({ roomId, timestamp }: SyncData) => {
    socket.to(roomId).emit('pause', timestamp);
  });

  socket.on('stop', ({ roomId }: { roomId: string }) => {
    socket.to(roomId).emit('stop');
  });

  socket.on('track-changed', ({ roomId, audioUrl, title, timestamp, isPlaying }: TrackData) => {
    socket.to(roomId).emit('track-changed', { audioUrl, title, timestamp, isPlaying });
  });

  socket.on('chat-message', ({ roomId, message }: ChatMessage) => {
    io.to(roomId).emit('chat-message', message);
  });

  socket.on('offer', ({ roomId, offer, from }: { roomId: string; offer: RTCSessionDescriptionInit; from: string }) => {
    socket.to(roomId).emit('offer', { from, offer });
  });

  socket.on('answer', ({ roomId, answer }: { roomId: string; answer: RTCSessionDescriptionInit }) => {
    socket.to(roomId).emit('answer', answer);
  });

  socket.on('ice-candidate', ({ roomId, candidate }: { roomId: string; candidate: RTCIceCandidateInit }) => {
    socket.to(roomId).emit('ice-candidate', candidate);
  });

  socket.on('call-ignored', ({ roomId, from }: { roomId: string; from: string }) => {
    socket.to(roomId).emit('call-ignored', from);
  });

  socket.on('call-cancelled', ({ roomId }: { roomId: string }) => {
    socket.to(roomId).emit('call-cancelled');
  });

  socket.on('disconnect', () => {
    const user = onlineUsers[socket.id];
    if (user?.roomId) {
      delete onlineUsers[socket.id];
      io.to(user.roomId).emit('user-list', onlineUsers); // Fixed: user.roomId is checked
    }
    console.log('User disconnected:', socket.id);
  });

  // Initial user list broadcast to the specific room
  const userRoomId = onlineUsers[socket.id]?.roomId;
  if (userRoomId) {
    io.to(userRoomId).emit('user-list', onlineUsers); // Fixed: Check for undefined
  }
});

const PORT = process.env.PORT || 5000;
server.listen({ port: PORT, host: '0.0.0.0' }, () => console.log(`Server running on port ${PORT}`));

// Production HTTPS listen (commented out):
/*
server.listen(PORT, () => console.log(`Server running on https://yourdomain.com:${PORT}`));
*/