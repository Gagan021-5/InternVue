import express from "express";
import {
  syncUser,
  socialSignup,
  getMe,
  updateProfile,
} from "../controllers/authController.js";
import { protect } from "../middleware/firebaseAuthMiddleware.js";

const router = express.Router();

router.post("/sync", protect, syncUser);
router.post("/social-signup", protect, socialSignup);
router.get("/me", protect, getMe);
router.patch("/profile", protect, updateProfile);

export default router;
