import { GoogleGenerativeAI } from "@google/generative-ai";

export const enrichJobWithAI = async (jobTitle, company, description) => {
    if (!process.env.GEMINI_API_KEY) {
        console.warn("Skipping AI Enrichment: GEMINI_API_KEY is missing.");
        return null;
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    // Use gemini-1.5-flash with JSON mode configuration for stable structure
    const model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
        generationConfig: { responseMimeType: "application/json" }
    });

    const prompt = `
    You are an expert technical recruiter AI. Analyze the following internship posting.
    
    Job Title: ${jobTitle}
    Company: ${company}
    Description: ${typeof description === 'string' ? description.substring(0, 3000) : ''}
    
    Extract and classify the following information. Return ONLY strictly valid JSON.
    
    TASKS:
    1. roleCategory: Must be one of ["Full Stack", "SDE", "Frontend", "Backend", "Data Science", "AI/ML", "DevOps", "Cloud", "Mobile", "Cybersecurity", "Other"].
    2. seniorityLevel: Determine if it is "Internship", "Entry-Level", or "Senior".
    3. companyTier: Must be one of ["Tier1" (FAANG/Global Tech), "Tier2" (Established Tech), "Startup" (Small/New), "Unknown"].
    4. qualityScore: Rate the clarity and detail of the job description from 1 to 10.
    5. skills: Array of technical skills required (e.g., ["React", "Node.js", "Python"]).
    
    EXPECTED JSON OUTPUT FORMAT:
    {
      "roleCategory": "string",
      "seniorityLevel": "string",
      "companyTier": "string",
      "qualityScore": number,
      "skills": ["string"]
    }
  `;

    try {
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        return JSON.parse(text);
    } catch (error) {
        console.error("Gemini Enrichment Failed:", error.message);
        return null;
    }
};
