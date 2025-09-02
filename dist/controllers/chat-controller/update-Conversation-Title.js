"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.update_conversation_title = void 0;
const zod_1 = require("zod");
const chat_Model_1 = __importDefault(require("../../models/chat-Model"));
const throw_error_1 = require("../../utils/throw-error");
// Zod Schema for validation
const update_conversation_title_schema = zod_1.z.object({
    params: zod_1.z.object({
        conversationId: zod_1.z.string().min(1, "Conversation ID is required"),
    }),
    body: zod_1.z.object({
        title: zod_1.z.string().min(1, "Title is required").max(100, "Title must be less than 100 characters"),
    }),
});
const update_conversation_title = async (req, res) => {
    // Validate request
    const validated_data = update_conversation_title_schema.parse(req);
    const { conversationId } = validated_data.params;
    const { title } = validated_data.body;
    const auth_req = req;
    const user_id = auth_req.user.uid;
    if (!user_id) {
        throw new throw_error_1.TAppError('User not authenticated', 401);
    }
    // Find and update the conversation title
    const updated_conversation = await chat_Model_1.default.findOneAndUpdate({
        conversationId: conversationId,
        user: user_id
    }, {
        title: title.trim(),
        updatedAt: new Date()
    }, {
        new: true,
        runValidators: true
    });
    if (!updated_conversation) {
        throw new throw_error_1.TAppError('Conversation not found', 404);
    }
    res.status(200).json({
        message: 'Conversation title updated successfully',
        title: updated_conversation.title
    });
};
exports.update_conversation_title = update_conversation_title;
