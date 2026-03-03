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
import testRapidApiRoutes from "./routes/testRapidApiRoutes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, ".env") });

// ─── ENV VALIDATION (soft warnings, hard-fail only for MONGO_URI) ──────────
const required = [
  "MONGO_URI",
  "ADZUNA_APP_ID",
  "ADZUNA_APP_KEY",
  "GEMINI_API_KEY",
  "ELEVENLABS_API_KEY",
  "JSEARCH_API_KEY",
  "RAPIDAPI_KEY",
  "RAPIDAPI_HOST",
];
const missing = required.filter((key) => !process.env[key]);
if (missing.length) {
  missing.forEach((key) => console.warn(`⚠️  Missing env var: ${key}`));
}
if (!process.env.MONGO_URI) {
  console.error("\n❌  MONGO_URI is required. Server cannot start without a database.\n");
  process.exit(1);
}

await connectDB();

const app = express();

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:3000",
      "http://localhost:5000",
      "https://internvue.onrender.com",
    ],
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));

// ─── ROUTES ────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/user/jobs", userRoutes);
app.use("/api/voice", voiceRoutes);
app.use("/api/test-rapidapi", testRapidApiRoutes);

app.get("/", (_req, res) =>
  res.json({
    message: "InternVue API running",
    version: "4.0.0",
    auth: "Firebase Admin SDK",
  })
);

// ─── GLOBAL ERROR BOUNDARY ────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error("Global API Error:", err.stack);
  res.status(500).json({ error: "An unexpected error occurred. Please try again later." });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
