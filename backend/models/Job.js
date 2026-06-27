import mongoose from "mongoose";



const jobSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  company: { type: String, required: true, trim: true },
  location: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  applyUrl: { type: String, required: true, trim: true },
  salary: { type: String, default: "Not Disclosed" },
  tags: { type: [String], default: [] },
  source: { type: String, enum: ["local", "apify"], default: "local" },
  externalId: { type: String, trim: true, default: null },
  isVerified: { type: Boolean, default: false },
  postedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  coordinates: {
    lat: { type: Number, default: null },
    lng: { type: Number, default: null },
  },
  // AI Enriched Fields
  roleCategory: {
    type: String,
    enum: ["Full Stack", "SDE", "Frontend", "Backend", "Data Science", "AI/ML", "DevOps", "Cloud", "Mobile", "Cybersecurity", "HR", "Marketing", "Sales", "Finance", "Content", "Design", "Other"],
    default: "Other"
  },
  seniorityLevel: { type: String, default: "Internship" },
  qualityScore: { type: Number, min: 1, max: 10, default: 5 },
  skills: [{ type: String }],
  authenticityScore: { type: Number, default: 50 },
  fitScore: { type: Number, default: 50 },
  confidence: { type: Number, default: 0.5 },
  summary: { type: String, default: "" },
  redFlags: { type: [String], default: [] },
  strengths: { type: [String], default: [] },
  interviewQuestions: { type: [String], default: [] },
  aiAnalysis: { type: mongoose.Schema.Types.Mixed, default: null },

  // Dynamic Ranking 
  redirectPenalty: { type: Number, default: 0 },

  // System
  isEnriched: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

jobSchema.index({ qualityScore: -1 });
jobSchema.index({ roleCategory: 1, location: 1 });
jobSchema.index({ title: "text", company: "text", skills: "text", location: "text" });
jobSchema.index(
  { source: 1, externalId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      source: "apify",
      externalId: { $type: "string" },
    },
  }
);

const Job = mongoose.model("Job", jobSchema);

export default Job;
