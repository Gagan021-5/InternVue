import express from "express";
import {
  saveJob,
  unsaveJob,
  getSavedJobs,
  updateJobStatus,
} from "../controllers/userController.js";
import { protect } from "../middleware/firebaseAuthMiddleware.js";

const router = express.Router();

router.get("/", protect, getSavedJobs);
router.post("/save", protect, saveJob);
router.delete("/:jobId", protect, unsaveJob);
router.patch("/:jobId/status", protect, updateJobStatus);

export default router;
