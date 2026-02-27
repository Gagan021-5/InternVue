import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  firebaseUid: { type: String, required: true, unique: true, index: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  name: { type: String, required: true, trim: true },
  photoURL: { type: String, default: "" },
  role: { type: String, enum: ["student", "admin"], default: "student" },
  githubUrl: { type: String, default: "" },
  portfolioUrl: { type: String, default: "" },
  resumeUrl: { type: String, default: "" },
  bio: { type: String, default: "" },
  skills: { type: [String], default: [] },
  location: {
    city: { type: String, default: "" },
    state: { type: String, default: "" },
    country: { type: String, default: "" },
  },
  authProviders: { type: [String], default: [] },
  createdAt: { type: Date, default: Date.now },
  lastLoginAt: { type: Date, default: Date.now },
});

const User = mongoose.model("User", userSchema);

export default User;
