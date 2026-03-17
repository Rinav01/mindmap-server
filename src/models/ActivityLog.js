const mongoose = require("mongoose");

const ActivityLogSchema = new mongoose.Schema({
    mindMapId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "MindMap",
        required: true,
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    action: {
        type: String,
        enum: ["NODE_CREATED", "NODE_DELETED", "NODE_EDITED", "NODE_MOVED", "NODE_COLOR_CHANGED", "AI_GENERATED", "AI_EXPANDED"],
        required: true,
    },
    nodeId: {
        type: String, // String representation of the Node ID for reference (can be ObjectId depending on architecture, but string is safer if nodes are deleted)
        required: false,
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed, // Stores specific info like old/new text
        required: false,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

// Index for performance when querying logs for a specific mindmap
ActivityLogSchema.index({ mindMapId: 1, createdAt: -1 });

module.exports = mongoose.model("ActivityLog", ActivityLogSchema);
