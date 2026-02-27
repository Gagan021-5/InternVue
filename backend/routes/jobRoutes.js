import express from "express";
import {
  getJobs,
  getJobById,
  createJob,
  syncAdzunaJobs,
  analyzePendingAdzunaJobs,
} from "../controllers/jobController.js";
import { protect, adminOnly } from "../middleware/firebaseAuthMiddleware.js";

const router = express.Router();

router.get("/", getJobs);
router.post("/sync/adzuna", protect, adminOnly, syncAdzunaJobs);
router.post("/analyze/adzuna", protect, adminOnly, analyzePendingAdzunaJobs);
router.get("/:id", getJobById);
router.post("/", protect, adminOnly, createJob);

export default router;
