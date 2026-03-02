const express = require("express");
const router = express.Router();
const controller = require("../controllers/mindMapController");

router.get("/", controller.getMaps);
router.post("/", controller.createMap);
router.get("/trash", controller.getTrash);           // ← before /:id
router.get("/:id", controller.getMap);
router.patch("/:id/star", controller.toggleStar);
router.patch("/:id/title", controller.updateMapTitle);
router.post("/:id/share", controller.shareMap);
router.patch("/:id/restore", controller.restoreMap);
router.delete("/:id/permanent", controller.permanentlyDeleteMap);
router.delete("/:id", controller.deleteMap);
router.get("/:id/nodes", controller.getNodes);
router.post("/nodes", controller.createNode);
router.patch("/nodes/:id", controller.updateNode);
router.patch("/nodes/:id/text", controller.updateNodeText);
router.delete("/nodes/:id", controller.deleteNode);

module.exports = router;
