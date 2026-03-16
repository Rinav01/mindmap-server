const mongoose = require("mongoose");

const processedOperationSchema = new mongoose.Schema(
    {
        operationId: {
            type: String,
            required: true,
            unique: true,
        },
        mapId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "MindMap",
            required: true,
        },
    },
    { timestamps: true }
);

// TTL Index: Documents automatically delete 7 days after insertion
processedOperationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 604800 });

module.exports = mongoose.model("ProcessedOperation", processedOperationSchema);
