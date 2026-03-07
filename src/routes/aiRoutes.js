const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { generateMindmapController } = require("../controllers/aiController");

// POST /api/ai/generate-mindmap
router.post("/generate-mindmap", protect, generateMindmapController);

module.exports = router;
