const mongoose = require("mongoose");

const mindMapSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    isStarred: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("MindMap", mindMapSchema);
