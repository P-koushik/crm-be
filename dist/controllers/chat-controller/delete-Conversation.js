"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.delete_conversation = void 0;
const zod_1 = require("zod");
const chat_Model_1 = __importDefault(require("../../models/chat-Model"));
const throw_error_1 = require("../../utils/throw-error");
const delete_conversation_schema = zod_1.z.object({
    params: zod_1.z.object({
        conversationId: zod_1.z.string().min(1, "Conversation ID is required"),
    }),
});
const delete_conversation = async (req, res) => {
    const validated_data = delete_conversation_schema.parse(req);
    const { conversationId } = validated_data.params;
    const auth_req = req;
    const user_id = auth_req.user.uid;
    const result = await chat_Model_1.default.deleteOne({ conversationId: conversationId, user: user_id });
    if (result.deletedCount === 0) {
        throw new throw_error_1.TAppError("Conversation not found", 404);
    }
    res.json({ message: "Conversation deleted successfully" });
};
exports.delete_conversation = delete_conversation;
