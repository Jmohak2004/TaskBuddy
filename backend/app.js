const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const db = require("./config/mongoose");
require("dotenv").config();

const authRoutes = require("./routes/authRouter");
const taskRoutes = require("./routes/taskRouter");
const roomRoutes = require("./routes/roomRouter");

const app = express();
const server = http.createServer(app);

// Production Configuration
const ORIGIN = process.env.NODE_ENV === 'production'
    ? "https://task-buddy-4xix.vercel.app/"
    : "http://localhost:5173";

// Socket.IO Setup
const io = new Server(server, {
    cors: {
        origin: ORIGIN,
        credentials: true
    }
});

// Database Connection
db.connectDB();

// Global Middlewares
app.use(cors({
    origin: ORIGIN,
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Inject IO into requests
app.use((req, res, next) => {
    req.io = io;
    next();
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/rooms", roomRoutes);

// Socket Connection Handler
io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);
    socket.on("disconnect", () => console.log("Client disconnected"));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`NexGen Backend running on port ${PORT}`);
});
