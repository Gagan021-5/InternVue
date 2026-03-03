import express from "express";
import { searchJobs } from "../controllers/job.controller.js";

const router = express.Router();

router.get("/search", searchJobs);

export default router;
