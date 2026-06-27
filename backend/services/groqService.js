import axios from "axios";

/**
 * Generates 5 tailored mock interview questions using Groq API
 * based on the job description and candidate's profile.
 * 
 * @param {Object} user - The candidate user object (skills, bio, name)
 * @param {Object} job - The job document (title, company, description)
 * @returns {Promise<string[]>} List of 5 tailored interview questions
 */
export const generateMockInterviewQuestions = async (user, job) => {
  const apiKey = (process.env.GROQ_API_KEY || "").trim();
  const defaultQuestions = [
    "Tell me about yourself and why your background fits this role.",
    `How do your skills in ${(user?.skills || []).join(", ") || "software development"} align with this position at ${job.company}?`,
    `Walk me through a project where you solved a problem relevant to the responsibilities of a ${job.title}.`,
    "What is your understanding of this role, and what challenges do you anticipate?",
    "Do you have any questions for us about the team or the company culture?"
  ];

  if (!apiKey) {
    console.warn("[groq] Skipping custom interview questions: GROQ_API_KEY is missing. Using defaults.");
    return defaultQuestions;
  }

  const prompt = `
You are an expert technical recruiter. Generate exactly 5 customized mock interview prep questions for a candidate applying to this internship.
Tailor the questions based on how well the candidate's profile matches the job requirements. Avoid generic questions; make them specific to this candidate's skills and this job's description.

Candidate Profile:
Name: ${user.displayName || "Candidate"}
Skills: ${(user.skills || []).join(", ") || "General technical skills"}
Bio: ${user.bio || "No bio provided."}

Job Details:
Title: ${job.title}
Company: ${job.company}
Description: ${typeof job.description === 'string' ? job.description.substring(0, 2000) : "No description provided."}

Generate exactly 5 tailored questions.
Return ONLY a valid JSON array of strings, like this:
[
  "Question 1...",
  "Question 2...",
  "Question 3...",
  "Question 4...",
  "Question 5..."
]
Do not include any introductory or concluding text, markdown code blocks, or explanations. Just return the JSON array.
`;

  try {
    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: "You are a professional hiring manager. You output only raw, valid JSON arrays of strings." },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 600,
        response_format: { type: "json_object" }
      },
      {
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        timeout: 10000
      }
    );

    const text = response.data?.choices?.[0]?.message?.content || "";
    try {
      // In case it wrapped the JSON inside object keys, or just returned an array direct
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        return parsed.slice(0, 5);
      } else if (parsed && typeof parsed === 'object') {
        // Look for array values inside the object
        const values = Object.values(parsed);
        const arrayVal = values.find(v => Array.isArray(v));
        if (arrayVal) return arrayVal.slice(0, 5);
      }
    } catch (parseErr) {
      console.warn("[groq] Failed to parse JSON response. Falling back to line-by-line parsing.", parseErr.message);
      // Fallback: extract strings using lines/regex
      const matches = [...text.matchAll(/"([^"\\]*(?:\\.[^"\\]*)*)"/g)].map(m => m[1]);
      const cleanMatches = matches.filter(m => m.trim().length > 15 && !m.includes("[") && !m.includes("]"));
      if (cleanMatches.length >= 3) {
        return cleanMatches.slice(0, 5);
      }
    }
  } catch (error) {
    console.error("[groq] Custom questions generation failed:", error.message);
  }

  return defaultQuestions;
};

/**
 * Generates a warm, concise mentor conversational reply based on user statement
 * 
 * @param {Object} user - The candidate user object
 * @param {Array} savedJobs - The saved jobs of the candidate
 * @param {string} text - Transcribed speech from candidate
 * @param {string} gender - Selected voice gender ("male" | "female")
 * @returns {Promise<string>} Mentor spoken response (1-2 sentences)
 */
export const generateMentorResponse = async (user, savedJobs = [], text = "", gender = "female", job = null) => {
  const apiKey = (process.env.GROQ_API_KEY || "").trim();
  const mentorName = gender === "male" ? "Arthur" : "Aria";

  const fallbackMsg = `Hello! I am your AI career mentor ${mentorName}. Keep sharing your goals or ask me anything about this opportunity!`;

  if (!apiKey) {
    console.warn("[groq] Skipping mentor voice completions: GROQ_API_KEY is missing. Using default.");
    return fallbackMsg;
  }

  const jobsList = savedJobs
    .slice(0, 3)
    .map(sj => `${sj.jobData?.title || "Intern"} at ${sj.jobData?.company || "Tech Company"}`)
    .join(", ");

  const prompt = `
You are an expert tech career coach and mock interviewer named "${mentorName}".
The student is practicing for their interviews.

${job ? `TARGET ROLE CONTEXT:
- Title: ${job.title}
- Company: ${job.company}
- Requirements: ${Array.isArray(job.skills) ? job.skills.join(", ") : "Not specified"}
- Description: ${job.description ? job.description.substring(0, 1500) : "No description."}` : `Saved Jobs (for context): ${jobsList || "None saved yet"}`}

Student Profile:
Name: ${user.displayName || "Student"}
Bio: ${user.bio || "No bio provided."}
Skills: ${(user.skills || []).join(", ") || "Software development"}

Student Statement: "${text}"

Provide a highly concise, warm, professional mentor response (exactly 1 to 2 short sentences, maximum 35 words).
Directly address their statement, prompt them with a feedback point or the next mock interview question tailored to the role, and keep it extremely natural for spoken audio.
Do not use markdown, emojis, bullet points, or metadata.
`;

  try {
    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: "You are a professional career coach. You write short, conversational dialogue lines for audio output." },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 120
      },
      {
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        timeout: 8000
      }
    );

    const reply = response.data?.choices?.[0]?.message?.content || "";
    const cleanReply = reply.replace(/[❌✅⚠️🏆💎🌟✨🚨🧠💡📊📌👤🔖📈📁🏠🏠]/gu, "").trim();
    return cleanReply || fallbackMsg;
  } catch (error) {
    console.error("[groq] Mentor response generation failed:", error.message);
    return fallbackMsg;
  }
};

const getMurfAudioUrl = async (text = "", voicePreference = "female") => {
  const apiKey = (process.env.MURF_API_KEY || "").trim();
  if (!apiKey || !text.trim()) return null;

  const voiceCandidates = voicePreference === "male"
    ? ["en-US-james", "en-US-daniel", "en-US-matthew", "en-US-jarvis"]
    : ["en-US-natalie", "en-US-amara", "en-US-amy", "en-US-sara"];

  for (const voiceId of voiceCandidates) {
    try {
      const response = await axios.post(
        "https://api.murf.ai/v1/speech/generate",
        {
          text: text.trim(),
          voiceId,
          format: "mp3",
          rate: 1.0,
          pitch: 0.0,
          style: "conversation",
        },
        {
          headers: {
            "api-key": apiKey,
            "Content-Type": "application/json",
          },
          timeout: 20000,
        }
      );

      const data = response.data || {};
      const audioUrl = data.audioFile || data.audioUrl || data.audio?.url || data.url || data.file?.url || null;
      if (audioUrl) return audioUrl;
    } catch (error) {
      console.warn(`[murf] Voice attempt failed for ${voiceId}:`, error.message);
    }
  }

  return null;
};

// Live AI Mentor: Contextual Chat Reply (Groq-powered, sub-second latency)
// ---------------------------------------------------------------------------

const safeJsonParseChat = (text) => {
  try {
    const stripped = text.replace(/```json|```/gi, "").trim();
    const parsed = JSON.parse(stripped);
    if (parsed && typeof parsed.reply === "string") {
      return {
        reply: parsed.reply,
        isInterviewMode: parsed.isInterviewMode === true
      };
    }
  } catch (err) {
    // Ignore and fallback to manual regex
  }
  
  // Regex fallback matching
  const replyMatch = text.match(/"reply"\s*:\s*"([^"]+)"/);
  const modeMatch = text.match(/"isInterviewMode"\s*:\s*(true|false)/);
  if (replyMatch) {
    return {
      reply: replyMatch[1].replace(/\\n/g, "\n"),
      isInterviewMode: modeMatch ? modeMatch[1] === "true" : false
    };
  }

  const isInterview = /interview|question|mock/i.test(text);
  return {
    reply: text,
    isInterviewMode: isInterview
  };
};

/**
 * Generates a contextual career mentor reply by comparing the candidate's
 * profile (skills + resume text) against the specific internship requirements.
 *
 * Strategy:
 * - Strong skill match → recommend applying + referral networking.
 * - Weak match → recommend "Cold Outreach Route" with a personalized
 *   3-sentence LinkedIn/email draft using resume highlights.
 *
 * @param {Object} user - Authenticated user (skills, extractedResumeText, bio, displayName)
 * @param {Object} job - Job document (title, company, description, skills)
 * @param {string} userMessage - The student's latest chat message
 * @param {Array} chatHistory - Previous messages [{ role: "user"|"assistant", content }]
 * @returns {Promise<{reply: string, isInterviewMode: boolean}>} AI mentor reply
 */
export const getContextualChatReply = async (user, job, userMessage, chatHistory = [], options = {}) => {
  const apiKey = (process.env.GROQ_API_KEY || "").trim();
  const replyMode = options.replyMode || "text";
  const voicePreference = options.voicePreference || "female";

  const fallback = {
    reply: "I'm here to help with your career questions! Could you tell me more about what you'd like to know about this role?",
    isInterviewMode: false
  };

  if (!apiKey) {
    console.warn("[groq] GROQ_API_KEY is missing. Returning fallback for mentor chat.");
    return fallback;
  }

  const candidateSkills = (user.skills || []).join(", ");
  const resumeHighlights = user.extractedResumeText || "";
  const jobSkills = job && Array.isArray(job.skills) ? job.skills.join(", ") : "Not specified";
  const jobDesc = job && typeof job.description === "string" ? job.description.substring(0, 2500) : "No description.";
  const jobTitle = job ? job.title : "Not specified";
  const jobCompany = job ? job.company : "Not specified";

  let userInstruction = "";
  if (candidateSkills || resumeHighlights) {
    userInstruction = `\n\nCRITICAL DIRECTIVE:\nYou must use the provided user resume data and skills to analyze if this applicant should apply directly or write a cold outreach message. Do not give generic advice. Address the candidate directly using their resume details.`;
  }

  const systemPrompt = `You are an elite career mentor AI named "Mentor" for an internship platform called InternVue. You provide highly specific, actionable career guidance.

CANDIDATE CONTEXT:
- Name: ${user.displayName || user.name || "Student"}
- Skills: ${candidateSkills || "Not specified"}
- Bio: ${user.bio || "Not provided."}
- Resume Highlights: ${resumeHighlights || "No resume text available."}

${job ? `INTERNSHIP CONTEXT:
- Title: ${jobTitle}
- Company: ${jobCompany}
- Required Skills: ${jobSkills}
- Description: ${jobDesc}` : "The user is browsing generally and has not selected a specific internship."}

MOCK INTERVIEW MODE RULES:
If the user initiates a mock interview, asks for practice, or says "mock interview", "interview prep", or "practice" (or if the conversation history shows you are currently in a mock interview loop), you must:
1. Act as a highly professional, strict technical and behavioral interviewer representing the target company (${jobCompany || "the company"}).
2. Evaluate their previous answer (if they answered one of your questions in the message history) and provide extremely constructive, concise feedback.
3. Ask EXACTLY ONE question at a time (technical coding, behavioral, or resume-based). Never ask multiple questions at once.
4. Set "isInterviewMode": true in your JSON output.

GENERAL MOCK ADVICE RULES:
If not in mock interview mode:
1. Provide standard matching and outreach coaching based on candidate skills.
2. Set "isInterviewMode": false in your JSON output.

OUTPUT FORMAT REQUIREMENTS:
You MUST respond ONLY with a valid JSON object in this exact shape. Do not output any markdown surrounding text or explanation outside the JSON.
{
  "reply": "Your response message string here...",
  "isInterviewMode": true/false
}
${userInstruction}`;

  const messages = [
    { role: "system", content: systemPrompt },
    ...chatHistory.slice(-10).map((msg) => ({
      role: msg.role === "assistant" ? "assistant" : "user",
      content: String(msg.content || ""),
    })),
    { role: "user", content: userMessage },
  ];

  try {
    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama-3.3-70b-versatile",
        messages,
        temperature: 0.7,
        max_tokens: 500,
        response_format: { type: "json_object" }
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        timeout: 10000,
      }
    );

    const reply = response.data?.choices?.[0]?.message?.content || "";
    const parsed = safeJsonParseChat(reply.trim());

    if (parsed.isInterviewMode && replyMode === "audio") {
      try {
        parsed.audioUrl = await getMurfAudioUrl(parsed.reply, voicePreference);
      } catch (audioError) {
        console.warn("[murf] Failed to generate interview audio:", audioError.message);
      }
    }

    return parsed;
  } catch (error) {
    console.error("[groq] Contextual chat reply failed:", error.message);
    return fallback;
  }
};
