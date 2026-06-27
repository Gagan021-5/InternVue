import express from "express";
import multer from "multer";
import {
  saveJob,
  unsaveJob,
  getSavedJobs,
  updateJobStatus,
  generateOutreach,
  generateJobChat,
  uploadResume,
} from "../controllers/userController.js";
import { protect } from "../middleware/firebaseAuthMiddleware.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get("/", protect, getSavedJobs);
router.post("/save", protect, saveJob);
router.delete("/:jobId", protect, unsaveJob);
router.patch("/:jobId/status", protect, updateJobStatus);
router.post("/:jobId/generate-outreach", protect, generateOutreach);
router.post("/:jobId/chat", protect, generateJobChat);
router.post("/upload-resume", protect, upload.single("resume"), uploadResume);

export default router;
