const express = require('express');
const router = express.Router();
const controller = require("../controllers/mindMapController");
const memberController = require("../controllers/mapMemberController");
const nodeCommentRoutes = require("./nodeCommentRoutes");

router.get("/", controller.getMaps);
router.post("/", controller.createMap);
router.get("/trash", controller.getTrash);           // ← before /:id
router.get("/:id", controller.getMap);
router.patch("/:id/star", controller.toggleStar);
router.patch("/:id/title", controller.updateMapTitle);

// Exports
router.get("/:id/export/json", controller.exportJson);
router.get("/:id/export/md", controller.exportMarkdown);

// Member / Sharing Routes
router.get("/:id/members", memberController.getMembers);
router.post("/:id/invite", memberController.inviteMember);
router.put("/:id/members/:memberId", memberController.updateMemberRole);
router.delete("/:id/members/:memberId", memberController.removeMember);
router.patch("/:id/restore", controller.restoreMap);
router.delete("/:id/permanent", controller.permanentlyDeleteMap);
router.delete("/:id", controller.deleteMap);
router.get("/:id/nodes", controller.getNodes);
router.get("/:id/activity", controller.getActivityLogs);
router.post("/nodes", controller.createNode);
router.patch("/nodes/:id", controller.updateNode);
router.patch("/nodes/:id/text", controller.updateNodeText);
router.delete("/nodes/:id", controller.deleteNode);

// Nested router for Node Comments
router.use("/:mapId/nodes/:nodeId/comments", nodeCommentRoutes);

module.exports = router;
