import express from "express";
import { streamMentorVoice, generateSpeech } from "../controllers/voiceController.js";
import { protect, studentOnly } from "../middleware/firebaseAuthMiddleware.js";

const router = express.Router();

const audioBlobParser = express.raw({
  limit: "20mb",
  type: (req) => {
    const contentType = (req.headers["content-type"] || "").toLowerCase();
    return contentType.startsWith("audio/") || contentType.startsWith("application/octet-stream");
  },
});

router.post("/mentor", protect, studentOnly, audioBlobParser, streamMentorVoice);
router.post("/generate", protect, studentOnly, generateSpeech);

export default router;
