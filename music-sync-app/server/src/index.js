const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Basic route
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Server is running" });
});

// Socket.io connection
io.on("connection", (socket) => {
  console.log("New client connected:", socket.id);
  
  // Join room
  socket.on("join-room", (roomId) => {
    socket.join(roomId);
    console.log(`User ${socket.id} joined room ${roomId}`);
    
    // Notify others in the room
    socket.to(roomId).emit("user-joined", { userId: socket.id });
  });
  
  // Chat message
  socket.on("send-message", (data) => {
    io.to(data.roomId).emit("new-message", {
      ...data,
      timestamp: new Date().toISOString()
    });
  });
  
  // Music control events
  socket.on("play", (data) => {
    socket.to(data.roomId).emit("play", data);
  });
  
  socket.on("pause", (data) => {
    socket.to(data.roomId).emit("pause", data);
  });
  
  socket.on("seek", (data) => {
    socket.to(data.roomId).emit("seek", data);
  });
  
  // Disconnect
  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});