const NodeComment = require("../models/NodeComment");
const { canEditMap } = require("../services/mapPermissionService");
const ActivityLog = require("../models/ActivityLog");
const { io } = require("../socket");

// Get all comments for a specific node
exports.getCommentsList = async (req, res) => {
    try {
        const { mapId, nodeId } = req.params;
        const userId = req.user.id;

        // Optional Check: Does user have access to read this map at all?
        // Technically passing the authMiddleware means they're authenticated, 
        // but typically a Viewer/Editor logic applies at the permission level. 
        // We assume any authenticated user can read if they have the link, 
        // or we'd enforce it here. Since viewers can read the map, they can read comments.

        const comments = await NodeComment.find({ mapId, nodeId })
            .populate("userId", "name username color")
            .sort({ createdAt: 1 }); // Oldest first (chronological thread)

        return res.json(comments);
    } catch (err) {
        console.error("Error fetching comments:", err);
        return res.status(500).json({ message: "Server error" });
    }
};

// Create a new comment
exports.createComment = async (req, res) => {
    try {
        const { mapId, nodeId } = req.params;
        const { content } = req.body;
        const userId = req.user.id;

        if (!content || !content.trim()) {
            return res.status(400).json({ message: "Content is required" });
        }

        const hasEditRights = await canEditMap(userId, mapId);
        if (!hasEditRights) {
            return res.status(403).json({ message: "Insufficient permissions to comment." });
        }

        const comment = new NodeComment({
            mapId,
            nodeId,
            userId,
            content: content.trim(),
        });

        await comment.save();

        // Populate before broadcasting
        await comment.populate("userId", "name username color");

        // Broadcast via socket
        if (io) {
            io.to(mapId).emit("comment-added", {
                nodeId,
                comment,
            });
        }

        // Log the activity secretly
        const User = require("../models/User");
        const user = await User.findById(userId).select("name username color");
        if (user) {
            const log = new ActivityLog({
                mapId,
                userId,
                action: "NODE_COMMENTED",
                nodeId,
                metadata: { text: content.trim() }
            });
            await log.save();
            if (io) {
                io.to(mapId).emit("activity-log-added", {
                    ...log.toObject(),
                    userId: { _id: user._id, name: user.name, username: user.username, color: user.color }
                });
            }
        }

        return res.status(201).json(comment);
    } catch (err) {
        console.error("Error creating comment:", err);
        return res.status(500).json({ message: "Server error" });
    }
};

// Delete a comment
exports.deleteComment = async (req, res) => {
    try {
        const { mapId, nodeId, commentId } = req.params;
        const userId = req.user.id;

        const comment = await NodeComment.findById(commentId);
        if (!comment) {
            return res.status(404).json({ message: "Comment not found" });
        }

        // Must be the author of the comment OR the Owner of the map
        // For simplicity right now, only let the author delete their own comment
        if (comment.userId.toString() !== userId) {
            const hasEditRights = await canEditMap(userId, mapId);
            // We will loosely allow Map Owners/Editors to delete any comment for moderation.
            if (!hasEditRights) {
                return res.status(403).json({ message: "Cannot delete this comment" });
            }
        }

        await comment.deleteOne();

        // Broadcast deletion
        if (io) {
            io.to(mapId).emit("comment-deleted", {
                nodeId,
                commentId,
            });
        }

        return res.json({ message: "Comment deleted" });
    } catch (err) {
        console.error("Error deleting comment:", err);
        return res.status(500).json({ message: "Server error" });
    }
};
