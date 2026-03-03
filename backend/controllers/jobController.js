import axios from "axios";
import mongoose from "mongoose";
import Job from "../models/Job.js";
import { applyAuthenticityFilter } from "../middleware/authenticityFilter.js";
import { analyzeJobWithGemini } from "../services/geminiService.js";
import { enrichJobWithAI } from "../services/aiService.js";
import { fetchJSearchJobs } from "../services/jsearchService.js";

const parsePositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const escapeRegex = (value = "") => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const ADZUNA_RESULTS_PER_PAGE = 50;
const ADZUNA_MAX_PAGES = clamp(parsePositiveInt(process.env.ADZUNA_MAX_PAGES, 10), 1, 10);
const ADZUNA_SEARCH_PAGES = clamp(parsePositiveInt(process.env.ADZUNA_SEARCH_PAGES, 3), 1, 5);
const ADZUNA_SYNC_COOLDOWN_MS = clamp(
  parsePositiveInt(process.env.ADZUNA_SYNC_COOLDOWN_MS, 1000 * 60 * 30),
  1000 * 60,
  1000 * 60 * 60 * 24
);
const GEMINI_ANALYSIS_DELAY_MS = Math.max(
  12000,
  parsePositiveInt(process.env.GEMINI_ANALYSIS_DELAY_MS, 15000)
);
const GEMINI_ANALYSIS_BATCH_SIZE = clamp(
  parsePositiveInt(process.env.GEMINI_ANALYSIS_BATCH_SIZE, 1),
  1,
  5
);

const adzunaStopWords = new Set([
  "internship",
  "intern",
  "engineer",
  "developer",
  "fullstack",
  "full-stack",
  "software",
  "remote",
  "junior",
  "entry",
  "level",
]);

const parseRadius = (radius) => {
  const normalized = String(radius || "").trim().toLowerCase();
  if (!normalized) return { remoteOnly: false, distanceKm: null };
  if (normalized === "remote") return { remoteOnly: true, distanceKm: null };
  const numeric = parsePositiveInt(normalized, null);
  return {
    remoteOnly: false,
    distanceKm: numeric ? clamp(numeric, 1, 100) : null,
  };
};

const pendingAdzunaAnalysisQuery = {
  source: "adzuna",
  $or: [
    { aiAnalysis: null },
    { "aiAnalysis.summary": { $exists: false } },
    { "aiAnalysis.summary": "" },
  ],
};

let adzunaSyncPromise = null;
let lastAdzunaSyncAt = 0;
let analysisWorkerRunning = false;
let lastGeminiAnalysisAt = 0;

const hasAdzunaConfig = () =>
  Boolean(
    process.env.ADZUNA_BASE_URL &&
    process.env.ADZUNA_COUNTRY &&
    process.env.ADZUNA_APP_ID &&
    process.env.ADZUNA_APP_KEY
  );

const extractTitleTags = (title = "") => {
  const words = title
    .split(/[\s,/()+-]+/)
    .map((word) => word.trim())
    .filter((word) => word.length > 2)
    .filter((word) => !adzunaStopWords.has(word.toLowerCase()));

  return [...new Set(words)].slice(0, 4);
};

const normalizeAdzunaJobForDb = (adzunaJob) => {
  const parsedCreatedAt = new Date(adzunaJob.created || Date.now());

  return {
    externalId: String(adzunaJob.id),
    title: adzunaJob.title || "Internship Opportunity",
    company: adzunaJob.company?.display_name || "Unknown Company",
    location: adzunaJob.location?.display_name || "Remote",
    description: adzunaJob.description || "",
    applyUrl: adzunaJob.redirect_url || "",
    salary: adzunaJob.salary_min
      ? `$${adzunaJob.salary_min} - $${adzunaJob.salary_max || adzunaJob.salary_min}`
      : "Not Disclosed",
    source: "adzuna",
    isVerified: false,
    tags: extractTitleTags(adzunaJob.title || ""),
    coordinates: {
      lat: adzunaJob.latitude ?? null,
      lng: adzunaJob.longitude ?? null,
    },
    createdAt: Number.isNaN(parsedCreatedAt.getTime()) ? new Date() : parsedCreatedAt,
  };
};

const fetchAdzunaPages = async ({
  location = "",
  role = "",
  radius = "",
  maxPages = ADZUNA_MAX_PAGES,
} = {}) => {
  if (!hasAdzunaConfig()) {
    return [];
  }

  const { remoteOnly, distanceKm } = parseRadius(radius);
  const normalizedRole = String(role || "").trim();
  const normalizedLocation = remoteOnly ? "" : String(location || "").trim();
  const whatValue = remoteOnly
    ? `${normalizedRole ? `${normalizedRole} ` : ""}remote internship`
    : `${normalizedRole ? `${normalizedRole} ` : ""}internship`;

  const collected = [];

  for (let pageNumber = 1; pageNumber <= maxPages; pageNumber += 1) {
    const adzunaUrl = `${process.env.ADZUNA_BASE_URL}/${process.env.ADZUNA_COUNTRY}/search/${pageNumber}`;
    const response = await axios.get(adzunaUrl, {
      params: {
        app_id: process.env.ADZUNA_APP_ID,
        app_key: process.env.ADZUNA_APP_KEY,
        results_per_page: ADZUNA_RESULTS_PER_PAGE,
        what: whatValue,
        where: normalizedLocation,
        distance: distanceKm || undefined,
      },
      timeout: 10000,
    });

    const pageResults = Array.isArray(response.data?.results) ? response.data.results : [];
    collected.push(...pageResults);

    if (pageResults.length < ADZUNA_RESULTS_PER_PAGE) {
      break;
    }
  }

  return collected;
};

// Ingestion Layer
export const fetchAndEnrichJobs = async (req, res) => {
  try {
    // 1. Fetch from Adzuna automatically
    const adzunaRawJobs = await fetchAdzunaPages({ maxPages: ADZUNA_MAX_PAGES });
    const normalizedAdzunaJobs = adzunaRawJobs
      .filter((job) => job?.id)
      .map((job) => normalizeAdzunaJobForDb(job));

    // 2. Fetch from JSearch automatically
    const normalizedJSearchJobs = await fetchJSearchJobs("software engineer internship", 2);
    const normalizedJobs = [...normalizedAdzunaJobs, ...normalizedJSearchJobs];

    let newJobsCount = 0;

    // 3. Process and enrich only new jobs
    for (const normalizedJob of normalizedJobs) {
      if (!normalizedJob?.externalId) {
        continue;
      }
      if (!normalizedJob.applyUrl) {
        continue;
      }

      const source = normalizedJob.source === "adzuna" ? "adzuna" : "local";
      const externalId = String(normalizedJob.externalId);
      const exists = await Job.findOne({ source, externalId }).lean();
      if (exists) {
        continue;
      }

      let jobDoc = {
        title: normalizedJob.title || "Internship Opportunity",
        company: normalizedJob.company || "Unknown Company",
        location: normalizedJob.location || "Remote",
        description: normalizedJob.description || "No description provided.",
        applyUrl: normalizedJob.applyUrl || "",
        salary: normalizedJob.salary || "Not Disclosed",
        source,
        externalId,
        isVerified: Boolean(normalizedJob.isVerified),
        tags: Array.isArray(normalizedJob.tags) ? normalizedJob.tags : [],
        coordinates: {
          lat: Number.isFinite(Number(normalizedJob.coordinates?.lat))
            ? Number(normalizedJob.coordinates.lat)
            : null,
          lng: Number.isFinite(Number(normalizedJob.coordinates?.lng))
            ? Number(normalizedJob.coordinates.lng)
            : null,
        },
        createdAt: normalizedJob.createdAt || new Date(),
        redirectPenalty: Number.isFinite(normalizedJob.redirectPenalty)
          ? normalizedJob.redirectPenalty
          : 0,
      };

      // 4. AI enrichment
      const aiData = await enrichJobWithAI(jobDoc.title, jobDoc.company, jobDoc.description);

      if (aiData) {
        jobDoc = { ...jobDoc, ...aiData, isEnriched: true };
      }

      await Job.create(jobDoc);
      newJobsCount++;
    }

    res.status(200).json({ message: "Ingestion and AI enrichment complete.", newJobsCount });
  } catch (error) {
    console.error("fetchAndEnrichJobs Error:", error.message);
    res.status(500).json({ error: error.message });
  }
};

export const getJobs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      highQualityOnly = "false",
      role,
      location,
      userSkills = [] // Can be passed from frontend user profile
    } = req.query;

    const matchStage = {};
    if (role) matchStage.roleCategory = role;
    if (location) matchStage.location = new RegExp(escapeRegex(location), "i");
    if (highQualityOnly === "true") matchStage.qualityScore = { $gte: 7 };

    const parsedUserSkills = Array.isArray(userSkills)
      ? userSkills
      : userSkills.split(',').map(s => s.trim().toLowerCase());

    const pipeline = [
      { $match: matchStage },
      {
        $addFields: {
          skillMatchPercentage: {
            $cond: {
              if: { $gt: [{ $size: { $ifNull: ["$skills", []] } }, 0] },
              then: {
                $multiply: [
                  {
                    $divide: [
                      {
                        $size: {
                          $setIntersection: [
                            { $map: { input: "$skills", as: "s", in: { $toLower: "$$s" } } },
                            parsedUserSkills
                          ]
                        }
                      },
                      { $size: "$skills" }
                    ]
                  },
                  100
                ]
              },
              else: 0
            }
          },
          tierWeight: {
            $switch: {
              branches: [
                { case: { $eq: ["$companyTier", "Tier1"] }, then: 10 },
                { case: { $eq: ["$companyTier", "Tier2"] }, then: 6 },
                { case: { $eq: ["$companyTier", "Startup"] }, then: 4 }
              ],
              default: 2
            }
          }
        }
      },
      {
        $addFields: {
          finalScore: {
            $add: [
              "$tierWeight",
              { $multiply: [{ $ifNull: ["$qualityScore", 5] }, 2] },
              { $divide: ["$skillMatchPercentage", 10] },
              { $ifNull: ["$redirectPenalty", 0] }
            ]
          }
        }
      },
      { $sort: { finalScore: -1, createdAt: -1 } },
      { $skip: (Number(page) - 1) * Number(limit) },
      { $limit: Number(limit) }
    ];

    const jobs = await Job.aggregate(pipeline);
    const totalFromDb = await Job.countDocuments(matchStage);

    return res.json({
      jobs,
      total: totalFromDb,
      page: Number(page),
      limit: Number(limit),
      source: "mongodb/ai-ranked"
    });
  } catch (error) {
    console.error("getJobs error:", error.message);
    return res.status(500).json({ error: "Failed to fetch jobs." });
  }
};

export const getJobById = async (req, res) => {
  try {
    const { id } = req.params;
    let job = null;

    if (mongoose.Types.ObjectId.isValid(id)) {
      job = await Job.findById(id).lean();
    }

    if (!job) {
      job = await Job.findOne({ source: "adzuna", externalId: String(id) }).lean();
    }

    if (!job && hasAdzunaConfig()) {
      const adzunaJobs = await fetchAdzunaPages({ maxPages: ADZUNA_MAX_PAGES });
      const match = adzunaJobs.find((item) => String(item.id) === String(id));
      if (match) {
        await upsertAdzunaJobs([match]);
        job = await Job.findOne({ source: "adzuna", externalId: String(id) }).lean();
      }
    }

    if (!job) {
      return res.status(404).json({ error: "Job not found." });
    }

    const filtered = applyAuthenticityFilter([job]);
    if (!filtered.length) {
      return res.status(404).json({ error: "Job not found." });
    }

    if (job.source === "adzuna" && !job.aiAnalysis) {
      queueAdzunaAnalysis(1);
    }

    return res.json({ job: filtered[0] });
  } catch (error) {
    console.error("getJobById error:", error.message);
    return res.status(500).json({ error: "Failed to fetch job." });
  }
};

export const syncAdzunaJobs = async (req, res) => {
  try {
    if (!hasAdzunaConfig()) {
      return res.status(400).json({ error: "Adzuna is not configured." });
    }

    const pages = clamp(parsePositiveInt(req.body?.pages || req.query?.pages, ADZUNA_MAX_PAGES), 1, 10);
    const location = String(req.body?.location || req.query?.location || "").trim();
    const role = String(req.body?.role || req.query?.role || "").trim();
    const radius = String(req.body?.radius || req.query?.radius || "").trim().toLowerCase();

    const stats = await runAdzunaSync({
      force: true,
      location,
      role,
      radius,
      maxPages: pages,
    });

    queueAdzunaAnalysis(GEMINI_ANALYSIS_BATCH_SIZE);

    return res.json({
      success: true,
      stats: stats || { fetched: 0, upserted: 0, modified: 0, matched: 0, pages },
      analyzedInBackground: true,
      geminiDelayMs: GEMINI_ANALYSIS_DELAY_MS,
    });
  } catch (error) {
    console.error("syncAdzunaJobs error:", error.message);
    return res.status(500).json({ error: "Failed to sync Adzuna internships." });
  }
};

export const analyzePendingAdzunaJobs = async (req, res) => {
  try {
    const requestedBatch = clamp(
      parsePositiveInt(req.body?.batchSize || req.query?.batchSize, GEMINI_ANALYSIS_BATCH_SIZE),
      1,
      5
    );
    const result = await runPendingAdzunaAnalysisWorker({ maxJobs: requestedBatch });

    return res.json({
      success: true,
      processed: result.processed,
      skipped: result.skipped,
      geminiDelayMs: GEMINI_ANALYSIS_DELAY_MS,
    });
  } catch (error) {
    console.error("analyzePendingAdzunaJobs error:", error.message);
    return res.status(500).json({ error: "Failed to analyze pending Adzuna jobs." });
  }
};

export const createJob = async (req, res) => {
  try {
    const {
      title,
      company,
      location,
      description,
      applyUrl,
      salary = "Not Disclosed",
      tags = [],
      source = "local",
      isVerified = false,
      externalId = null,
      coordinates = {},
    } = req.body;

    if (!title || !company || !location || !description || !applyUrl) {
      return res.status(400).json({ error: "Missing required job fields." });
    }

    const baseJob = {
      title,
      company,
      location,
      description,
      applyUrl,
      salary,
      tags: Array.isArray(tags) ? tags : [],
      source: source === "adzuna" ? "adzuna" : "local",
      externalId: source === "adzuna" ? String(externalId || "") || null : null,
      isVerified: Boolean(isVerified),
      postedBy: req.user._id,
      coordinates: {
        lat: Number.isFinite(Number(coordinates.lat)) ? Number(coordinates.lat) : null,
        lng: Number.isFinite(Number(coordinates.lng)) ? Number(coordinates.lng) : null,
      },
    };

    const analysis = await analyzeJobWithGemini(baseJob);
    const created = await Job.create({
      ...baseJob,
      aiAnalysis: analysis,
    });

    return res.status(201).json({ job: created });
  } catch (error) {
    console.error("createJob error:", error.message);
    return res.status(500).json({ error: "Failed to create job." });
  }
};
