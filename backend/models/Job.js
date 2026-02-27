import mongoose from "mongoose";

const aiAnalysisSchema = new mongoose.Schema(
  {
    authenticityScore: { type: Number, min: 0, max: 100, default: 0 },
    fitScore: { type: Number, min: 0, max: 100, default: 0 },
    confidence: { type: Number, min: 0, max: 1, default: 0 },
    summary: { type: String, default: "" },
    redFlags: { type: [String], default: [] },
    strengths: { type: [String], default: [] },
    interviewQuestions: { type: [String], default: [] },
    extractedSkills: { type: [String], default: [] },
    analyzedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const jobSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  company: { type: String, required: true, trim: true },
  location: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  applyUrl: { type: String, required: true, trim: true },
  salary: { type: String, default: "Not Disclosed" },
  tags: { type: [String], default: [] },
  source: { type: String, enum: ["local", "adzuna"], default: "local" },
  externalId: { type: String, trim: true, default: null },
  isVerified: { type: Boolean, default: false },
  postedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  coordinates: {
    lat: { type: Number, default: null },
    lng: { type: Number, default: null },
  },
  aiAnalysis: { type: aiAnalysisSchema, default: null },
  createdAt: { type: Date, default: Date.now },
});

jobSchema.index({ title: "text", company: "text", location: "text", description: "text" });
jobSchema.index(
  { source: 1, externalId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      source: "adzuna",
      externalId: { $type: "string" },
    },
  }
);

const Job = mongoose.model("Job", jobSchema);

export default Job;
