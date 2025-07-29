import express from 'express';
import { 
  getChatHistory, 
  handleChatMessage, 
  getConversation, 
  deleteConversation, 
  updateConversationTitle,
} from '../controllers/chatController';
import authMiddleware from '../authMiddleware';

const router = express.Router();
router.get('/chat/history', authMiddleware, getChatHistory);
router.post('/chat/send', authMiddleware, handleChatMessage);
router.get('/chat/conversation/:conversationId', authMiddleware, getConversation);
router.delete('/chat/conversation/:conversationId', authMiddleware, deleteConversation);
router.put('/chat/conversation/:conversationId/title', authMiddleware, updateConversationTitle);


export default router;