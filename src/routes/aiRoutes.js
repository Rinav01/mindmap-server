const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { generateMindmapController, expandNodeController } = require("../controllers/aiController");

// POST /api/ai/generate-mindmap
router.post("/generate-mindmap", protect, generateMindmapController);

// POST /api/ai/expand-node
router.post("/expand-node", protect, expandNodeController);

module.exports = router;
