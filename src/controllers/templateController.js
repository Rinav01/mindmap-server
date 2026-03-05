const Template = require("../models/Template");
const MindMap = require("../models/MindMap");
const Node = require("../models/Node");
const MapMember = require("../models/MapMember");
const mongoose = require("mongoose");

// Seeding logic to prepare 4 basic templates if DB is entirely empty
const seedTemplatesIfEmpty = async () => {
    try {
        const count = await Template.countDocuments();
        if (count > 0) return;

        console.log("Seeding default templates...");
        const defaultTemplates = [
            {
                title: "Startup Planning",
                description: "Brainstorm business models, marketing, and core tech stacks.",
                nodes: [
                    { id: "root", parentId: null, text: "Startup Plan", x: 0, y: 0, color: "#eab308" },
                    { id: "c1", parentId: "root", text: "Product", x: 200, y: -100, color: "#3b82f6" },
                    { id: "c2", parentId: "root", text: "Marketing", x: 200, y: 100, color: "#10b981" },
                    { id: "c3", parentId: "c1", text: "MVP Features", x: 400, y: -150 },
                    { id: "c4", parentId: "c1", text: "Tech Stack", x: 400, y: -50 }
                ],
                category: "Business"
            },
            {
                title: "Project Breakdown",
                description: "A simple agile breakdown schema.",
                nodes: [
                    { id: "root", parentId: null, text: "Project Alpha", x: 0, y: 0, color: "#a855f7" },
                    { id: "c1", parentId: "root", text: "To Do", x: -200, y: 150, color: "#ef4444" },
                    { id: "c2", parentId: "root", text: "In Progress", x: 0, y: 150, color: "#eab308" },
                    { id: "c3", parentId: "root", text: "Done", x: 200, y: 150, color: "#22c55e" }
                ],
                category: "Agile"
            },
            {
                title: "Study Notes",
                description: "Hierarchical topic branching for study sessions.",
                nodes: [
                    { id: "root", parentId: null, text: "Main Topic", x: 0, y: 0, color: "#3b82f6" },
                    { id: "c1", parentId: "root", text: "Concept A", x: -200, y: -100 },
                    { id: "c2", parentId: "root", text: "Concept B", x: 200, y: -100 },
                    { id: "c3", parentId: "root", text: "Concept C", x: -200, y: 100 },
                    { id: "c4", parentId: "root", text: "Concept D", x: 200, y: 100 }
                ],
                category: "Education"
            },
            {
                title: "Brainstorming",
                description: "A free-form scatter template.",
                nodes: [
                    { id: "root", parentId: null, text: "Core Challenge", x: 0, y: 0, color: "#ec4899" },
                    { id: "c1", parentId: "root", text: "Idea 1", x: -150, y: -150 },
                    { id: "c2", parentId: "root", text: "Idea 2", x: 150, y: -150 },
                    { id: "c3", parentId: "root", text: "Idea 3", x: -150, y: 150 },
                    { id: "c4", parentId: "root", text: "Idea 4", x: 150, y: 150 }
                ],
                category: "Creative"
            }
        ];
        // Insert all simultaneously
        await Template.insertMany(defaultTemplates);
        console.log("Seeding complete!");
    } catch (e) {
        console.error("Failed to seed templates:", e);
    }
}

// 1. GET /api/templates
exports.getTemplates = async (req, res) => {
    try {
        await seedTemplatesIfEmpty();

        // Fetch public templates, possibly user-created private ones too
        const userId = req.user ? req.user.id : null;
        const query = { $or: [{ isPublic: true }] };
        if (userId) query.$or.push({ createdBy: userId });

        const templates = await Template.find(query).sort({ createdAt: 1 });
        res.json(templates);
    } catch (err) {
        console.error("Error fetching templates:", err);
        res.status(500).json({ error: "Server error" });
    }
};

// 2. POST /api/templates/from-template
exports.createMapFromTemplate = async (req, res) => {
    try {
        const { templateId } = req.body;
        const userId = req.user._id;

        if (!templateId) return res.status(400).json({ error: "templateId is required" });

        const template = await Template.findById(templateId);
        if (!template) return res.status(404).json({ error: "Template not found" });

        // 1. Create a fresh MindMap matching the template title
        const map = await MindMap.create({
            title: template.title, // Or "Copy of " + template.title
            userId: userId,
        });

        // 2. Establish Map Owner Role
        await MapMember.create({
            mindMapId: map._id,
            userId: userId,
            role: "OWNER",
        });

        // 3. Resolve internal schema strings into genuine Mongo ObjectIds for parent-child tracking natively
        // E.g. { "root": new ObjectId("xyz...") }
        const idMap = new Map();
        template.nodes.forEach(blueprintNode => {
            idMap.set(blueprintNode.id, new mongoose.Types.ObjectId());
        });

        const newNodes = template.nodes.map(blueprintNode => {
            return {
                _id: idMap.get(blueprintNode.id), // Resolved
                mindMapId: map._id,
                parentId: blueprintNode.parentId ? idMap.get(blueprintNode.parentId) : null,
                text: blueprintNode.text,
                x: blueprintNode.x,
                y: blueprintNode.y,
                color: blueprintNode.color
            };
        });

        // Batch insert the nodes
        if (newNodes.length > 0) {
            await Node.insertMany(newNodes);
        }

        // Return the freshly minted map context
        res.status(201).json({ mapId: map._id });
    } catch (err) {
        console.error("Error creating from template:", err);
        res.status(500).json({ error: "Server error" });
    }
};
