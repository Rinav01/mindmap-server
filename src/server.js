const express = require("express");
const cors = require("cors");
require("dotenv").config({ override: true });
require("./config/db");
const { globalLimiter, authLimiter, aiLimiter } = require("./middleware/rateLimiter");

const http = require("http");
const { Server } = require("socket.io");
const initSocket = require("./socket/index");

const app = express();

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Adjust this in production
    methods: ["GET", "POST", "PUT", "DELETE"],
  },
});

const isProd = process.env.NODE_ENV === "production";
const noop = (req, res, next) => next();

app.set("io", io);
app.use(cors());
app.use(express.json());
app.use(isProd ? globalLimiter : noop);

// Health check endpoint for Render
app.get("/health", (req, res) => res.status(200).json({ status: "ok" }));

const { protect } = require("./middleware/authMiddleware");

app.use("/api/auth", isProd ? authLimiter : noop, require("./routes/authRoutes"));
app.use("/api/mindmaps", protect, require("./routes/mindmapRoutes"));
app.use("/api", protect, require("./routes/versionRoutes"));
app.use("/api/templates", require("./routes/templateRoutes"));
app.use("/api/ai", isProd ? aiLimiter : noop, require("./routes/aiRoutes"));

// Initialize sockets
initSocket(io);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

