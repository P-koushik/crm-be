"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const handle_Chat_Message_1 = require("../controllers/chat-controller/handle-Chat-Message");
const get_Chat_History_1 = require("../controllers/chat-controller/get-Chat-History");
const get_Conversation_1 = require("../controllers/chat-controller/get-Conversation");
const delete_Conversation_1 = require("../controllers/chat-controller/delete-Conversation");
const update_Conversation_Title_1 = require("../controllers/chat-controller/update-Conversation-Title");
const auth_Middleware_1 = __importDefault(require("../middlewares/auth-Middleware"));
const router = express_1.default.Router();
router.post('/chat/send', auth_Middleware_1.default, handle_Chat_Message_1.handle_chat_message);
router.get('/chat/history', auth_Middleware_1.default, get_Chat_History_1.get_chat_history);
router.get('/chat/conversation/:conversationId', auth_Middleware_1.default, get_Conversation_1.get_conversation);
router.delete('/chat/conversation/:conversationId', auth_Middleware_1.default, delete_Conversation_1.delete_conversation);
router.put('/chat/conversation/:conversationId/title', auth_Middleware_1.default, update_Conversation_Title_1.update_conversation_title);
exports.default = router;
