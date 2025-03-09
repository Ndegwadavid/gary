import express from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'https://gary-client.vercel.app',
    methods: ['GET', 'POST'],
  },
});

interface SyncData {
  roomId: string;
  timestamp: number;
}

interface TrackData {
  roomId: string;
  track: {
    audioUrl?: string;
    title?: string;
    timestamp?: number;
    isPlaying?: boolean;
    source?: "youtube" | "jamendo";
  };
}

interface ChatMessage {
  roomId: string;
  message: { userId: string; userName: string; text: string; timestamp: number };
}

interface JoinData {
  roomId: string;
  userId: string;
  userName: string;
}

interface TypingData {
  roomId: string;
  userId: string;
}

interface UserData {
  roomId?: string;
  userName?: string;
  uid?: string;
}

interface RoomState {
  currentTrack: {
    audioUrl?: string;
    title?: string;
    timestamp?: number;
    isPlaying?: boolean;
    source?: "youtube" | "jamendo";
  };
}

const onlineUsers: { [key: string]: UserData } = {};
const rooms: { [key: string]: RoomState } = {};

io.on('connection', (socket: Socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-room', ({ roomId, userId, userName }: JoinData) => {
    socket.join(roomId);
    onlineUsers[socket.id] = { roomId, userName, uid: userId };
    socket.to(roomId).emit('user-joined', { userId, userName });
    io.to(roomId).emit('user-list', onlineUsers);

    // Send current room state to the new user
    if (rooms[roomId]?.currentTrack) {
      socket.emit('track-changed', rooms[roomId].currentTrack);
      if (rooms[roomId].currentTrack.isPlaying) {
        socket.emit('play', rooms[roomId].currentTrack.timestamp || 0);
      } else {
        socket.emit('pause', rooms[roomId].currentTrack.timestamp || 0);
      }
    }
  });

  socket.on('request-user-list', ({ roomId }: { roomId: string }) => {
    io.to(roomId).emit('user-list', onlineUsers);
  });

  socket.on('play', ({ roomId, timestamp }: SyncData) => {
    if (rooms[roomId]) {
      rooms[roomId].currentTrack.timestamp = timestamp;
      rooms[roomId].currentTrack.isPlaying = true;
    }
    socket.to(roomId).emit('play', timestamp);
  });

  socket.on('pause', ({ roomId, timestamp }: SyncData) => {
    if (rooms[roomId]) {
      rooms[roomId].currentTrack.timestamp = timestamp;
      rooms[roomId].currentTrack.isPlaying = false;
    }
    socket.to(roomId).emit('pause', timestamp);
  });

  socket.on('stop', ({ roomId }: { roomId: string }) => {
    if (rooms[roomId]) {
      rooms[roomId].currentTrack.timestamp = 0;
      rooms[roomId].currentTrack.isPlaying = false;
    }
    socket.to(roomId).emit('stop');
  });

  socket.on('track-changed', ({ roomId, track }: TrackData) => {
    rooms[roomId] = rooms[roomId] || { currentTrack: {} };
    rooms[roomId].currentTrack = { ...track };
    io.to(roomId).emit('track-changed', track);
  });

  socket.on('chat-message', ({ roomId, message }: ChatMessage) => {
    io.to(roomId).emit('chat-message', message);
  });

  socket.on('typing', ({ roomId, userId }: TypingData) => {
    socket.to(roomId).emit('typing', { userId });
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

  socket.on('leave-room', ({ roomId, userId }: { roomId: string; userId: string }) => {
    socket.leave(roomId);
    delete onlineUsers[socket.id];
    io.to(roomId).emit('user-list', onlineUsers);
    // Optionally clear room state if no users remain
    if (!Object.values(onlineUsers).some(user => user.roomId === roomId)) {
      delete rooms[roomId];
    }
  });

  socket.on('disconnect', () => {
    const user = onlineUsers[socket.id];
    if (user?.roomId) {
      delete onlineUsers[socket.id];
      io.to(user.roomId).emit('user-list', onlineUsers);
      if (!Object.values(onlineUsers).some(u => u.roomId === user.roomId)) {
        delete rooms[user.roomId];
      }
    }
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen({ port: PORT, host: '0.0.0.0' }, () => console.log(`Server running on port ${PORT}`));
// Production HTTPS listen (commented out):
/*
server.listen(PORT, () => console.log(`Server running on https://yourdomain.com:${PORT}`));
*/