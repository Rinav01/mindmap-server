const Version = require("../models/Version");
const Node = require("../models/Node");

/**
 * Create new version snapshot
 */
exports.createVersion = async (req, res) => {
    try {
        const { id: mindMapId } = req.params;
        const { label = "", actionType = "manual" } = req.body;

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

        const version = await Version.findById(versionId);

        if (!version) {
            return res.status(404).json({ message: "Version not found" });
        }

        // Delete existing nodes
        await Node.deleteMany({ mindMapId });

        // Map old IDs to new IDs to preserve relationships
        const idMap = new Map();
        version.snapshot.forEach((node) => {
            idMap.set(String(node._id), new (require("mongoose")).Types.ObjectId());
        });

        // Insert snapshot nodes with updated IDs
        const restoredNodes = version.snapshot.map((node) => {
            const newNodeId = idMap.get(String(node._id));
            const oldParentId = node.parentId ? String(node.parentId) : null;
            const newParentId = oldParentId ? idMap.get(oldParentId) : null;

            return {
                ...node,
                _id: newNodeId,
                parentId: newParentId || oldParentId, // Fallback if parent not in map (e.g. external root)
                mindMapId,
            };
        });

        await Node.insertMany(restoredNodes);

        res.json({ message: "Version restored", nodes: restoredNodes });
    } catch (err) {
        console.error("Restore version error:", err);
        res.status(500).json({ message: "Failed to restore version" });
    }
};
