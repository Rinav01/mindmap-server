const mongoose = require("mongoose");

const mindMapSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    collaborators: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    }],
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
