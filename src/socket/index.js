const initSocket = (io) => {
  io.on("connection", (socket) => {
    console.log("New user connected:", socket.id);

    // Join a specific mind map room
    socket.on("join-map", (mapId) => {
      socket.join(mapId);
      socket.mapId = mapId; // Store the current map ID on the socket
      console.log(`Socket ${socket.id} joined map ${mapId}`);
    });

    // Leave a specific mind map room
    socket.on("leave-map", (mapId) => {
      socket.leave(mapId);
      if (socket.mapId === mapId) socket.mapId = null;
      socket.to(mapId).emit("user-disconnected", socket.id);
      console.log(`Socket ${socket.id} left map ${mapId}`);
    });

    // --- NODE EVENTS ---
    socket.on("node-added", ({ mapId, node }) => {
      socket.to(mapId).emit("node-added", node);
    });

    socket.on("node-updated", ({ mapId, node }) => {
      socket.to(mapId).emit("node-updated", node);
    });

    socket.on("node-deleted", ({ mapId, nodeId }) => {
      socket.to(mapId).emit("node-deleted", nodeId);
    });

    // Real-time drag updates (for smoother UX before saving to DB)
    socket.on("node-dragged", ({ mapId, nodeId, position }) => {
      socket.to(mapId).emit("node-dragged", { nodeId, position });
    });

    // --- PRESENCE (Bonus features) ---
    // Broadcast user's cursor position or selected node
    socket.on("cursor-moved", ({ mapId, cursor }) => {
      // cursor object could have { id: socket.id, x, y, name, color }
      socket.to(mapId).emit("cursor-moved", { ...cursor, id: socket.id });
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
      // Broadcast disconnect to all rooms this user is in to remove their cursor
      if (socket.mapId) {
        socket.to(socket.mapId).emit("user-disconnected", socket.id);
      }
    });
  });
};

module.exports = initSocket;
