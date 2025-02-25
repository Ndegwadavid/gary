// server/src/index.ts
import express from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // Allow all origins for testing—restrict in production
    methods: ['GET', 'POST'],
  },
});

interface SyncData {
  roomId: string;
  timestamp: number;
}

interface TrackData {
  roomId: string;
  videoId?: string;
  audioUrl?: string;
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
  track?: string;
}

const onlineUsers: { [key: string]: UserData } = {};

io.on('connection', (socket: Socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-room', ({ roomId, userName }: JoinData) => {
    socket.join(roomId);
    onlineUsers[socket.id] = { roomId, userName };
    socket.to(roomId).emit('user-joined', { userId: socket.id, userName });
    io.emit('user-list', onlineUsers);
  });

  socket.on('play', ({ roomId, timestamp }: SyncData) => {
    socket.to(roomId).emit('play', timestamp);
    onlineUsers[socket.id].track = 'Playing a track';
    io.emit('user-list', onlineUsers);
  });

  socket.on('pause', ({ roomId, timestamp }: SyncData) => {
    socket.to(roomId).emit('pause', timestamp);
    io.emit('user-list', onlineUsers);
  });

  socket.on('track-changed', ({ roomId, videoId, audioUrl }: TrackData) => {
    socket.to(roomId).emit('track-changed', { videoId, audioUrl });
  });

  socket.on('chat-message', ({ roomId, message }: ChatMessage) => {
    io.to(roomId).emit('chat-message', message);
  });

  socket.on('offer', ({ roomId, offer }: { roomId: string; offer: RTCSessionDescriptionInit }) => {
    socket.to(roomId).emit('offer', offer);
  });

  socket.on('answer', ({ roomId, answer }: { roomId: string; answer: RTCSessionDescriptionInit }) => {
    socket.to(roomId).emit('answer', answer);
  });

  socket.on('ice-candidate', ({ roomId, candidate }: { roomId: string; candidate: RTCIceCandidateInit }) => {
    socket.to(roomId).emit('ice-candidate', candidate);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    delete onlineUsers[socket.id];
    io.emit('user-list', onlineUsers);
  });

  io.emit('user-list', onlineUsers);
});

const PORT = process.env.PORT || 5000;
server.listen({ port: PORT, host: '0.0.0.0' }, () => console.log(`Server running on port ${PORT}`));