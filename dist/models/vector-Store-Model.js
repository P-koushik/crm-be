"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const types_1 = require("../types");
const vector_store_schema = new mongoose_1.Schema({
    user: { type: String, required: true },
    contactId: { type: String, required: true },
    contentType: {
        type: String,
        enum: Object.values(types_1.ContentType),
        required: true,
    },
    content: { type: String, required: true },
    embedding: [{ type: Number, required: true }],
    metadata: {
        source: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
        tags: [{ type: String }],
        importance: { type: Number, default: 1.0 },
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
});
// Index for vector search
vector_store_schema.index({ user: 1, contactId: 1 });
vector_store_schema.index({ contentType: 1 });
vector_store_schema.index({ "metadata.tags": 1 });
const VectorStore = mongoose_1.models.VectorStore || (0, mongoose_1.model)("VectorStore", vector_store_schema);
exports.default = VectorStore;
