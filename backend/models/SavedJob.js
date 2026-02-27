import mongoose from "mongoose";

const savedJobSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  jobId: { type: String, required: true },
  jobData: { type: mongoose.Schema.Types.Mixed, required: true },
  savedAt: { type: Date, default: Date.now },
  notes: { type: String, default: "" },
  status: {
    type: String,
    enum: ["saved", "applied", "interviewing", "rejected", "accepted"],
    default: "saved",
  },
});

savedJobSchema.index({ userId: 1, jobId: 1 }, { unique: true });

const SavedJob = mongoose.model("SavedJob", savedJobSchema);

export default SavedJob;
