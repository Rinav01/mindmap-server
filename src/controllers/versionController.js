const Version = require("../models/Version");
const Node = require("../models/Node");
const MindMap = require("../models/MindMap");

/**
 * Create new version snapshot
 */
exports.createVersion = async (req, res) => {
    try {
        const { id: mindMapId } = req.params;
        const { label = "", actionType = "manual" } = req.body;

        // Verify map ownership
        const map = await MindMap.findOne({ _id: mindMapId, userId: req.user._id });
        if (!map) return res.status(404).json({ message: "Map not found" });

        const nodes = await Node.find({ mindMapId }).lean();

        const version = await Version.create({
            mindMapId,
            snapshot: nodes,
            label,
            actionType,
        });

        res.status(201).json(version);
    } catch (err) {
        console.error("Create version error:", err);
        res.status(500).json({ message: "Failed to create version" });
    }
};

/**
 * Get all versions for a mind map
 */
exports.getVersions = async (req, res) => {
    try {
        const { id: mindMapId } = req.params;

        // Verify map ownership
        const map = await MindMap.findOne({ _id: mindMapId, userId: req.user._id });
        if (!map) return res.status(404).json({ message: "Map not found" });

        const versions = await Version.find({ mindMapId })
            .sort({ createdAt: -1 })
            .select("-snapshot"); // don't send full snapshot in list

        res.json(versions);
    } catch (err) {
        console.error("Get versions error:", err);
        res.status(500).json({ message: "Failed to fetch versions" });
    }
};

/**
 * Restore a version
 */
exports.restoreVersion = async (req, res) => {
    try {
        const { id: mindMapId, versionId } = req.params;

        // Verify map ownership
        const map = await MindMap.findOne({ _id: mindMapId, userId: req.user._id });
        if (!map) return res.status(404).json({ message: "Map not found" });

        const version = await Version.findById(versionId);

        if (!version) {
            return res.status(404).json({ message: "Version not found" });
        }

        // Delete existing nodes
        await Node.deleteMany({ mindMapId });

        // Insert snapshot nodes with original IDs preserved
        const restoredNodes = version.snapshot.map((node) => ({
            ...node,
            mindMapId, // Ensure it's correctly linked to the current map
        }));

        await Node.insertMany(restoredNodes);

        res.json({ message: "Version restored", nodes: restoredNodes });
    } catch (err) {
        console.error("Restore version error:", err);
        res.status(500).json({ message: "Failed to restore version" });
    }
};

/**
 * Delete a version
 */
exports.deleteVersion = async (req, res) => {
    try {
        const { id: mindMapId, versionId } = req.params;

        // Verify map ownership
        const map = await MindMap.findOne({ _id: mindMapId, userId: req.user._id });
        if (!map) return res.status(404).json({ message: "Map not found" });

        const deleted = await Version.findByIdAndDelete(versionId);
        if (!deleted) {
            return res.status(404).json({ message: "Version not found" });
        }
        res.json({ message: "Version deleted" });
    } catch (err) {
        console.error("Delete version error:", err);
        res.status(500).json({ message: "Failed to delete version" });
    }
};
