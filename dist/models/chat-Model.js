"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const types_1 = require("../types");
const message_schema = new mongoose_1.Schema({
    sender: {
        type: String,
        enum: Object.values(types_1.SenderType),
        required: true,
    },
    message: {
        type: String,
        required: true,
    },
    timestamp: {
        type: Date,
        default: Date.now,
    },
    metadata: {
        tokenCount: { type: Number },
        inputTokens: { type: Number },
        outputTokens: { type: Number },
        model: { type: String },
    },
}, { _id: false });
const chat_schema = new mongoose_1.Schema({
    conversationId: {
        type: String,
        required: true,
        index: true,
    },
    user: {
        type: String,
        required: true,
        index: true,
    },
    title: {
        type: String,
        default: () => `Chat - ${new Date().toLocaleDateString()}`,
    },
    messages: [message_schema],
    // Summarization context fields
    summary: {
        type: String,
        default: '',
    },
    summaryTokens: {
        type: Number,
        default: 0,
    },
    lastSummarizedAt: {
        type: Date,
        default: null,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
}, {
    timestamps: true,
});
chat_schema.index({ user: 1, conversationId: 1 });
const ChatMessage = mongoose_1.models.ChatMessage || (0, mongoose_1.model)("ChatMessage", chat_schema);
exports.default = ChatMessage;
