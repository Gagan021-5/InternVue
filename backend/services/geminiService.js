import { GoogleGenerativeAI } from "@google/generative-ai";

const CACHE_TTL_MS = 1000 * 60 * 60;
const analysisCache = new Map();

const defaultAnalysis = {
  authenticityScore: 50,
  fitScore: 50,
  confidence: 0.4,
  summary: "AI analysis unavailable for this role right now.",
  redFlags: [],
  strengths: [],
  interviewQuestions: [],
  extractedSkills: [],
  analyzedAt: new Date(),
};

const getCacheKey = (job) =>
  `${job.title || ""}|${job.company || ""}|${job.location || ""}|${job.description || ""}`.toLowerCase();

const safeJsonParse = (text) => {
  const stripped = text.replace(/```json|```/gi, "").trim();
  return JSON.parse(stripped);
};

const normalizeAnalysis = (raw = {}) => ({
  authenticityScore: Number.isFinite(raw.authenticityScore)
    ? Math.max(0, Math.min(100, Number(raw.authenticityScore)))
    : defaultAnalysis.authenticityScore,
  fitScore: Number.isFinite(raw.fitScore)
    ? Math.max(0, Math.min(100, Number(raw.fitScore)))
    : defaultAnalysis.fitScore,
  confidence: Number.isFinite(raw.confidence)
    ? Math.max(0, Math.min(1, Number(raw.confidence)))
    : defaultAnalysis.confidence,
  summary:
    typeof raw.summary === "string" ? raw.summary : defaultAnalysis.summary,
  redFlags: Array.isArray(raw.redFlags) ? raw.redFlags.slice(0, 6) : [],
  strengths: Array.isArray(raw.strengths) ? raw.strengths.slice(0, 6) : [],
  interviewQuestions: Array.isArray(raw.interviewQuestions)
    ? raw.interviewQuestions.slice(0, 8)
    : [],
  extractedSkills: Array.isArray(raw.extractedSkills)
    ? raw.extractedSkills.slice(0, 10)
    : [],
  analyzedAt: new Date(),
});

// Asynchronous queue for strict free-tier rate limiting (13000ms delay)
const RATE_LIMIT_DELAY_MS = 13000;
let analysisQueue = Promise.resolve();
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export const analyzeJobWithGemini = async (job) => {
  const key = getCacheKey(job);
  const cached = analysisCache.get(key);

  if (cached && Date.now() - cached.createdAt < CACHE_TTL_MS) {
    return cached.value;
  }

  if (!process.env.GEMINI_API_KEY) {
    return defaultAnalysis;
  }

  // Chain into the singleton queue to strictly enforce the 13s delay between ALL calls
  const analysisPromise = analysisQueue.then(async () => {
    try {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      // Updated to gemini-3.1-flash-lite to prevent free-tier 20/day quota limits & 404/503 errors
      const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite" });
      const prompt = `
You are evaluating internship authenticity and student fit.
Return ONLY valid JSON with keys:
authenticityScore (0-100),
fitScore (0-100),
confidence (0-1),
summary (string),
redFlags (string[]),
strengths (string[]),
interviewQuestions (string[]),
extractedSkills (string[]).

Job title: ${job.title}
Company: ${job.company}
Location: ${job.location}
Description: ${job.description}
Salary: ${job.salary || "Not disclosed"}
Tags: ${(job.tags || []).join(", ")}
`;

      const response = await model.generateContent(prompt);
      const text = response.response.text();
      const parsed = safeJsonParse(text);
      const normalized = normalizeAnalysis(parsed);

      analysisCache.set(key, { value: normalized, createdAt: Date.now() });

      // After a successful request, sleep 13s before the NEXT item in the queue can start
      await sleep(RATE_LIMIT_DELAY_MS);
      return normalized;
    } catch (error) {
      console.error("Gemini analysis error:", error.message);
      // Wait to prevent spamming failed requests too
      await sleep(5000);
      return defaultAnalysis;
    }
  });


  analysisQueue = analysisPromise.catch(() => defaultAnalysis);
  return analysisPromise;
};

export const generateOutreachEmail = async (user, job) => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("Gemini API Key is not configured.");
  }

  // Use gemini-3.1-flash-lite to prevent free-tier 20/day quota limits & 404/503 errors
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite" });

  const prompt = `
You are an expert career coach. Write a concise, highly professional cold outreach email (max 3 short paragraphs) for the student to send to a hiring manager. 
Match the student's skills/bio to the specific requirements of this job description. Do not use cringe buzzwords. Include a subject line.

Student Profile:
Name: ${user.displayName || "A highly motivated student"}
Bio: ${user.bio || "No bio provided."}
Skills: ${(user.skills || []).join(", ") || "General software development skills"}

Job Description:
Job Title: ${job.title}
Company: ${job.company}
Description: ${job.description}
  `;

  try {
    const response = await model.generateContent(prompt);
    return response.response.text().trim();
  } catch (error) {
    console.error("Gemini outreach generation error:", error.message);
    throw new Error("Failed to generate outreach email with AI.");
  }
};

export const generateJobAssistantReply = async (user, job, messages) => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("Gemini API Key is not configured.");
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite" });

  const conversation = messages
    .map((message) => {
      const role = message.role === "assistant" ? "Assistant" : "User";
      return `${role}: ${message.content}`;
    })
    .join("\n");

  const prompt = `
You are an expert internship career assistant for a student applying to a Backend Developer Internship. Answer questions about the role, the job requirements, the student's fit, and provide recruiter-ready outreach suggestions when requested.

Student Profile:
Name: ${user.displayName || "Student"}
Bio: ${user.bio || "No bio provided."}
Skills: ${(user.skills || []).join(", ") || "General software development skills"}

Job Details:
Title: ${job.title}
Company: ${job.company}
Location: ${job.location}
Description: ${job.description}

Conversation:
${conversation}
Assistant:`;

  try {
    const response = await model.generateContent(prompt);
    return response.response.text().trim();
  } catch (error) {
    console.error("Gemini job chat generation error:", error.message);
    throw new Error("Failed to generate job chat response with AI.");
  }
};

/**
 * Extracts raw text content from a resume PDF buffer using Gemini.
 *
 * @param {Buffer} pdfBuffer - Uploaded file buffer.
 * @returns {Promise<string>} Plain text extraction of the resume.
 */
export const extractResumeTextWithGemini = async (pdfBuffer) => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  // Use gemini-2.5-flash as requested
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const prompt = `You are a professional resume parser.
Extract and output the full plain text contents of this resume document.
Include all key details, sections (Skills, Projects, Education, Experience), contact details, and summaries.
Do not format as JSON or add markdown comments, just return the raw plain text.`;

  try {
    const response = await model.generateContent([
      {
        inlineData: {
          data: pdfBuffer.toString("base64"),
          mimeType: "application/pdf",
        },
      },
      prompt,
    ]);

    return response.response.text().trim();
  } catch (error) {
    console.error("[geminiService] Resume PDF extraction failed:", error.message);
    throw new Error("Failed to parse resume PDF with Gemini.");
  }
};
