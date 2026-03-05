const mongoose = require("mongoose");

const TemplateNodeSchema = new mongoose.Schema({
    id: { type: String, required: true }, // Local ID within the template map
    parentId: { type: String, default: null }, // Null for root nodes
    text: { type: String, default: "New Node" },
    x: { type: Number, required: true },
    y: { type: Number, required: true },
    color: { type: String, default: "#3b82f6" },
}, { _id: false });

const TemplateSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
        },
        description: {
            type: String,
            default: "",
        },
        isPublic: {
            type: Boolean,
            default: true,
        },
        nodes: [TemplateNodeSchema], // A serialized blueprint of nodes
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: false, // Optional if seeded by system
        },
        category: {
            type: String,
            default: "General",
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model("Template", TemplateSchema);
