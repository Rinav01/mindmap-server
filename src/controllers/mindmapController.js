const MindMap = require("../models/MindMap");
const Node = require("../models/Node");

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
    const map = await MindMap.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
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
    const map = await MindMap.findOne({ _id: req.params.id, userId: req.user._id });
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
    const map = await MindMap.findOne({ _id: req.params.id, userId: req.user._id });
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
    const map = await MindMap.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
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
    const map = await MindMap.findOne({ _id: mindMapId, $or: [{ userId: req.user._id }, { collaborators: req.user._id }] });
    if (!map) return res.status(404).json({ error: "Map not found" });

    const node = await Node.create({
      mindMapId,
      parentId: parentId || null,
      text: "New Node",
      x,
      y,
    });

    res.status(201).json(node);
  } catch (err) {
    console.error("Error creating node:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// UPDATE NODE (position, text, color, fontSize)
exports.updateNode = async (req, res) => {
  try {
    // Whitelist allowed fields to prevent arbitrary overwrites
    const allowed = ["x", "y", "text", "color", "fontSize"];
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
    const isOwner = nodeToCheck.mindMapId.userId.toString() === req.user._id.toString();
    const isCollaborator = nodeToCheck.mindMapId.collaborators.some(id => id.toString() === req.user._id.toString());
    if (!isOwner && !isCollaborator) {
      return res.status(404).json({ error: "Node not found" });
    }

    const node = await Node.findByIdAndUpdate(
      req.params.id,
      updates,
      { returnDocument: 'after' }
    );

    if (!node) {
      return res.status(404).json({ error: "Node not found" });
    }

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
    const isOwner = nodeToCheck.mindMapId.userId.toString() === req.user._id.toString();
    const isCollaborator = nodeToCheck.mindMapId.collaborators.some(id => id.toString() === req.user._id.toString());
    if (!isOwner && !isCollaborator) {
      return res.status(404).json({ error: "Node not found" });
    }

    const node = await Node.findByIdAndUpdate(
      req.params.id,
      { text },
      { returnDocument: 'after' }
    );

    if (!node) {
      return res.status(404).json({ error: "Node not found" });
    }

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
    const isOwner = nodeToCheck.mindMapId.userId.toString() === req.user._id.toString();
    const isCollaborator = nodeToCheck.mindMapId.collaborators.some(id => id.toString() === req.user._id.toString());
    if (!isOwner && !isCollaborator) {
      return res.status(404).json({ error: "Node not found" });
    }

    const node = await Node.findByIdAndDelete(req.params.id);

    if (!node) {
      return res.status(404).json({ error: "Node not found" });
    }

    // Also delete all children recursively
    await deleteNodeChildren(node._id);

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

