import mongoose from "mongoose";

const testJobSchema = new mongoose.Schema({
    jobId: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true, trim: true },
    company: { type: String, required: true, trim: true },
    location: { type: String, default: "Unknown", trim: true },
    description: { type: String, default: "" },
    applyUrl: { type: String, required: true, trim: true },
    createdAt: { type: Date, default: Date.now },
});

const TestJob = mongoose.model("TestJob", testJobSchema);

export default TestJob;
