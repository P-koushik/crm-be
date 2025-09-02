"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const types_1 = require("../types");
const message_history_schema = new mongoose_1.Schema({
    user: { type: String, required: true },
    contactId: { type: String, required: true },
    contactName: { type: String, required: true },
    phoneNumber: { type: String, required: true },
    messageContent: { type: String, required: true },
    status: {
        type: String,
        enum: Object.values(types_1.MessageStatus),
        default: types_1.MessageStatus.PENDING,
        required: true,
    },
    smsMessageId: { type: String },
    prompt: { type: String, required: true },
    generatedAt: { type: Date, default: Date.now },
    sentAt: { type: Date },
    deliveredAt: { type: Date },
    readAt: { type: Date },
    errorMessage: { type: String },
    metadata: {
        aiModel: { type: String },
        contextUsed: [{ type: String }],
        generationTime: { type: Number },
        tokenCount: { type: Number },
        inputTokens: { type: Number },
        outputTokens: { type: Number },
    },
});
// Index for efficient querying
message_history_schema.index({ user: 1, contactId: 1, generatedAt: -1 });
message_history_schema.index({ status: 1 });
message_history_schema.index({ smsMessageId: 1 });
const MessageHistory = mongoose_1.models.MessageHistory || (0, mongoose_1.model)("MessageHistory", message_history_schema);
exports.default = MessageHistory;
