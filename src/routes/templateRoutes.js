const express = require("express");
const router = express.Router();
const controller = require("../controllers/templateController");
const { protect } = require("../middleware/authMiddleware");

// Routes
router.get("/", protect, controller.getTemplates);
router.post("/from-template", protect, controller.createMapFromTemplate);

module.exports = router;
