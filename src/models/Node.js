const mongoose = require("mongoose");

const nodeSchema = new mongoose.Schema(
  {
    mindMapId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MindMap",
      required: true,
    },
    text: {
      type: String,
      default: "Central Idea",
    },
    x: {
      type: Number,
      default: 0,
    },
    y: {
      type: Number,
      default: 0,
    },
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    color: {
      type: String,
      default: null,
    },
    fontSize: {
      type: Number,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Node", nodeSchema);

