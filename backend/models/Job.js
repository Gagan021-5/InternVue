import mongoose from "mongoose";



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
  // AI Enriched Fields
  roleCategory: {
    type: String,
    enum: ["Full Stack", "SDE", "Frontend", "Backend", "Data Science", "AI/ML", "DevOps", "Cloud", "Mobile", "Cybersecurity", "Other"],
    default: "Other"
  },
  seniorityLevel: { type: String, default: "Internship" },
  companyTier: {
    type: String,
    enum: ["Tier1", "Tier2", "Startup", "Unknown"],
    default: "Unknown"
  },
  qualityScore: { type: Number, min: 1, max: 10, default: 5 },
  skills: [{ type: String }],

  // Dynamic Ranking 
  redirectPenalty: { type: Number, default: 0 },

  // System
  isEnriched: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

jobSchema.index({ companyTier: 1, qualityScore: -1 });
jobSchema.index({ roleCategory: 1, location: 1 });
jobSchema.index({ title: "text", company: "text", skills: "text", location: "text" });
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
