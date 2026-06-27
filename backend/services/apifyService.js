import { ApifyClient } from "apify-client";

// ---------------------------------------------------------------------------
// Apify Integration Service
// Uses the `valig/linkedin-jobs-scraper` actor to fetch real-time LinkedIn
// internship postings. Enforces internship-level filtering at the LinkedIn
// search URL level + our strict title gate in the controller.
// ---------------------------------------------------------------------------

const getApifyToken = () => (process.env.APIFY_TOKEN || "").trim();
const ACTOR_ID = "valig/linkedin-jobs-scraper";

/**
 * Builds a LinkedIn Jobs search URL with the internship experience-level
 * filter baked in. LinkedIn uses `f_E=1` for Internship, `f_TPR` for
 * time-posted ranges, and `f_WT=2` for Remote.
 *
 * @param {string} query - The role search term.
 * @param {string} location - The location search term.
 * @returns {string} Full LinkedIn search URL.
 */
const buildLinkedInSearchUrl = (query, location = "") => {
  const normalizedQuery = query.toLowerCase();
  const normalizedLoc = location.toLowerCase().trim();
  
  const hasInternshipTerm =
    normalizedQuery.includes("intern") ||
    normalizedQuery.includes("co-op") ||
    normalizedQuery.includes("fellowship");
  const finalQuery = hasInternshipTerm ? query : `${query} internship`;

  const params = new URLSearchParams({
    keywords: finalQuery,
    f_E: "1",           // Experience Level: 1 = Internship
    f_TPR: "r86400",    // Time Posted: last 24 hours (86400 seconds)
    sortBy: "DD",       // Sort by Date (most recent first)
  });

  const isRemote = normalizedLoc.includes("remote") || normalizedQuery.includes("remote");

  if (isRemote) {
    params.set("f_WT", "2"); // Work Type: 2 = Remote
    // Remote searches should be global (India + outside), so we omit/clear location
  } else {
    // Regular internship: default to India, or use specific location if provided
    const searchLocation = location ? location.trim() : "India";
    params.set("location", searchLocation);
  }

  return `https://www.linkedin.com/jobs/search/?${params.toString()}`;
};

/**
 * Fetches internship listings from Apify's LinkedIn Jobs scraper actor.
 *
 * @param {string} roleQuery - The search query (e.g. "Software Engineer Intern").
 * @param {string} locationQuery - The location query (e.g. "India", "Delhi").
 * @returns {Promise<Array<{
 *   externalId: string,
 *   title: string,
 *   company: string,
 *   location: string,
 *   description: string,
 *   applyUrl: string,
 *   source: string,
 *   createdAt: Date
 * }>>} Standardized internship listing objects.
 */
export const fetchApifyInternships = async (roleQuery = "Software Engineer Intern", locationQuery = "") => {
  const token = getApifyToken();
  if (!token) {
    console.error("[apifyService] APIFY_TOKEN is not set. Skipping Apify fetch.");
    return [];
  }

  const client = new ApifyClient({ token });

  const searchUrl = buildLinkedInSearchUrl(roleQuery, locationQuery);

  const normalizedQuery = roleQuery.toLowerCase();
  const hasInternshipTerm =
    normalizedQuery.includes("intern") ||
    normalizedQuery.includes("co-op") ||
    normalizedQuery.includes("fellowship") ||
    normalizedQuery.includes("trainee") ||
    normalizedQuery.includes("apprentice");

  const finalTitleQuery = hasInternshipTerm ? roleQuery : `${roleQuery} Internship`;

  const actorInput = {
    title: finalTitleQuery,
    location: locationQuery || "India",
    // ⚠️ BUDGET LOCK: Set to 20 for development to conserve Apify credits.
    // For production, increase to 30-50 for deeper coverage.
    limit: 20,
    proxy: {
      useApifyProxy: true,
    },
  };

  try {
    console.log(`[apifyService] Starting actor run for query: "${roleQuery}"`);
    console.log(`[apifyService] LinkedIn search URL: ${searchUrl}`);

    const run = await client.actor(ACTOR_ID).call(actorInput, {
      waitSecs: 180, // Wait up to 3 minutes for results
    });

    if (!run?.defaultDatasetId) {
      console.warn("[apifyService] Actor run completed but no dataset ID found.");
      return [];
    }

    // Fetch the dataset items
    const { items } = await client.dataset(run.defaultDatasetId).listItems();

    if (!Array.isArray(items) || items.length === 0) {
      console.log("[apifyService] Actor returned 0 items.");
      return [];
    }

    console.log(`[apifyService] Actor returned ${items.length} raw items. Normalizing...`);

    // Normalize each item into our standardized schema
    const normalized = items
      .map((item) => normalizeApifyItem(item))
      .filter((item) => item !== null);

    console.log(`[apifyService] ${normalized.length} items after normalization.`);
    return normalized;
  } catch (error) {
    console.error("[apifyService] Apify actor call failed:", error.message);
    return [];
  }
};

// ---------------------------------------------------------------------------
// Normalizer — maps raw Apify actor output to our Job schema shape
// ---------------------------------------------------------------------------

/**
 * Normalizes a single raw Apify item into our standardized Job format.
 * Returns null if the item cannot be meaningfully normalized.
 *
 * @param {Object} item - Raw item from the Apify dataset.
 * @returns {Object|null} Normalized job object or null.
 */
const normalizeApifyItem = (item) => {
  if (!item) return null;

  // The actor may output different field names depending on version.
  // We handle the most common field mappings gracefully.
  const externalId =
    String(item.id || item.jobId || item.job_id || item.externalId || "").trim();
  const title =
    String(item.title || item.jobTitle || item.job_title || "").trim();
  const company =
    String(
      item.company || item.companyName || item.company_name || item.employer || ""
    ).trim();
  const location =
    String(item.location || item.jobLocation || item.job_location || "Remote").trim();
  const description =
    String(item.description || item.jobDescription || item.job_description || "").trim();
  const applyUrl =
    String(
      item.applyUrl || item.jobUrl || item.url || item.link || item.apply_link || ""
    ).trim();

  // Skip items missing critical fields
  if (!externalId || !title) {
    return null;
  }

  // Parse the creation date from the actor, fallback to now
  let createdAt = new Date();
  if (item.postedAt || item.publishedAt || item.createdAt || item.posted_at) {
    const rawDate = new Date(
      item.postedAt || item.publishedAt || item.createdAt || item.posted_at
    );
    if (!Number.isNaN(rawDate.getTime())) {
      createdAt = rawDate;
    }
  }

  return {
    externalId,
    title,
    company: company || "Unknown Company",
    location: location || "Remote",
    description: description || "No description provided.",
    applyUrl: applyUrl || "",
    source: "apify",
    createdAt,
  };
};
