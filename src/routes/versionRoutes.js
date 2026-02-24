const express = require("express");
const router = express.Router();
const {
    createVersion,
    getVersions,
    restoreVersion,
} = require("../controllers/versionController");

router.post("/mindmaps/:id/versions", createVersion);
router.get("/mindmaps/:id/versions", getVersions);
router.post("/mindmaps/:id/versions/:versionId/restore", restoreVersion);

module.exports = router;
