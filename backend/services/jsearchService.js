import axios from "axios";

const JSEARCH_BASE_URL = "https://jsearch.p.rapidapi.com/search";

export const fetchJSearchJobs = async (query = "software engineer internship", numPages = 1) => {
    const JSEARCH_API_KEY = process.env.JSEARCH_API_KEY;

    if (!JSEARCH_API_KEY || JSEARCH_API_KEY === "your_jsearch_api_key_here") {
        console.warn("Skipping JSearch sync: JSEARCH_API_KEY is missing or invalid in environment.");
        return [];
    }

    const collectedJobs = [];

    try {
        for (let page = 1; page <= numPages; page++) {
            const response = await axios.get(JSEARCH_BASE_URL, {
                params: {
                    query,
                    page: page.toString(),
                    num_pages: "1"
                },
                headers: {
                    "X-RapidAPI-Key": JSEARCH_API_KEY,
                    "X-RapidAPI-Host": "jsearch.p.rapidapi.com"
                }
            });

            const data = response.data?.data || [];
            collectedJobs.push(...data);

            // Sleep to respect RapidAPI rate limits for free tiers (1 req/sec)
            if (page < numPages) {
                await new Promise(resolve => setTimeout(resolve, 1500));
            }
        }
    } catch (error) {
        console.error("JSearch API Error:", error.response?.data || error.message);
    }

    return collectedJobs;
};
