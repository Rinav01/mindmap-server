// Room presence: mapId -> Map<socketId, { name, color }>
const rooms = new Map();

const initSocket = (io) => {
  io.on("connection", (socket) => {
    console.log("New user connected:", socket.id);

    // Join a specific mind map room
    socket.on("join-map", ({ mapId, user }) => {
      socket.join(mapId);
      socket.mapId = mapId;
      socket.userInfo = user || { name: "Anonymous", color: "#3b82f6" };

      // Initialize room if needed
      if (!rooms.has(mapId)) rooms.set(mapId, new Map());
      const room = rooms.get(mapId);
      room.set(socket.id, socket.userInfo);

      console.log(`Socket ${socket.id} (${socket.userInfo.name}) joined map ${mapId}`);

      // Send the full user list to the joining user
      const userList = {};
      room.forEach((info, sid) => { userList[sid] = info; });
      socket.emit("user-list", userList);

      // Broadcast to others that a new user joined
      socket.to(mapId).emit("user-joined", { id: socket.id, ...socket.userInfo });
    });

    // Leave a specific mind map room
    socket.on("leave-map", (mapId) => {
      socket.leave(mapId);

      // Remove from room presence
      if (rooms.has(mapId)) {
        rooms.get(mapId).delete(socket.id);
        if (rooms.get(mapId).size === 0) rooms.delete(mapId);
      }

      socket.to(mapId).emit("user-disconnected", socket.id);
      if (socket.mapId === mapId) socket.mapId = null;
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

    socket.on("node-dragged", ({ mapId, nodeId, position }) => {
      socket.to(mapId).emit("node-dragged", { nodeId, position });
    });

    // --- SELECTION ---
    socket.on("selection-update", ({ mapId, nodeIds, user }) => {
      socket.to(mapId).emit("selection-update", { userId: socket.id, nodeIds, user });
    });

    // --- EDITING AWARENESS ---
    socket.on("node-editing", ({ mapId, nodeId, user }) => {
      socket.editingNodeId = nodeId;
      socket.to(mapId).emit("node-editing", { nodeId, user });
    });

    socket.on("node-editing-stopped", ({ mapId, nodeId }) => {
      if (socket.editingNodeId === nodeId) {
        socket.editingNodeId = null;
      }
      socket.to(mapId).emit("node-editing-stopped", { nodeId });
    });

    // --- SNAPSHOTS (VERSIONS) ---
    socket.on("map-versions-changed", (mapId) => {
      socket.to(mapId).emit("map-versions-changed");
    });

    socket.on("map-restored", ({ mapId, nodes, versionId }) => {
      socket.to(mapId).emit("map-restored", { nodes, versionId });
    });

    // --- PRESENCE ---
    socket.on("cursor-moved", ({ mapId, cursor }) => {
      socket.to(mapId).emit("cursor-moved", { ...cursor, id: socket.id });
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
      if (socket.mapId) {
        if (socket.editingNodeId) {
          socket.to(socket.mapId).emit("node-editing-stopped", { nodeId: socket.editingNodeId });
        }

        // Clear remote selection for this user
        socket.to(socket.mapId).emit("selection-update", { userId: socket.id, nodeIds: [], user: socket.userInfo });

        socket.to(socket.mapId).emit("user-disconnected", socket.id);

        // Remove from room presence
        if (rooms.has(socket.mapId)) {
          rooms.get(socket.mapId).delete(socket.id);
          if (rooms.get(socket.mapId).size === 0) rooms.delete(socket.mapId);
        }
      }
    });
  });
};

module.exports = initSocket;
