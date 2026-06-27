import express from "express";
import { handleMentorChat } from "../controllers/chatController.js";
import { protect } from "../middleware/firebaseAuthMiddleware.js";

const router = express.Router();

// POST /api/chat/mentor — Groq-powered AI Mentor chat
router.post("/mentor", protect, handleMentorChat);

export default router;
