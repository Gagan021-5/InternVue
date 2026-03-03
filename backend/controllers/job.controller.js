import axios from "axios";

const searchJobs = async (req, res) => {
    const { query, location } = req.query;

    if (!query || !location) {
        return res.status(400).json({ status: 500, error: 'Query and location are required' });
    }

    const rapidApiKey = process.env.RAPIDAPI_KEY;

    if (!rapidApiKey) {
        console.warn("RapidAPI Key missing in environment variables.")
        return res.status(500).json({ status: 500, error: 'Internal Server Error: API Configuration Missing' });
    }

    const jsearchQuery = `${query} intern in ${location}`;

    const options = {
        method: 'GET',
        url: 'https://jsearch.p.rapidapi.com/search',
        headers: {
            'X-RapidAPI-Key': rapidApiKey,
            'X-RapidAPI-Host': 'jsearch.p.rapidapi.com'
        },
        params: {
            query: jsearchQuery,
            page: '1',
            num_pages: '1',
            date_posted: 'month'
        }
    };

    try {
        const response = await axios.request(options);

        // Normalize Data
        if (!response.data || !response.data.data) {
            return res.status(200).json([]);
        }

        const jobs = response.data.data.map((job) => {

            let applyUrl = job.job_apply_link;
            let redirectPenalty = false;

            if (applyUrl && applyUrl.includes('linkedin.com')) {
                redirectPenalty = true;
            }

            return {
                title: job.job_title,
                company: job.employer_name,
                location: `${job.job_city || ''}, ${job.job_state || ''}, ${job.job_country || ''}`.replace(/^, |, $/g, '').trim(),
                description: job.job_description,
                applyUrl: applyUrl,
                employmentType: job.job_employment_type,
                source: "JSearch",
                ...(redirectPenalty && { redirectPenalty: true }) // Only add if true
            };
        });

        return res.status(200).json(jobs);

    } catch (error) {
        if (error.response && error.response.data) {
            console.error("JSearch API Error:", error.response.data);
        } else {
            console.error("Axios Error Fetching Jobs:", error.message);
        }

        return res.status(500).json({ status: 500, error: 'Failed to fetch jobs from provider' });
    }
};

export { searchJobs };
