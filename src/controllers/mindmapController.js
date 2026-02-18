const MindMap = require("../models/MindMap");
const Node = require("../models/Node");

// GET ALL
exports.getMaps = async (req, res) => {
  try {
    const maps = await MindMap.find({ deletedAt: null }).sort({
      updatedAt: -1,
    });

    res.json(maps);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

// GET SINGLE MAP
exports.getMap = async (req, res) => {
  try {
    const map = await MindMap.findById(req.params.id);
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
    const map = await MindMap.findById(req.params.id);

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
    const map = await MindMap.findById(req.params.id);

    map.deletedAt = new Date();
    await map.save();

    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

// GET NODES
exports.getNodes = async (req, res) => {
  const nodes = await Node.find({
    mindMapId: req.params.id,
  });

  res.json(nodes);
};

//Create Node
exports.createNode = async (req, res) => {
  try {
    const { mindMapId, parentId, x, y } = req.body;

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

