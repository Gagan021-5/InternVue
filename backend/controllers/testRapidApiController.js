import axios from "axios";
import TestJob from "../models/TestJob.js";

const testRapidApi = async (req, res) => {
    try {
        const response = await axios.get("https://jsearch.p.rapidapi.com/search", {
            headers: {
                "X-RapidAPI-Key": process.env.RAPIDAPI_KEY,
                "X-RapidAPI-Host": process.env.RAPIDAPI_HOST,
            },
            params: {
                query: "full stack intern in delhi",
                page: 1,
                num_pages: 1,
                date_posted: "month",
            },
        });

        const jobs = response.data?.data || [];
        const firstJob = jobs[0];

        if (!firstJob) {
            return res.json({
                status: "success",
                firstJobTitle: null,
                applyUrl: null,
                totalResults: 0,
                dbSave: "skipped — no jobs returned",
            });
        }

        // Normalize first job for DB save
        const normalized = {
            jobId: firstJob.job_id,
            title: firstJob.job_title,
            company: firstJob.employer_name,
            location: firstJob.job_city || "Unknown",
            description: firstJob.job_description,
            applyUrl: firstJob.job_apply_link,
            createdAt: new Date(),
        };

        let dbSave = "saved";
        try {
            await TestJob.create(normalized);
        } catch (dbErr) {
            if (dbErr.code === 11000) {
                console.log("Duplicate job skipped:", normalized.jobId);
                dbSave = "duplicate — skipped";
            } else {
                console.error("DB save error:", dbErr.message);
                dbSave = `error — ${dbErr.message}`;
            }
        }

        return res.json({
            status: "success",
            firstJobTitle: firstJob.job_title,
            applyUrl: firstJob.job_apply_link,
            totalResults: jobs.length,
            dbSave,
        });
    } catch (error) {
        // Auto-fix common RapidAPI errors
        const status = error.response?.status;
        if (status === 401) {
            console.error("RapidAPI 401: Invalid or missing RapidAPI key");
        } else if (status === 403) {
            console.error("RapidAPI 403: Host header incorrect. Must be jsearch.p.rapidapi.com");
        } else if (status === 429) {
            console.error("RapidAPI 429: Rate limit exceeded");
        } else {
            console.error("RapidAPI error:", error.message);
        }

        return res.status(status || 500).json({
            status: "error",
            message: error.message,
            details: error.response?.data || null,
        });
    }
};

export default testRapidApi;
