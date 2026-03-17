const mongoose = require("mongoose");
const Node = require("../models/Node");
const User = require("../models/User");
const ActivityLog = require("../models/ActivityLog");
const { generateMindmap, expandNode } = require("../services/aiService");

/**
 * POST /api/ai/generate-mindmap
 * Body: { topic: string, mindMapId: string }
 *
 * Generates a mindmap tree via Groq AI, converts it to flat nodes with
 * auto-computed positions, saves them, and returns the created nodes.
 */
const generateMindmapController = async (req, res) => {
    const { topic, mindMapId } = req.body;

    if (!topic || !topic.trim()) {
        return res.status(400).json({ message: "topic is required" });
    }
    if (!mindMapId) {
        return res.status(400).json({ message: "mindMapId is required" });
    }

    try {
        // 1. Call AI service to get the tree structure
        const tree = await generateMindmap(topic.trim());

        // 2. Convert tree → flat node documents using two passes:
        //    Pass 1 (DFS): compute subtree height (number of leaf cells needed).
        //    Pass 2 (DFS): assign x,y so each parent is centered over its children.

        const X_SPACING = 280;
        const Y_SPACING = 110;

        // Pass 1 — compute leaf count (height) for each tree node recursively
        const computeHeight = (node) => {
            if (!Array.isArray(node.children) || node.children.length === 0) {
                node._height = 1;
            } else {
                node.children.forEach(computeHeight);
                node._height = node.children.reduce((sum, c) => sum + c._height, 0);
            }
        };
        computeHeight(tree);

        const nodeDocs = [];

        // Pass 2 — DFS that places each node; yStart = top of its allocated block
        const place = (treeNode, depth, yStart, parentObjectId) => {
            const newId = new mongoose.Types.ObjectId();
            const centerY = yStart + (treeNode._height * Y_SPACING) / 2;

            nodeDocs.push({
                _id: newId,
                mindMapId: new mongoose.Types.ObjectId(mindMapId),
                text: treeNode.title || "Node",
                x: depth * X_SPACING,
                y: centerY,
                parentId: parentObjectId,
            });

            if (Array.isArray(treeNode.children) && treeNode.children.length > 0) {
                let cursor = yStart;
                treeNode.children.forEach((child) => {
                    place(child, depth + 1, cursor, newId);
                    cursor += child._height * Y_SPACING;
                });
            }
        };

        place(tree, 0, 0, null);

        // 3. Remove all existing nodes for this map (clears the default "Central Idea" node)
        await Node.deleteMany({ mindMapId: new mongoose.Types.ObjectId(mindMapId) });

        // 4. Bulk-insert AI-generated nodes
        const createdNodes = await Node.insertMany(nodeDocs);

        // 5. Create and broadcast ActivityLog
        const populatedUser = await User.findById(req.user._id).select("username color");
        try {
            const log = await ActivityLog.create({
                mindMapId: mindMapId,
                userId: req.user._id,
                action: "AI_GENERATED",
                metadata: { text: topic.trim() },
            });
            const logPayload = { ...log.toObject(), userId: populatedUser };
            req.app.get("io").to(mindMapId.toString()).emit("activity-log-added", logPayload);
        } catch (logErr) {
            // Activity log creation failed silently
        }

        // 6. Return created nodes (same shape the frontend already knows)
        return res.status(201).json(createdNodes);
    } catch (err) {
        console.error("[AI Controller] Error generating mindmap:", err);
        return res.status(500).json({ message: err.message || "AI generation failed" });
    }
};

/**
 * POST /api/ai/expand-node
 * Body: { mindMapId: string, nodeId: string, text: string }
 *
 * Expands a specific node by generating child nodes via Groq AI.
 */
const expandNodeController = async (req, res) => {
    const { mindMapId, nodeId, text } = req.body;

    if (!mindMapId || !nodeId || !text) {
        return res.status(400).json({ message: "mindMapId, nodeId, and text are required" });
    }

    try {
        // 1. Get the parent node to know where to place the children initially
        const parentNode = await Node.findById(nodeId);
        if (!parentNode) {
            return res.status(404).json({ message: "Parent node not found" });
        }

        // 2. Ask AI to brainstorm children topics
        const childTopics = await expandNode(text, 5);

        // 3. Create node documents for each child topic
        // We stack them exactly on top of the parent to let the frontend auto-layout sequence them out
        const nodeDocs = childTopics.map((topic) => ({
            _id: new mongoose.Types.ObjectId(),
            mindMapId: new mongoose.Types.ObjectId(mindMapId),
            text: topic,
            x: parentNode.x,
            y: parentNode.y,
            parentId: new mongoose.Types.ObjectId(nodeId),
        }));

        // 4. Bulk insert the children
        const createdNodes = await Node.insertMany(nodeDocs);

        // 5. Create and broadcast ActivityLog
        const populatedUser = await User.findById(req.user._id).select("username color");
        try {
            const log = await ActivityLog.create({
                mindMapId: mindMapId,
                userId: req.user._id,
                action: "AI_EXPANDED",
                nodeId: nodeId,
                metadata: { text: text },
            });
            const logPayload = { ...log.toObject(), userId: populatedUser };
            req.app.get("io").to(mindMapId.toString()).emit("activity-log-added", logPayload);
        } catch (logErr) {
            // Activity log creation failed silently
        }

        // 6. Return created nodes
        return res.status(201).json(createdNodes);
    } catch (err) {
        console.error("[AI Controller] Error expanding node:", err);
        return res.status(500).json({ message: err.message || "AI node expansion failed" });
    }
};

module.exports = { generateMindmapController, expandNodeController };
