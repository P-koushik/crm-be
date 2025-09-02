"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.get_conversation = void 0;
const zod_1 = require("zod");
const chat_Model_1 = __importDefault(require("../../models/chat-Model"));
const throw_error_1 = require("../../utils/throw-error");
const get_conversation_schema = zod_1.z.object({
    params: zod_1.z.object({
        conversationId: zod_1.z.string().min(1, "Conversation ID is required"),
    }),
});
const get_conversation = async (req, res) => {
    const validated_data = get_conversation_schema.parse(req);
    const { conversationId } = validated_data.params;
    const auth_req = req;
    const user_id = auth_req.user.uid;
    if (!user_id) {
        throw new throw_error_1.TAppError('User not authenticated', 401);
    }
    const conversation = await chat_Model_1.default.findOne({
        conversationId: conversationId,
        user: user_id
    });
    if (!conversation) {
        throw new throw_error_1.TAppError('Conversation not found', 404);
    }
    res.status(200).json({
        message: 'Conversation retrieved successfully',
        conversation
    });
};
exports.get_conversation = get_conversation;
