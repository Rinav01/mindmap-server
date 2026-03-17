const MindMap = require("../models/MindMap");
const Node = require("../models/Node");
const ActivityLog = require("../models/ActivityLog");
const { canEditMap, isMapOwner } = require("../services/mapPermissionService");
const MapMember = require("../models/MapMember");
const ProcessedOperation = require("../models/ProcessedOperation");

// GET ALL
exports.getMaps = async (req, res) => {
  try {
    const maps = await MindMap.aggregate([
      { $match: { deletedAt: null, $or: [{ userId: req.user._id }, { collaborators: req.user._id }] } },
      {
        $lookup: {
          from: "nodes",
          localField: "_id",
          foreignField: "mindMapId",
          as: "nodes",
        },
      },
      {
        $addFields: {
          nodeCount: { $size: "$nodes" },
        },
      },
      { $project: { nodes: 0 } }, // remove the full nodes array
      { $sort: { updatedAt: -1 } },
    ]);

    res.json(maps);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

// GET SINGLE MAP
exports.getMap = async (req, res) => {
  try {
    const map = await MindMap.findOne({ _id: req.params.id, $or: [{ userId: req.user._id }, { collaborators: req.user._id }] });
    if (!map) return res.status(404).json({ error: "Map not found" });
    res.json(map);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

// CREATE
exports.createMap = async (req, res) => {
  try {
    const map = await MindMap.create({
      title: req.body.title || "Untitled Map",
      userId: req.user._id,
    });

    // Automatically assign OWNER role
    await MapMember.create({
      mindMapId: map._id,
      userId: req.user._id,
      role: "OWNER",
    });

    // Create root node
    await Node.create({
      mindMapId: map._id,
      text: "Central Idea",
      x: 0,
      y: 0,
    });

    res.status(201).json(map);
  } catch (err) {
    console.error("Error creating map:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// UPDATE MAP TITLE
exports.updateMapTitle = async (req, res) => {
  try {
    const isOwner = await isMapOwner(req.user._id, req.params.id);
    if (!isOwner) return res.status(403).json({ error: "Only the map owner can change the title." });

    const map = await MindMap.findByIdAndUpdate(
      req.params.id,
      { title: req.body.title },
      { returnDocument: 'after' }
    );
    if (!map) return res.status(404).json({ error: "Map not found" });
    res.json(map);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

// TOGGLE STAR
exports.toggleStar = async (req, res) => {
  try {
    const map = await MindMap.findOne({ _id: req.params.id, $or: [{ userId: req.user._id }, { collaborators: req.user._id }] });
    if (!map) return res.status(404).json({ error: "Map not found" });

    map.isStarred = !map.isStarred;
    await map.save();

    res.json(map);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

// SOFT DELETE
exports.deleteMap = async (req, res) => {
  try {
    const isOwner = await isMapOwner(req.user._id, req.params.id);
    if (!isOwner) return res.status(403).json({ error: "Only the map owner can delete it." });

    const map = await MindMap.findById(req.params.id);
    if (!map) return res.status(404).json({ error: "Map not found" });

    map.deletedAt = new Date();
    await map.save();
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

// GET TRASH (soft-deleted maps)
exports.getTrash = async (req, res) => {
  try {
    const maps = await MindMap.aggregate([
      { $match: { deletedAt: { $ne: null }, userId: req.user._id } },
      {
        $lookup: {
          from: "nodes",
          localField: "_id",
          foreignField: "mindMapId",
          as: "nodes",
        },
      },
      { $addFields: { nodeCount: { $size: "$nodes" } } },
      { $project: { nodes: 0 } },
      { $sort: { deletedAt: -1 } },
    ]);
    res.json(maps);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

// RESTORE FROM TRASH
exports.restoreMap = async (req, res) => {
  try {
    const isOwner = await isMapOwner(req.user._id, req.params.id);
    if (!isOwner) return res.status(403).json({ error: "Only the map owner can restore it." });

    const map = await MindMap.findById(req.params.id);
    if (!map) return res.status(404).json({ error: "Map not found" });
    map.deletedAt = null;
    await map.save();
    res.json(map);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

// PERMANENTLY DELETE
exports.permanentlyDeleteMap = async (req, res) => {
  try {
    const isOwner = await isMapOwner(req.user._id, req.params.id);
    if (!isOwner) return res.status(403).json({ error: "Only the map owner can permanently delete it." });

    const map = await MindMap.findByIdAndDelete(req.params.id);
    if (!map) return res.status(404).json({ error: "Map not found" });
    await Node.deleteMany({ mindMapId: req.params.id });
    res.json({ message: "Permanently deleted" });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

// SHARE MAP
exports.shareMap = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });

    const User = require("../models/User");
    const userToInvite = await User.findOne({ email });
    if (!userToInvite) return res.status(404).json({ error: "User with this email not found" });

    // Ensure only the map owner can share it (or a collaborator, but usually owner)
    // Let's restrict sharing to the owner for now
    const map = await MindMap.findOne({ _id: req.params.id, userId: req.user._id });
    if (!map) return res.status(404).json({ error: "Map not found or you don't have permission to share it" });

    // Check if the user is already a collaborator or the owner
    if (map.userId.toString() === userToInvite._id.toString()) {
      return res.status(400).json({ error: "User is already the owner of this map" });
    }

    if (!map.collaborators) map.collaborators = [];
    if (map.collaborators.includes(userToInvite._id)) {
      return res.status(400).json({ error: "User is already a collaborator" });
    }

    map.collaborators.push(userToInvite._id);
    await map.save();

    res.json({ message: "Collaborator added successfully", map });
  } catch (err) {
    console.error("Error sharing map:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// GET NODES
exports.getNodes = async (req, res) => {
  // Check ownership
  const map = await MindMap.findOne({ _id: req.params.id, $or: [{ userId: req.user._id }, { collaborators: req.user._id }] });
  if (!map) return res.status(404).json({ error: "Map not found" });

  const nodes = await Node.find({
    mindMapId: req.params.id,
  });

  res.json(nodes);
};

//Create Node
exports.createNode = async (req, res) => {
  try {
    const { mindMapId, parentId, x, y } = req.body;

    // Check ownership
    const hasAccess = await canEditMap(req.user._id, mindMapId);
    if (!hasAccess) return res.status(403).json({ error: "You do not have permission to edit this map." });

    const node = await Node.create({
      mindMapId,
      parentId: parentId || null,
      text: "New Node",
      x,
      y,
    });

    const populatedUser = await require("../models/User").findById(req.user._id).select("username color");
    const log = await ActivityLog.create({
      mindMapId,
      userId: req.user._id,
      action: "NODE_CREATED",
      nodeId: node._id,
      metadata: { text: "New Node" },
    });

    // Broadcast activity log
    const logPayload = { ...log.toObject(), userId: populatedUser };
    req.app.get("io").to(mindMapId.toString()).emit("activity-log-added", logPayload);

    res.status(201).json(node);
  } catch (err) {
    console.error("Error creating node:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// UPDATE NODE (position, text, notes, color, fontSize)
exports.updateNode = async (req, res) => {
  try {
    // Whitelist allowed fields to prevent arbitrary overwrites
    const allowed = ["x", "y", "text", "notes", "color", "fontSize"];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    }

    // Ensure node belongs to a map owned by the user
    const nodeToCheck = await Node.findById(req.params.id).populate('mindMapId');
    if (!nodeToCheck || !nodeToCheck.mindMapId) {
      return res.status(404).json({ error: "Node not found" });
    }

    const hasAccess = await canEditMap(req.user._id, nodeToCheck.mindMapId._id);
    if (!hasAccess) return res.status(403).json({ error: "You do not have permission to edit this map." });

    const oldNode = await Node.findById(req.params.id);

    const node = await Node.findByIdAndUpdate(
      req.params.id,
      updates,
      { returnDocument: 'after' }
    );

    if (!node) {
      return res.status(404).json({ error: "Node not found" });
    }

    const populatedUser = await require("../models/User").findById(req.user._id).select("username color");

    let action = "NODE_EDITED";
    let metadata = {};
    if (updates.x !== undefined || updates.y !== undefined) action = "NODE_MOVED";
    if (updates.color !== undefined) {
      action = "NODE_COLOR_CHANGED";
      metadata = { oldColor: oldNode.color, newColor: node.color };
    }
    if (updates.text !== undefined || updates.notes !== undefined) action = "NODE_EDITED";

    const log = await ActivityLog.create({
      mindMapId: node.mindMapId,
      userId: req.user._id,
      action,
      nodeId: node._id,
      metadata,
    });

    // Broadcast activity log
    const logPayload = { ...log.toObject(), userId: populatedUser };
    req.app.get("io").to(node.mindMapId.toString()).emit("activity-log-added", logPayload);

    res.json(node);
  } catch (err) {
    console.error("Error updating node:", err);
    res.status(500).json({ error: "Server error" });
  }
};


// UPDATE NODE TEXT
exports.updateNodeText = async (req, res) => {
  try {
    const { text } = req.body;

    // Ensure node belongs to a map owned by the user
    const nodeToCheck = await Node.findById(req.params.id).populate('mindMapId');
    if (!nodeToCheck || !nodeToCheck.mindMapId) {
      return res.status(404).json({ error: "Node not found" });
    }
    const hasAccess = await canEditMap(req.user._id, nodeToCheck.mindMapId._id);
    if (!hasAccess) return res.status(403).json({ error: "You do not have permission to edit this map." });

    const node = await Node.findByIdAndUpdate(
      req.params.id,
      { text },
      { returnDocument: 'after' }
    );

    if (!node) {
      return res.status(404).json({ error: "Node not found" });
    }

    const populatedUser = await require("../models/User").findById(req.user._id).select("username color");
    const log = await ActivityLog.create({
      mindMapId: node.mindMapId,
      userId: req.user._id,
      action: "NODE_EDITED",
      nodeId: node._id,
      metadata: { text },
    });

    const logPayload = { ...log.toObject(), userId: populatedUser };
    req.app.get("io").to(node.mindMapId.toString()).emit("activity-log-added", logPayload);

    res.json(node);
  } catch (err) {
    console.error("Error updating node text:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// DELETE NODE
exports.deleteNode = async (req, res) => {
  try {
    // Ensure node belongs to a map owned by the user
    const nodeToCheck = await Node.findById(req.params.id).populate('mindMapId');
    if (!nodeToCheck || !nodeToCheck.mindMapId) {
      return res.status(404).json({ error: "Node not found" });
    }
    const hasAccess = await canEditMap(req.user._id, nodeToCheck.mindMapId._id);
    if (!hasAccess) return res.status(403).json({ error: "You do not have permission to edit this map." });

    const node = await Node.findByIdAndDelete(req.params.id);

    if (!node) {
      return res.status(404).json({ error: "Node not found" });
    }

    // Also delete all children recursively
    await deleteNodeChildren(node._id);

    const populatedUser = await require("../models/User").findById(req.user._id).select("username color");
    const log = await ActivityLog.create({
      mindMapId: node.mindMapId,
      userId: req.user._id,
      action: "NODE_DELETED",
      nodeId: node._id,
      metadata: { text: node.text },
    });

    const logPayload = { ...log.toObject(), userId: populatedUser };
    req.app.get("io").to(node.mindMapId.toString()).emit("activity-log-added", logPayload);

    res.json({ message: "Node deleted" });
  } catch (err) {
    console.error("Error deleting node:", err);
    res.status(500).json({ error: "Server error" });
  }
};

async function deleteNodeChildren(parentId) {
  const children = await Node.find({ parentId });
  for (const child of children) {
    await deleteNodeChildren(child._id);
    await Node.findByIdAndDelete(child._id);
  }
}

// GET ACTIVITY LOGS
exports.getActivityLogs = async (req, res) => {
  try {
    const map = await MindMap.findOne({ _id: req.params.id, $or: [{ userId: req.user._id }, { collaborators: req.user._id }] });
    if (!map) return res.status(404).json({ error: "Map not found" });

    const logs = await ActivityLog.find({ mindMapId: req.params.id })
      .populate("userId", "username color")
      .sort({ createdAt: -1 })
      .limit(50);

    res.json(logs);
  } catch (err) {
    console.error("Error fetching activity logs:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// EXPORT JSON
exports.exportJson = async (req, res) => {
  try {
    const map = await MindMap.findOne({ _id: req.params.id, $or: [{ userId: req.user._id }, { collaborators: req.user._id }] });
    if (!map) return res.status(404).json({ error: "Map not found" });

    const nodes = await Node.find({ mindMapId: req.params.id });

    // Build the payload
    const payload = {
      mindmap: { title: map.title, createdAt: map.createdAt },
      nodes: nodes.map(n => ({
        id: n._id, text: n.text, parentId: n.parentId, notes: n.notes || ""
      }))
    };

    res.setHeader("Content-Disposition", `attachment; filename="${map.title}.json"`);
    res.setHeader("Content-Type", "application/json");
    res.send(JSON.stringify(payload, null, 2));
  } catch (err) {
    console.error("Error exporting JSON:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// HELPER FOR MARKDOWN
function buildMarkdownTree(nodes, parentId, depth = 1) {
  let md = "";
  const children = nodes.filter(n => String(n.parentId || null) === String(parentId || null));
  for (const child of children) {
    const prefix = "#".repeat(depth);
    md += `${prefix} ${child.text}\n\n`;
    if (child.notes) {
      md += `*${child.notes}*\n\n`;
    }
    md += buildMarkdownTree(nodes, child._id, depth + 1);
  }
  return md;
}

// EXPORT MARKDOWN
exports.exportMarkdown = async (req, res) => {
  try {
    const map = await MindMap.findOne({ _id: req.params.id, $or: [{ userId: req.user._id }, { collaborators: req.user._id }] });
    if (!map) return res.status(404).json({ error: "Map not found" });

    const nodes = await Node.find({ mindMapId: req.params.id });

    let md = `# ${map.title}\n\n`;
    md += buildMarkdownTree(nodes, null, 2);

    res.setHeader("Content-Disposition", `attachment; filename="${map.title}.md"`);
    res.setHeader("Content-Type", "text/markdown");
    res.send(md);
  } catch (err) {
    console.error("Error exporting Markdown:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// SYNC OPERATIONS
exports.syncOperations = async (req, res) => {
  try {
    const mongoose = require("mongoose");
    const User = require("../models/User");
    const { id } = req.params;
    const { operations } = req.body;


    if (!operations || !Array.isArray(operations)) {
      return res.status(400).json({ error: "Invalid operations payload" });
    }

    // Permission Check
    if (!(await canEditMap(req.user._id, id))) {
      return res.status(403).json({ error: "Not authorized to edit this map" });
    }

    const acknowledged = [];
    const broadcastEvents = [];

    for (const op of operations) {
      // 1. Deduplication
      const exists = await ProcessedOperation.findOne({ operationId: op.operationId });
      if (exists) {
        acknowledged.push(op.operationId);
        continue;
      }

      // 2. Fetch target node for Last Write Wins
      let node = null;
      if (op.type !== "CREATE_NODE") {
        node = await Node.findById(op.nodeId);
        if (node && node.updatedAt && new Date(op.timestamp) < node.updatedAt) {
          // Operation is too old. Acknowledge to drop it, but don't apply.
          acknowledged.push(op.operationId);
          await ProcessedOperation.create({ operationId: op.operationId, mapId: id });
          continue;
        }
      }

      // 3. Apply Operation Action
      try {
        if (op.type === "CREATE_NODE") {
          node = await Node.findById(op.nodeId);
          if (!node) {
            node = new Node({ _id: op.nodeId, mindMapId: id, ...op.payload });
            await node.save();
          }
          broadcastEvents.push({ event: "node-added", payload: node, clientId: op.clientId });
        } else if (op.type === "MOVE_NODE") {
          if (node) {
            node.x = op.payload.x;
            node.y = op.payload.y;
            await node.save();
            broadcastEvents.push({ event: "node-dragged", payload: { nodeId: node._id, position: { x: node.x, y: node.y } }, clientId: op.clientId });
          }
          // If node doesn't exist yet, still acknowledge so it doesn't retry forever
        } else if (op.type === "EDIT_NODE") {
          if (node) {
            Object.assign(node, op.payload);
            await node.save();
            broadcastEvents.push({ event: "node-updated", payload: node, clientId: op.clientId });
          }
        } else if (op.type === "DELETE_NODE") {
          if (node) {
            await deleteNodeChildren(op.nodeId);
            await Node.findByIdAndDelete(op.nodeId);
          }
          broadcastEvents.push({ event: "node-deleted", payload: op.nodeId, clientId: op.clientId });
        }

        // Mark successfully processed — ALWAYS acknowledge to prevent infinite retry
        await ProcessedOperation.create({ operationId: op.operationId, mapId: id });
        acknowledged.push(op.operationId);

        // Generate Activity Log (skip MOVE_NODE — it's noise from auto-layout)
        if (op.type !== "MOVE_NODE") {
          try {
              let action = null;
              let metadata = {};
              if (op.type === "CREATE_NODE") action = "NODE_CREATED";
              else if (op.type === "DELETE_NODE") {
                  action = "NODE_DELETED";
                  metadata = { text: node ? node.text : "Unknown" };
              }
              else if (op.type === "EDIT_NODE") {
                  if (op.payload.color) action = "NODE_COLOR_CHANGED";
                  else action = "NODE_EDITED";
                  if (op.payload.text) metadata = { text: op.payload.text };
              }

              if (action) {
                  const log = await ActivityLog.create({
                      mindMapId: id,
                      userId: req.user._id,
                      action,
                      nodeId: op.nodeId,
                      metadata,
                  });
                  const populatedUser = await User.findById(req.user._id).select("username color");
                  const logPayload = { ...log.toObject(), userId: populatedUser };
                  broadcastEvents.push({ event: "activity-log-added", payload: logPayload, clientId: op.clientId });
              }
          } catch (logErr) {
              // Activity log creation failed silently
          }
        }

      } catch (opErr) {
        // Still acknowledge the operation to prevent infinite retry loops.
        // The operation data is likely invalid and retrying won't help.
        try {
          await ProcessedOperation.create({ operationId: op.operationId, mapId: id });
        } catch (_) { /* ignore duplicate key errors */ }
        acknowledged.push(op.operationId);
      }
    }

    // 4. Broadcast only activity log events (not node events).
    // Node events (node-added, node-dragged, etc.) are already broadcast by the
    // sender's socket.emit calls. Re-broadcasting them from sync causes duplicate
    // state updates and crashes when CLIENT_ID changes on page refresh.
    const io = req.app.get("io");
    if (io) {
      for (const evt of broadcastEvents) {
        if (evt.event === "activity-log-added") {
          io.to(id.toString()).emit(evt.event, evt.payload);
        }
      }
    }

    res.json({ acknowledged });
  } catch (err) {
    console.error("Sync error:", err);
    res.status(500).json({ error: "Server sync engine error" });
  }
};
