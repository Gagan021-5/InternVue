import axios from "axios";
import mongoose from "mongoose";
import Job from "../models/Job.js";
import { applyAuthenticityFilter } from "../middleware/authenticityFilter.js";
import { analyzeJobWithGemini } from "../services/geminiService.js";

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

const upsertAdzunaJobs = async (adzunaJobs = []) => {
  if (!Array.isArray(adzunaJobs) || adzunaJobs.length === 0) {
    return { fetched: 0, upserted: 0, modified: 0, matched: 0 };
  }

  const deduped = new Map();
  for (const adzunaJob of adzunaJobs) {
    if (!adzunaJob?.id) continue;
    const normalized = normalizeAdzunaJobForDb(adzunaJob);
    deduped.set(normalized.externalId, normalized);
  }

  if (deduped.size === 0) {
    return { fetched: adzunaJobs.length, upserted: 0, modified: 0, matched: 0 };
  }

  const operations = [...deduped.values()].map((job) => ({
    updateOne: {
      filter: {
        source: "adzuna",
        $or: [
          { externalId: job.externalId },
          { applyUrl: job.applyUrl }
        ]
      },
      update: {
        $set: {
          title: job.title,
          company: job.company,
          location: job.location,
          description: job.description,
          applyUrl: job.applyUrl,
          salary: job.salary,
          tags: job.tags,
          coordinates: job.coordinates,
          source: "adzuna",
          isVerified: false,
          externalId: job.externalId,
          createdAt: job.createdAt,
        },
        $setOnInsert: {
          aiAnalysis: null,
        },
      },
      upsert: true,
    },
  }));

  const result = await Job.bulkWrite(operations, { ordered: false });
  return {
    fetched: adzunaJobs.length,
    upserted: result.upsertedCount || 0,
    modified: result.modifiedCount || 0,
    matched: result.matchedCount || 0,
  };
};

const syncAdzunaToMongo = async ({
  location = "",
  role = "",
  radius = "",
  maxPages = ADZUNA_MAX_PAGES,
} = {}) => {
  const adzunaJobs = await fetchAdzunaPages({ location, role, radius, maxPages });
  const stats = await upsertAdzunaJobs(adzunaJobs);
  return { ...stats, pages: maxPages };
};

const runAdzunaSync = async ({
  force = false,
  location = "",
  role = "",
  radius = "",
  maxPages = ADZUNA_MAX_PAGES,
} = {}) => {
  if (!hasAdzunaConfig()) {
    return null;
  }

  const isStale = Date.now() - lastAdzunaSyncAt >= ADZUNA_SYNC_COOLDOWN_MS;
  if (!force && !isStale) {
    return null;
  }

  if (adzunaSyncPromise) {
    return adzunaSyncPromise;
  }

  adzunaSyncPromise = syncAdzunaToMongo({ location, role, radius, maxPages })
    .then((stats) => {
      lastAdzunaSyncAt = Date.now();
      return stats;
    })
    .catch((error) => {
      console.error("Adzuna sync failed:", error.message);
      return null;
    })
    .finally(() => {
      adzunaSyncPromise = null;
    });

  return adzunaSyncPromise;
};

const waitForGeminiRateLimit = async () => {
  const elapsed = Date.now() - lastGeminiAnalysisAt;
  const waitMs = GEMINI_ANALYSIS_DELAY_MS - elapsed;
  if (waitMs > 0) {
    await sleep(waitMs);
  }
  lastGeminiAnalysisAt = Date.now();
};

const runPendingAdzunaAnalysisWorker = async ({ maxJobs = GEMINI_ANALYSIS_BATCH_SIZE } = {}) => {
  if (analysisWorkerRunning) {
    return { processed: 0, skipped: true };
  }

  analysisWorkerRunning = true;
  let processed = 0;

  try {
    while (processed < maxJobs) {
      const pendingJob = await Job.findOne(pendingAdzunaAnalysisQuery).sort({ createdAt: -1 });
      if (!pendingJob) break;

      await waitForGeminiRateLimit();
      const analysis = await analyzeJobWithGemini(pendingJob.toObject());
      pendingJob.aiAnalysis = analysis;
      await pendingJob.save();
      processed += 1;
    }
  } catch (error) {
    console.error("Pending Adzuna analysis failed:", error.message);
  } finally {
    analysisWorkerRunning = false;
  }

  return { processed, skipped: false };
};

const queueAdzunaAnalysis = (maxJobs = GEMINI_ANALYSIS_BATCH_SIZE) => {
  void runPendingAdzunaAnalysisWorker({ maxJobs });
};

export const getJobs = async (req, res) => {
  try {
    const location = String(req.query.location || "").trim();
    const role = String(req.query.role || "").trim();
    const radius = String(req.query.radius || "").trim().toLowerCase();
    const page = parsePositiveInt(req.query.page, 1);
    const limit = Math.min(50, parsePositiveInt(req.query.limit, 20));
    const { remoteOnly } = parseRadius(radius);

    if (hasAdzunaConfig()) {
      const adzunaStoredCount = await Job.countDocuments({ source: "adzuna" });
      if (adzunaStoredCount < ADZUNA_RESULTS_PER_PAGE) {
        await runAdzunaSync({ force: true, maxPages: ADZUNA_MAX_PAGES });
      } else if (page === 1) {
        const searchDriven = Boolean(location || role || radius);
        void runAdzunaSync({
          force: searchDriven,
          location,
          role,
          radius,
          maxPages: searchDriven ? ADZUNA_SEARCH_PAGES : ADZUNA_MAX_PAGES,
        });
      }
      queueAdzunaAnalysis(1);
    }

    const dbQuery = {};
    if (remoteOnly) {
      dbQuery.location = { $regex: "remote", $options: "i" };
    } else if (location) {
      dbQuery.location = { $regex: escapeRegex(location), $options: "i" };
    }
    if (role) dbQuery.title = { $regex: escapeRegex(role), $options: "i" };

    const [totalFromDb, jobsFromDb] = await Promise.all([
      Job.countDocuments(dbQuery),
      Job.find(dbQuery)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
    ]);

    const jobs = applyAuthenticityFilter(jobsFromDb);

    return res.json({
      jobs,
      total: totalFromDb,
      page,
      limit,
      radius,
      source: "mongodb",
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
