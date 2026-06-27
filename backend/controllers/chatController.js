import mongoose from "mongoose";
import Job from "../models/Job.js";
import { getContextualChatReply } from "../services/groqService.js";

// ---------------------------------------------------------------------------
// POST /api/chat/mentor
// Authenticated AI Mentor chat endpoint powered by Groq (sub-second latency).
// Compares candidate profile against job requirements and provides
// actionable career guidance with referral or cold outreach strategies.
// ---------------------------------------------------------------------------

export const handleMentorChat = async (req, res) => {
  try {
    const { jobId, message, chatHistory = [], replyMode = "text", voicePreference = "female" } = req.body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ error: "A non-empty message is required." });
    }

    // Fetch the job being viewed if jobId is provided
    let job = null;

    if (jobId) {
      if (mongoose.Types.ObjectId.isValid(jobId)) {
        job = await Job.findById(jobId).lean();
      }

      if (!job) {
        job = await Job.findOne({ source: "apify", externalId: String(jobId) }).lean();
      }

      if (!job) {
        return res.status(404).json({ error: "Job not found." });
      }
    }

    // req.user is populated by the protect middleware (contains skills,
    // extractedResumeText, bio, displayName, etc.)
    const result = await getContextualChatReply(
      req.user,
      job,
      message.trim(),
      Array.isArray(chatHistory) ? chatHistory : [],
      { replyMode, voicePreference }
    );

    return res.json({
      success: true,
      reply: result.reply,
      isInterviewMode: result.isInterviewMode,
      audioUrl: result.audioUrl || null,
    });
  } catch (error) {
    console.error("[handleMentorChat] Error:", error.message);
    return res.status(500).json({ error: "Failed to generate mentor reply." });
  }
};
