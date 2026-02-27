import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import jobRoutes from "./routes/jobRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import voiceRoutes from "./routes/voiceRoutes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, ".env") });

const required = ["MONGO_URI", "ADZUNA_APP_ID", "ADZUNA_APP_KEY", "GEMINI_API_KEY", "ELEVENLABS_API_KEY"];
required.forEach((key) => {
  if (!process.env[key]) console.warn(`Missing env var: ${key}`);
});

await connectDB();

const app = express();

app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:3000"],
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));

app.use("/api/auth", authRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/user/jobs", userRoutes);
app.use("/api/voice", voiceRoutes);

app.get("/", (req, res) =>
  res.json({
    message: "InternVue API running",
    version: "4.0.0",
    auth: "Firebase Admin SDK",
  })
);

// Global Error Boundary for Express Routes
app.use((err, req, res, next) => {
  console.error("Global API Error:", err.stack);
  res.status(500).json({ error: "An unexpected error occurred. Please try again later." });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
