const mongoose = require("mongoose");

const mapMemberSchema = new mongoose.Schema(
    {
        mindMapId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "MindMap",
            required: true,
            index: true,
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        role: {
            type: String,
            enum: ["OWNER", "EDITOR", "VIEWER"],
            required: true,
            default: "VIEWER",
        },
        invitedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
    },
    { timestamps: true }
);

// Ensure a user can only have one role per map
mapMemberSchema.index({ mindMapId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model("MapMember", mapMemberSchema);
