import "dotenv/config";
import express from "express";
import cors from "cors";
import cron from "node-cron";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import jobRoutes from "./routes/jobRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import { fetchApifyInternships } from "./services/apifyService.js";
import { processApifyItems, triggerBackgroundEnrichment } from "./controllers/jobController.js";

// ---------------------------------------------------------------------------
// Startup Validation
// ---------------------------------------------------------------------------

const requiredEnvVars = ["MONGO_URI"];
const missingRequiredEnvVars = requiredEnvVars.filter(
  (key) => !process.env[key] || !String(process.env[key]).trim()
);

if (missingRequiredEnvVars.length > 0) {
  console.error(
    `[startup] Missing required environment variables: ${missingRequiredEnvVars.join(", ")}`
  );
  process.exit(1);
}

if (!process.env.APIFY_TOKEN) {
  console.warn(
    "[startup] APIFY_TOKEN is not set. Background cron and Apify sync will be disabled."
  );
}

await connectDB();
triggerBackgroundEnrichment().catch((err) =>
  console.error("[startup] Background enrichment failed to start:", err.message)
);

// ---------------------------------------------------------------------------
// Express App
// ---------------------------------------------------------------------------

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
app.use("/api/chat", chatRoutes);

app.get("/", (_req, res) =>
  res.json({
    message: "InternVue API running",
    version: "5.0.0",
    auth: "Firebase Admin SDK",
    ingestion: "Apify + node-cron",
  })
);

app.use((err, _req, res, _next) => {
  console.error("Global API Error:", err.stack);
  res.status(500).json({ error: "An unexpected error occurred. Please try again later." });
});

// ---------------------------------------------------------------------------
// Background Cron: Nightly Apify Internship Ingestion (2:00 AM daily)
// ---------------------------------------------------------------------------

const CRON_TARGET_ROLES = [
  "Software Engineer Intern",
  "Frontend Developer Intern",
  "Backend Developer Intern",
  "Data Science Intern",
  "AI ML Intern",
  "Full Stack Developer Intern",
  "DevOps Intern",
  "Cloud Engineering Intern",
  "Cybersecurity Intern",
  "Mobile Developer Intern",
];

/**
 * Runs the full ingestion pipeline for all target roles.
 * Called by the nightly cron job.
 */
const runNightlyIngestion = async () => {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`[cron] Nightly internship ingestion started at ${new Date().toISOString()}`);
  console.log(`${"=".repeat(60)}\n`);

  let totalFetched = 0;
  let totalFiltered = 0;
  let totalSaved = 0;

  for (const role of CRON_TARGET_ROLES) {
    try {
      console.log(`[cron] Fetching: "${role}"...`);
      const items = await fetchApifyInternships(role);

      if (items.length > 0) {
        const stats = await processApifyItems(items);
        totalFetched += stats.fetched;
        totalFiltered += stats.filtered;
        totalSaved += stats.saved;
        console.log(
          `[cron] "${role}" — fetched: ${stats.fetched}, filtered: ${stats.filtered}, saved: ${stats.saved}`
        );
      } else {
        console.log(`[cron] "${role}" — 0 items returned.`);
      }
    } catch (err) {
      console.error(`[cron] Failed for "${role}":`, err.message);
    }
  }

  console.log(`\n${"=".repeat(60)}`);
  console.log(
    `[cron] Nightly ingestion complete at ${new Date().toISOString()}`
  );
  console.log(
    `[cron] Totals — fetched: ${totalFetched}, filtered: ${totalFiltered}, saved: ${totalSaved}`
  );
  console.log(`${"=".repeat(60)}\n`);
};

// Schedule: every day at 2:00 AM server time
if (process.env.APIFY_TOKEN) {
  cron.schedule("0 2 * * *", () => {
    runNightlyIngestion().catch((err) => {
      console.error("[cron] Unhandled error in nightly ingestion:", err.message);
    });
  });
  console.log("[cron] Nightly internship ingestion scheduled at 2:00 AM.");
} else {
  console.log("[cron] Skipping cron schedule — APIFY_TOKEN not configured.");
}

// ---------------------------------------------------------------------------
// Start Server
// ---------------------------------------------------------------------------

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
