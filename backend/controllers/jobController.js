import mongoose from "mongoose";
import Job from "../models/Job.js";
import { applyAuthenticityFilter } from "../middleware/authenticityFilter.js";
import { analyzeJobWithGemini } from "../services/geminiService.js";
import { enrichJobWithAI } from "../services/aiService.js";
import { fetchApifyInternships } from "../services/apifyService.js";
import { generateMockInterviewQuestions } from "../services/groqService.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const parsePositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const escapeRegex = (value = "") => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// ---------------------------------------------------------------------------
// Internship Title Gate
// Drops anything that is NOT explicitly an internship, co-op, or fellowship.
// ---------------------------------------------------------------------------

const INTERNSHIP_KEYWORDS = [
  "intern",
  "co-op",
  "fellowship",
  "trainee",
  "apprentice",
  "summer analyst",
  "graduate program",
  "working student",
  "placement",
];

/**
 * Returns true if the title contains at least one internship-related keyword.
 * @param {string} title
 * @returns {boolean}
 */
const passesInternshipGate = (title = "") => {
  const lower = title.toLowerCase();
  return INTERNSHIP_KEYWORDS.some((keyword) => lower.includes(keyword));
};

// ---------------------------------------------------------------------------
// Core Ingestion Pipeline (shared by cron + REST endpoint)
// ---------------------------------------------------------------------------

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let isEnriching = false;

/**
 * Background enrichment worker that processes unenriched jobs one-by-one
 * with a rate-limit delay to avoid 429 Too Many Requests errors.
 */
export const triggerBackgroundEnrichment = async () => {
  if (isEnriching) {
    console.log("[enrichment] Background enrichment worker is already running.");
    return;
  }
  isEnriching = true;
  console.log("[enrichment] Background enrichment worker started.");

  try {
    while (true) {
      const job = await Job.findOne({ isEnriched: false });
      if (!job) {
        console.log("[enrichment] All jobs are enriched. Background worker stopping.");
        break;
      }

      console.log(`[enrichment] Enriching: "${job.title}" at ${job.company}...`);

      try {
        const aiData = await enrichJobWithAI(job.title, job.company, job.description);

        if (aiData) {
          await Job.updateOne(
            { _id: job._id },
            {
              $set: {
                ...aiData,
                isEnriched: true,
              },
            }
          );
          console.log(`[enrichment] Successfully enriched: "${job.title}"`);
        } else {
          // Fallback if returned value is somehow empty/falsy
          await Job.updateOne(
            { _id: job._id },
            {
              $set: {
                isEnriched: true,
              },
            }
          );
          console.warn(`[enrichment] AI enrichment returned falsy for "${job.title}". Marked as enriched with defaults.`);
        }
      } catch (err) {
        const errMessage = err.message || "";
        console.error(`[enrichment] Error enriching "${job.title}":`, errMessage);

        if (errMessage.includes("429") || errMessage.toLowerCase().includes("quota") || errMessage.toLowerCase().includes("too many requests")) {
          // Rate limit: do NOT mark as enriched. Sleep and retry later.
          console.log("[enrichment] Rate limit hit. Sleeping for 20 seconds before retry...");
          await sleep(20000);
          continue;
        } else {
          // Permanent failure: mark as enriched so we don't loop forever
          await Job.updateOne(
            { _id: job._id },
            {
              $set: {
                isEnriched: true,
              },
            }
          );
          console.log(`[enrichment] Marked "${job.title}" as enriched with defaults due to non-retryable error.`);
        }
      }

      // 5 seconds delay between requests to stay safe under 15 RPM limit
      await sleep(5000);
    }
  } catch (loopErr) {
    console.error("[enrichment] Critical error in enrichment loop:", loopErr.message);
  } finally {
    isEnriching = false;
  }
};

/**
 * Processes an array of normalized Apify items through the strict pipeline:
 *   1. Title gate (intern / co-op / fellowship)
 *   2. Deduplicate via externalId
 *   3. Save to MongoDB as unenriched (asynchronous enrichment triggered afterwards)
 *
 * @param {Array} items - Normalized items from apifyService.
 * @returns {Promise<{ fetched: number, filtered: number, saved: number }>}
 */
export const processApifyItems = async (items = []) => {
  let filtered = 0;
  let saved = 0;

  for (const item of items) {
    // 1. Strict internship title gate
    if (!passesInternshipGate(item.title)) {
      filtered++;
      continue;
    }

    // 1b. Location filter: restrict physical locations to India, and allow remote opportunities.
    const itemLoc = String(item.location || "").toLowerCase();
    const isRemote = itemLoc.includes("remote");
    const isIndia = itemLoc.includes("india") || itemLoc.includes("bengaluru") || itemLoc.includes("bangalore") || itemLoc.includes("mumbai") || itemLoc.includes("delhi") || itemLoc.includes("pune") || itemLoc.includes("noida") || itemLoc.includes("hyderabad") || itemLoc.includes("chennai") || itemLoc.includes("gurgaon") || itemLoc.includes("kolkata");
    const foreignCountries = ["united states", "usa", "united kingdom", "canada", "germany", "france", "australia", "singapore", "japan", "china", "europe", "london", "new york", "san francisco"];
    let isForeign = foreignCountries.some(c => itemLoc.includes(c));
    if (!isForeign) {
      isForeign = /\buk\b/.test(itemLoc);
    }

    if (isForeign && !isRemote) {
      filtered++;
      continue;
    }

    if (!isIndia && !isRemote) {
      filtered++;
      continue;
    }

    // 2. Deduplication — skip if externalId already exists
    try {
      const exists = await Job.findOne({
        source: "apify",
        externalId: item.externalId,
      }).lean();

      if (exists) {
        continue;
      }
    } catch (lookupErr) {
      console.error(
        `[processApifyItems] Dedup lookup failed for ${item.externalId}:`,
        lookupErr.message
      );
      continue;
    }

    // 4. Create the job document (saved immediately as unenriched)
    try {
      await Job.create({
        externalId: item.externalId,
        title: item.title,
        company: item.company,
        location: item.location,
        description: item.description,
        applyUrl: item.applyUrl,
        source: "apify",
        isVerified: false,
        isEnriched: false,
        createdAt: item.createdAt || new Date(),
      });
      saved++;
    } catch (createErr) {
      // Duplicate key errors (E11000) are expected if a race condition hits
      if (createErr.code !== 11000) {
        console.error(
          `[processApifyItems] Failed to save "${item.title}":`,
          createErr.message
        );
      }
    }
  }

  // Trigger background enrichment asynchronously (do not await)
  if (saved > 0) {
    triggerBackgroundEnrichment().catch((err) => {
      console.error("[processApifyItems] Background enrichment trigger error:", err.message);
    });
  }

  return { fetched: items.length, filtered, saved };
};

// ---------------------------------------------------------------------------
// REST: POST /api/jobs/sync
// Triggers an Apify scrape for a given role, processes results, returns stats.
// ---------------------------------------------------------------------------

export const syncApifyInternships = async (req, res) => {
  try {
    const role = String(
      req.body?.role || req.query?.role || "Software Engineer Intern"
    ).trim();
    const location = String(
      req.body?.location || req.query?.location || ""
    ).trim();

    let syncLocation = location;
    if (syncLocation && syncLocation.toLowerCase() !== "remote" && !syncLocation.toLowerCase().includes("india")) {
      syncLocation = `${syncLocation}, India`;
    }

    console.log(`[syncApifyInternships] Starting sync for role: "${role}", location: "${syncLocation}"`);

    const items = await fetchApifyInternships(role, syncLocation);

    if (items.length === 0) {
      return res.json({
        success: true,
        message: "Apify returned 0 items for this query.",
        stats: { fetched: 0, filtered: 0, saved: 0 },
      });
    }

    const stats = await processApifyItems(items);

    console.log(
      `[syncApifyInternships] Complete — fetched: ${stats.fetched}, filtered: ${stats.filtered}, saved: ${stats.saved}`
    );

    return res.json({ success: true, stats });
  } catch (error) {
    console.error("[syncApifyInternships] Error:", error.message);
    return res
      .status(500)
      .json({ error: "Failed to sync internships from Apify." });
  }
};

// ---------------------------------------------------------------------------
// REST: GET /api/jobs
// Paginated MongoDB query with AI-powered ranking. Falls back to live Apify
// sync if a targeted search yields zero local results.
// ---------------------------------------------------------------------------

export const getJobs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 30,
      highQualityOnly = "false",
      role,
      category,
      location,
      userSkills = [],
    } = req.query;

    const matchStage = {};

    if (category && category !== "All") {
      matchStage.roleCategory = category;
    }

    if (role) {
      matchStage.$or = [
        { roleCategory: new RegExp(escapeRegex(role), "i") },
        { title: new RegExp(escapeRegex(role), "i") },
        { description: new RegExp(escapeRegex(role), "i") },
        { tags: new RegExp(escapeRegex(role), "i") },
        { skills: new RegExp(escapeRegex(role), "i") },
      ];
    }

    if (location) {
      const normalizedLoc = location.toLowerCase().trim();
      
      if (normalizedLoc === "remote") {
        matchStage.$or = [
          { location: /remote/i },
          { title: /remote/i }
        ];
      } else {
        const searchConditions = [];
        
        // Smart synonym / typo tolerance mapping for major Indian hubs
        if (
          normalizedLoc.includes("delhi") ||
          normalizedLoc.includes("deligi") ||
          normalizedLoc.includes("dilli") ||
          normalizedLoc.includes("ncr")
        ) {
          // Match Delhi, New Delhi, Delhi NCR, etc.
          searchConditions.push({ location: /delhi/i }, { location: /ncr/i });
        } else if (normalizedLoc.includes("mumbai") || normalizedLoc.includes("bombay")) {
          searchConditions.push({ location: /mumbai|bombay/i });
        } else if (normalizedLoc.includes("bengaluru") || normalizedLoc.includes("bangalore")) {
          searchConditions.push({ location: /bengaluru|bangalore/i });
        } else if (normalizedLoc.includes("kolkata") || normalizedLoc.includes("calcutta")) {
          searchConditions.push({ location: /kolkata|calcutta/i });
        } else if (normalizedLoc.includes("chennai") || normalizedLoc.includes("madras")) {
          searchConditions.push({ location: /chennai|madras/i });
        } else if (normalizedLoc.includes("gurgaon") || normalizedLoc.includes("gurugram")) {
          searchConditions.push({ location: /gurgaon|gurugram|ncr/i });
        } else if (normalizedLoc.includes("noida")) {
          searchConditions.push({ location: /noida|ncr/i });
        } else if (normalizedLoc.includes("hyderabad")) {
          searchConditions.push({ location: /hyderabad/i });
        } else if (normalizedLoc.includes("pune")) {
          searchConditions.push({ location: /pune/i });
        } else {
          // Default: match city/state name (first part of split comma)
          const parts = location
            .split(",")
            .map((p) => p.trim())
            .filter(Boolean);
          if (parts.length > 0) {
            searchConditions.push({ location: new RegExp(escapeRegex(parts[0]), "i") });
          }
        }

        matchStage.$and = [
          { location: { $not: /remote/i } },
          { title: { $not: /remote/i } },
          ...(searchConditions.length > 0 ? [{ $or: searchConditions }] : [])
        ];
      }
    } else {
      // Default: focus on physical India, exclude remote and foreign locations
      matchStage.$and = [
        { location: { $not: /remote/i } },
        { title: { $not: /remote/i } },
        { location: { $not: /united states|usa|united kingdom|uk|canada|germany|france|australia|singapore|japan|china/i } }
      ];
    }

    if (highQualityOnly === "true") {
      matchStage.qualityScore = { $gte: 7 };
    }

    const parsedUserSkills = Array.isArray(userSkills)
      ? userSkills
          .map((s) => String(s || "").trim().toLowerCase())
          .filter(Boolean)
      : String(userSkills || "")
          .split(",")
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean);

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
                            {
                              $map: {
                                input: "$skills",
                                as: "s",
                                in: { $toLower: "$$s" },
                              },
                            },
                            parsedUserSkills,
                          ],
                        },
                      },
                      { $size: "$skills" },
                    ],
                  },
                  100,
                ],
              },
              else: 0,
            },
          },
        },
      },
      {
        $addFields: {
          finalScore: {
            $add: [
              { $multiply: [{ $ifNull: ["$qualityScore", 5] }, 2] },
              { $divide: ["$skillMatchPercentage", 10] },
              { $ifNull: ["$redirectPenalty", 0] },
            ],
          },
        },
      },
      { $sort: { finalScore: -1, createdAt: -1 } },
      { $skip: (Number(page) - 1) * Number(limit) },
      { $limit: Number(limit) },
    ];

    let finalJobs = await Job.aggregate(pipeline);
    let finalTotal = await Job.countDocuments(matchStage);

    // -----------------------------------------------------------------------
    // Live fallback: if a targeted search yields 0 results, trigger a fast
    // real-time Apify sync for that exact query in the background.
    // -----------------------------------------------------------------------
    if (finalJobs.length === 0) {
      const fallbackRole = role || category || "Software Engineer";
      const fallbackLocation = location || "India";
      const fallbackQuery = `${fallbackRole} ${fallbackLocation} Intern`;
      console.log(
        `[getJobs] 0 local results. Triggering async live fallback sync for: "${fallbackQuery}"`
      );

      // Trigger the sync asynchronously in the background so the current request
      // does not wait (takes 1-3 mins) and time out.
      fetchApifyInternships(fallbackRole, fallbackLocation)
        .then((items) => {
          if (items.length > 0) {
            return processApifyItems(items);
          }
        })
        .then((stats) => {
          if (stats) {
            console.log(
              `[getJobs] Async fallback complete — fetched: ${stats.fetched}, filtered: ${stats.filtered}, saved: ${stats.saved}`
            );
          }
        })
        .catch((syncErr) => {
          console.error("[getJobs] Async fallback sync failed:", syncErr.message);
        });

      return res.json({
        jobs: [],
        total: 0,
        page: Number(page),
        limit: Number(limit),
        syncing: true,
        source: "mongodb/ai-ranked",
        message: "Searching LinkedIn Live... We are fetching fresh internships for this query in the background. Please refresh in a moment!",
      });
    }

    return res.json({
      jobs: finalJobs,
      total: finalTotal,
      page: Number(page),
      limit: Number(limit),
      source: "mongodb/ai-ranked",
    });
  } catch (error) {
    console.error("[getJobs] Error:", error.message);
    return res.status(500).json({ error: "Failed to fetch jobs." });
  }
};

// ---------------------------------------------------------------------------
// REST: GET /api/jobs/:id
// Fetches a single job by MongoDB ObjectId or externalId.
// ---------------------------------------------------------------------------

export const getJobById = async (req, res) => {
  try {
    const { id } = req.params;
    let job = null;

    if (mongoose.Types.ObjectId.isValid(id)) {
      job = await Job.findById(id).lean();
    }

    if (!job) {
      job = await Job.findOne({ source: "apify", externalId: String(id) }).lean();
    }

    if (!job) {
      return res.status(404).json({ error: "Job not found." });
    }

    const filtered = applyAuthenticityFilter([job]);
    if (!filtered.length) {
      return res.status(404).json({ error: "Job not found." });
    }

    const jobData = filtered[0];

    // Ensure aiAnalysis structure is populated correctly for the frontend
    if (!jobData.aiAnalysis) {
      jobData.aiAnalysis = {
        authenticityScore: jobData.authenticityScore || 50,
        fitScore: jobData.fitScore || 50,
        confidence: jobData.confidence || 0.5,
        summary: jobData.summary || "",
        redFlags: jobData.redFlags || [],
        strengths: jobData.strengths || [],
        interviewQuestions: jobData.interviewQuestions || [],
        extractedSkills: jobData.skills || []
      };
    }

    // Tailor mock interview questions dynamically using Groq if authenticated student is requesting
    if (req.user) {
      try {
        console.log(`[getJobById] Generating candidate-tailored mock interview questions using Groq...`);
        const tailoredQuestions = await generateMockInterviewQuestions(req.user, jobData);
        jobData.aiAnalysis.interviewQuestions = tailoredQuestions;
        jobData.interviewQuestions = tailoredQuestions;
      } catch (groqErr) {
        console.error("[getJobById] Groq interview questions generation failed:", groqErr.message);
      }
    }

    return res.json({ job: jobData });
  } catch (error) {
    console.error("[getJobById] Error:", error.message);
    return res.status(500).json({ error: "Failed to fetch job." });
  }
};

// ---------------------------------------------------------------------------
// REST: POST /api/jobs
// Manual admin job creation with Gemini analysis.
// ---------------------------------------------------------------------------

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
      source: "local",
      isVerified: Boolean(isVerified),
      postedBy: req.user._id,
      coordinates: {
        lat: Number.isFinite(Number(coordinates.lat))
          ? Number(coordinates.lat)
          : null,
        lng: Number.isFinite(Number(coordinates.lng))
          ? Number(coordinates.lng)
          : null,
      },
    };

    const analysis = await analyzeJobWithGemini(baseJob);
    const created = await Job.create({
      ...baseJob,
      aiAnalysis: analysis,
    });

    return res.status(201).json({ job: created });
  } catch (error) {
    console.error("[createJob] Error:", error.message);
    return res.status(500).json({ error: "Failed to create job." });
  }
};
