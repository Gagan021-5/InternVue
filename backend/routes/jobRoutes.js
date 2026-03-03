import express from "express";
import {
  getJobs,
  getJobById,
  createJob,
  fetchAndEnrichJobs,
} from "../controllers/jobController.js";
import { protect, adminOnly } from "../middleware/firebaseAuthMiddleware.js";

const router = express.Router();

router.get("/", getJobs);
router.post("/fetch", protect, adminOnly, fetchAndEnrichJobs);
router.get("/:id", getJobById);
router.post("/", protect, adminOnly, createJob);

export default router;
