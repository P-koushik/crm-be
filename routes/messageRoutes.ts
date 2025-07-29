import express from "express";
import authMiddleware from "../authMiddleware";
import { generate_message, send_message } from "../controllers/messageController";

const router = express.Router();

// Generate WhatsApp messages using RAG
router.post("/generate-message", authMiddleware, generate_message);

// Send WhatsApp messages
router.post("/send-message", authMiddleware, send_message);

export default router;