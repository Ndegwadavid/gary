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
    origin: '*',
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
    io.emit('user-list', onlineUsers); // Emit full list to ensure sync
  });

  socket.on('play', ({ roomId, timestamp }: SyncData) => {
    socket.to(roomId).emit('play', timestamp);
    io.emit('user-list', onlineUsers);
  });

  socket.on('pause', ({ roomId, timestamp }: SyncData) => {
    socket.to(roomId).emit('pause', timestamp);
    io.emit('user-list', onlineUsers);
  });

  socket.on('stop', ({ roomId }: { roomId: string }) => {
    socket.to(roomId).emit('stop');
    io.emit('user-list', onlineUsers);
  });

  socket.on('track-changed', ({ roomId, audioUrl, title }: TrackData) => {
    socket.to(roomId).emit('track-changed', { audioUrl, title });
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

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    delete onlineUsers[socket.id];
    io.emit('user-list', onlineUsers);
  });

  io.emit('user-list', onlineUsers);
});

const PORT = process.env.PORT || 5000;
server.listen({ port: PORT, host: '0.0.0.0' }, () => console.log(`Server running on port ${PORT}`));