import express from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:3000', // Allow client to connect
    methods: ['GET', 'POST'],
  },
});

interface SyncData {
  roomId: string;
  timestamp: number;
}

interface ChatMessage {
  roomId: string;
  message: string;
}

const onlineUsers: { [key: string]: { roomId?: string; track?: string } } = {};

io.on('connection', (socket: Socket) => {
  console.log('User connected:', socket.id);
  onlineUsers[socket.id] = {};

  socket.on('join-room', (roomId: string) => {
    socket.join(roomId);
    onlineUsers[socket.id].roomId = roomId;
    socket.to(roomId).emit('user-joined', socket.id);
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

  socket.on('chat-message', ({ roomId, message }: ChatMessage) => {
    io.to(roomId).emit('chat-message', { user: socket.id, message });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    delete onlineUsers[socket.id];
    io.emit('user-list', onlineUsers);
  });

  io.emit('user-list', onlineUsers);
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));