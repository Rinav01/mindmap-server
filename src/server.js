const express = require("express");
const cors = require("cors");
require("dotenv").config();
require("./config/db");

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

app.use(cors());
app.use(express.json());

app.use("/api/mindmaps", require("./routes/mindmapRoutes"));
app.use("/api", require("./routes/versionRoutes"));

// Initialize sockets
initSocket(io);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
