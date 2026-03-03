import axios from "axios";

const JSEARCH_SEARCH_URL = "https://jsearch.p.rapidapi.com/search";
const REQUEST_TIMEOUT_MS = 10000;
const PAGE_DELAY_MS = 1100;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const normalizeLocation = (job) => {
  const parts = [job.job_city, job.job_state, job.job_country]
    .map((value) => String(value || "").trim())
    .filter(Boolean);

  return parts.length > 0 ? parts.join(", ") : "Remote";
};

const normalizeJSearchJob = (job) => ({
  externalId: String(job.job_id || ""),
  title: job.job_title || "Internship Opportunity",
  company: job.employer_name || "Unknown Company",
  location: normalizeLocation(job),
  description: job.job_description || "No description provided.",
  applyUrl: job.job_apply_link || job.job_google_link || "",
  source: "local",
  tags: ["jsearch"],
  redirectPenalty:
    String(job.job_apply_link || "")
      .toLowerCase()
      .includes("linkedin.com")
      ? -3
      : 0,
});

const logRapidApiError = (status, host, details) => {
  if (status === 401) {
    console.error("[jsearch] RapidAPI 401 Unauthorized: check RAPIDAPI_KEY.");
    return;
  }

  if (status === 403) {
    console.error(
      `[jsearch] RapidAPI 403 Forbidden: verify RAPIDAPI_HOST is correct and your plan includes host ${host}.`
    );
    return;
  }

  if (status === 429) {
    console.error("[jsearch] RapidAPI 429 Too Many Requests: rate limit exceeded.");
    return;
  }

  console.error(`[jsearch] API request failed${status ? ` (status ${status})` : ""}:`, details);
};

export const fetchJSearchJobs = async (query = "software engineer internship", numPages = 1) => {
  const rapidApiKey = process.env.RAPIDAPI_KEY;
  const rapidApiHost = process.env.RAPIDAPI_HOST;

  if (!rapidApiKey || !rapidApiHost) {
    console.error("[jsearch] RAPIDAPI_KEY and RAPIDAPI_HOST are required.");
    return [];
  }

  const totalPages = Number.isFinite(Number(numPages))
    ? Math.max(1, Number.parseInt(numPages, 10))
    : 1;
  const normalizedJobs = [];

  for (let page = 1; page <= totalPages; page += 1) {
    try {
      const response = await axios.get(JSEARCH_SEARCH_URL, {
        params: {
          query,
          page: String(page),
          num_pages: "1",
        },
        headers: {
          "X-RapidAPI-Key": rapidApiKey,
          "X-RapidAPI-Host": rapidApiHost,
        },
        timeout: REQUEST_TIMEOUT_MS,
      });

      const pageJobs = Array.isArray(response.data?.data) ? response.data.data : [];
      normalizedJobs.push(
        ...pageJobs
          .map(normalizeJSearchJob)
          .filter((job) => job.externalId && job.title && job.company && job.location && job.applyUrl)
      );

      if (page < totalPages) {
        await sleep(PAGE_DELAY_MS);
      }
    } catch (error) {
      const status = error.response?.status;
      const details = error.response?.data || error.message;
      logRapidApiError(status, rapidApiHost, details);

      if (status === 401 || status === 403 || status === 429) {
        break;
      }
    }
  }

  return normalizedJobs;
};
