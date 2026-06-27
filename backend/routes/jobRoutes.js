import express from "express";
import {
  getJobs,
  getJobById,
  createJob,
  syncApifyInternships,
} from "../controllers/jobController.js";
import { protect, adminOnly } from "../middleware/firebaseAuthMiddleware.js";

const router = express.Router();

router.get("/", getJobs);
router.post("/sync", protect, adminOnly, syncApifyInternships);
router.get("/:id", protect, getJobById);
router.post("/", protect, adminOnly, createJob);

export default router;
