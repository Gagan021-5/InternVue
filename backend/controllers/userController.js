import SavedJob from "../models/SavedJob.js";
import Job from "../models/Job.js";
import { generateOutreachEmail, generateJobAssistantReply, extractResumeTextWithGemini } from "../services/geminiService.js";

export const saveJob = async (req, res) => {
  try {
    const { jobId, jobData } = req.body;

    if (!jobId || !jobData) {
      return res.status(400).json({ error: "jobId and jobData are required." });
    }

    const saved = await SavedJob.create({
      userId: req.user._id,
      jobId,
      jobData,
    });

    return res.status(201).json({ success: true, saved });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: "Job already saved." });
    }
    console.error("saveJob error:", error.message);
    return res.status(500).json({ error: "Failed to save job." });
  }
};

export const unsaveJob = async (req, res) => {
  try {
    await SavedJob.findOneAndDelete({ userId: req.user._id, jobId: req.params.jobId });
    return res.json({ success: true });
  } catch (error) {
    console.error("unsaveJob error:", error.message);
    return res.status(500).json({ error: "Failed to remove saved job." });
  }
};

export const getSavedJobs = async (req, res) => {
  try {
    const saved = await SavedJob.find({ userId: req.user._id }).sort({ savedAt: -1 });
    return res.json({ jobs: saved });
  } catch (error) {
    console.error("getSavedJobs error:", error.message);
    return res.status(500).json({ error: "Failed to fetch saved jobs." });
  }
};

export const updateJobStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const updated = await SavedJob.findOneAndUpdate(
      { userId: req.user._id, jobId: req.params.jobId },
      { $set: { status } },
      { returnDocument: "after" }
    );

    if (!updated) {
      return res.status(404).json({ error: "Saved job not found." });
    }

    return res.json({ success: true, job: updated });
  } catch (error) {
    console.error("updateJobStatus error:", error.message);
    return res.status(500).json({ error: "Failed to update status." });
  }
};

export const generateOutreach = async (req, res) => {
  try {
    const { jobId } = req.params;
    let jobData = null;

    // Fetch the saved job for this user to get the job context
    const savedJobResult = await SavedJob.findOne({ userId: req.user._id, jobId });
    if (savedJobResult) {
      jobData = savedJobResult.jobData;
    } else {
      // Fallback: fetch from main Job collection
      const mainJob = await Job.findById(jobId).lean();
      if (mainJob) {
        jobData = mainJob;
      }
    }

    if (!jobData) {
      return res.status(404).json({ error: "Job details not found to generate outreach." });
    }

    // Call Gemini Service
    const emailDraft = await generateOutreachEmail(req.user, jobData);

    return res.json({ success: true, draft: emailDraft });
  } catch (error) {
    console.error("generateOutreach error:", error.message);
    return res.status(500).json({ error: error.message || "Failed to generate outreach email." });
  }
};

export const generateJobChat = async (req, res) => {
  try {
    const { jobId } = req.params;
    const { messages } = req.body;
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "Chat messages are required." });
    }

    let jobData = null;
    const savedJobResult = await SavedJob.findOne({ userId: req.user._id, jobId });
    if (savedJobResult) {
      jobData = savedJobResult.jobData;
    } else {
      const mainJob = await Job.findById(jobId).lean();
      if (mainJob) {
        jobData = mainJob;
      }
    }

    if (!jobData) {
      return res.status(404).json({ error: "Job details not found for chat assistant." });
    }

    const reply = await generateJobAssistantReply(req.user, jobData, messages);
    return res.json({ success: true, reply });
  } catch (error) {
    console.error("generateJobChat error:", error.message);
    return res.status(500).json({ error: error.message || "Failed to generate chat reply." });
  }
};

export const uploadResume = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No resume PDF file uploaded." });
    }

    if (req.file.mimetype !== "application/pdf") {
      return res.status(400).json({ error: "Invalid file type. Only PDF resumes are supported." });
    }

    console.log(`[uploadResume] Starting resume text extraction for user ${req.user.email}...`);

    // Parse the PDF buffer using Gemini's native PDF ingestion
    const extractedText = await extractResumeTextWithGemini(req.file.buffer);

    // Save the extracted text directly into user record in MongoDB
    req.user.extractedResumeText = extractedText;
    
    // Also save dummy or placeholder resumeUrl if needed, e.g. "Cached PDF Text"
    req.user.resumeUrl = "AI Extracted Profile";
    
    await req.user.save();

    console.log(`[uploadResume] Successfully parsed and cached resume text (${extractedText.length} chars) for ${req.user.email}`);

    return res.json({
      success: true,
      message: "Resume uploaded and parsed successfully.",
      user: {
        resumeUrl: req.user.resumeUrl,
        extractedResumeText: req.user.extractedResumeText
      }
    });
  } catch (error) {
    console.error("[uploadResume] Resume parsing error:", error.message);
    return res.status(500).json({ error: error.message || "Failed to upload and parse resume." });
  }
};
