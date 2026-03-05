const express = require("express");
const { getCommentsList, createComment, deleteComment } = require("../controllers/nodeCommentController");
const { protect } = require("../middleware/authMiddleware");

// Note: Mounted via /api/mindmaps/:mapId/nodes/:nodeId/comments
const router = express.Router({ mergeParams: true });

router.use(protect);

router.get("/", getCommentsList);
router.post("/", createComment);
router.delete("/:commentId", deleteComment);

module.exports = router;
