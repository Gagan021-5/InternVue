import "dotenv/config";
import express from "express";
import cors from "cors";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import jobRoutes from "./routes/jobRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import voiceRoutes from "./routes/voiceRoutes.js";
import testRapidApiRoutes from "./routes/testRapidApiRoutes.js";

const requiredEnvVars = ["MONGO_URI", "RAPIDAPI_KEY", "RAPIDAPI_HOST"];
const missingRequiredEnvVars = requiredEnvVars.filter(
  (key) => !process.env[key] || !String(process.env[key]).trim()
);

if (missingRequiredEnvVars.length > 0) {
  console.error(
    `[startup] Missing required environment variables: ${missingRequiredEnvVars.join(", ")}`
  );
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

app.use((err, _req, res, _next) => {
  console.error("Global API Error:", err.stack);
  res.status(500).json({ error: "An unexpected error occurred. Please try again later." });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
