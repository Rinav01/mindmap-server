const mongoose = require("mongoose");

const VersionSchema = new mongoose.Schema(
  {
    mindMapId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MindMap",
      required: true,
      index: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    snapshot: {
      type: Array,
      required: true,
    },

    label: {
      type: String,
      default: "",
    },

    actionType: {
      type: String,
      enum: ["manual", "auto-layout", "align", "delete", "restore"],
      default: "manual",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Version", VersionSchema);
