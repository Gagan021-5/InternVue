import SavedJob from "../models/SavedJob.js";
import { generateOutreachEmail } from "../services/geminiService.js";

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
      { new: true }
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

    // Fetch the saved job for this user to get the job context
    const savedJobResult = await SavedJob.findOne({ userId: req.user._id, jobId });
    if (!savedJobResult) {
      return res.status(404).json({ error: "Saved job not found." });
    }

    // Call Gemini Service
    const emailDraft = await generateOutreachEmail(req.user, savedJobResult.jobData);

    return res.json({ success: true, draft: emailDraft });
  } catch (error) {
    console.error("generateOutreach error:", error.message);
    return res.status(500).json({ error: error.message || "Failed to generate outreach email." });
  }
};
