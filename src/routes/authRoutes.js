const express = require("express");
const router = express.Router();
const { registerUser, loginUser, getMe, completeOnboarding, completeAdvancedTutorial } = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/me", protect, getMe);
router.patch("/onboarding", protect, completeOnboarding);
router.patch("/advanced-tutorial", protect, completeAdvancedTutorial);

module.exports = router;
