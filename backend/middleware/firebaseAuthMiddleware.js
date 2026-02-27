import admin from "../config/firebaseAdmin.js"; // Ensure this path matches your folder structure
import User from "../models/User.js";

export const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No token provided. Authorization required." });
  }

  const idToken = authHeader.split("Bearer ")[1];

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.firebaseUser = decodedToken;

    let mongoUser = await User.findOne({ firebaseUid: decodedToken.uid });

    if (!mongoUser) {
      const provider = decodedToken.firebase?.sign_in_provider || "password";
      const email = decodedToken.email || `${decodedToken.uid}@firebase.local`;
      try {
        mongoUser = await User.create({
          firebaseUid: decodedToken.uid,
          name: decodedToken.name || email.split("@")[0] || "Student",
          email,
          photoURL: decodedToken.picture || "",
          role: "student",
          authProviders: [provider],
        });
      } catch (dbError) {
        if (dbError?.code === 11000 && email) {
          const byEmail = await User.findOne({ email });
          if (byEmail) {
            byEmail.firebaseUid = decodedToken.uid;
            byEmail.name = decodedToken.name || byEmail.name;
            byEmail.photoURL = decodedToken.picture || byEmail.photoURL;
            byEmail.lastLoginAt = new Date();
            byEmail.authProviders = Array.from(new Set([...(byEmail.authProviders || []), provider]));
            await byEmail.save();
            mongoUser = byEmail;
          } else {
            throw dbError;
          }
        } else {
          throw dbError;
        }
      }
    }

    req.user = mongoUser;
    return next();
  } catch (error) {
    if (error?.code === 11000) {
      console.error("Firebase user upsert conflict:", error.message);
      return res.status(409).json({ error: "User profile conflict. Please retry sign-in." });
    }
    if (error.code === "auth/id-token-expired") {
      return res.status(401).json({ error: "Token expired. Please sign in again." });
    }
    if (error.code === "auth/argument-error" || error.code === "auth/id-token-revoked") {
      return res.status(401).json({ error: "Invalid token." });
    }

    console.error("Firebase token verification error:", error.message);
    return res.status(401).json({ error: "Authentication failed." });
  }
};

export const adminOnly = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ error: "Admin access required." });
  }
  return next();
};

export const studentOnly = (req, res, next) => {
  if (!req.user || req.user.role !== "student") {
    return res.status(403).json({ error: "Student access required." });
  }
  return next();
};