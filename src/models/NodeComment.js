const mongoose = require("mongoose");

const nodeCommentSchema = new mongoose.Schema(
    {
        mapId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "MindMap",
            required: true,
            index: true,
        },
        nodeId: {
            type: String,
            required: true,
            index: true,
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        content: {
            type: String,
            required: true,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("NodeComment", nodeCommentSchema);
