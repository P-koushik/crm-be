"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.get_chat_history = void 0;
const chat_Model_1 = __importDefault(require("../../models/chat-Model"));
const throw_error_1 = require("../../utils/throw-error");
const get_chat_history = async (req, res) => {
    const authReq = req;
    if (!authReq.user) {
        throw new throw_error_1.TAppError("User not authenticated", 401);
    }
    const user_id = authReq.user.uid;
    const conversations = await chat_Model_1.default.find({ user: user_id }).sort({ updatedAt: -1 });
    const conversations_with_context = conversations.map(conv => ({
        ...conv.toObject(),
        hasCRMContext: true,
    }));
    res.json({
        message: "Chat history fetched successfully",
        data: { conversations: conversations_with_context }
    });
};
exports.get_chat_history = get_chat_history;
