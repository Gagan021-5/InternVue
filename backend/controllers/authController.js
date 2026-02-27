import User from "../models/User.js";

const upsertFirebaseUser = async ({
  firebaseUid,
  email,
  name,
  photoURL,
  provider = "password",
}) => {
  const safeEmail =
    typeof email === "string" && email.trim()
      ? email.trim().toLowerCase()
      : `${firebaseUid}@firebase.local`;
  const safeName =
    typeof name === "string" && name.trim() ? name.trim() : safeEmail.split("@")[0] || "Student";
  const safePhoto = typeof photoURL === "string" ? photoURL : "";

  try {
    return await User.findOneAndUpdate(
      { firebaseUid },
      {
        $set: {
          email: safeEmail,
          name: safeName,
          photoURL: safePhoto,
          lastLoginAt: new Date(),
        },
        $setOnInsert: {
          firebaseUid,
          role: "student",
        },
        $addToSet: {
          authProviders: provider,
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
  } catch (error) {
    // Resolve duplicate-email collisions by linking the existing profile to this Firebase UID.
    if (error?.code === 11000 && safeEmail) {
      const byEmail = await User.findOne({ email: safeEmail });
      if (byEmail) {
        byEmail.firebaseUid = firebaseUid;
        byEmail.name = safeName || byEmail.name;
        byEmail.photoURL = safePhoto || byEmail.photoURL;
        byEmail.lastLoginAt = new Date();
        byEmail.authProviders = Array.from(
          new Set([...(byEmail.authProviders || []), provider].filter(Boolean))
        );
        await byEmail.save();
        return byEmail;
      }
    }

    throw error;
  }
};

export const syncUser = async (req, res) => {
  try {
    const { name, email, photoURL } = req.body || {};
    const firebaseUid = req.firebaseUser?.uid;
    if (!firebaseUid) {
      return res.status(400).json({ error: "Missing Firebase UID." });
    }

    const provider = req.firebaseUser?.firebase?.sign_in_provider || "password";
    const updated = await upsertFirebaseUser({
      firebaseUid,
      // Prefer verified Firebase claims; fall back to payload, then existing Mongo profile.
      email: req.firebaseUser?.email || email || req.user?.email,
      name: req.firebaseUser?.name || name || req.user?.name,
      photoURL: req.firebaseUser?.picture || photoURL || req.user?.photoURL,
      provider,
    });

    return res.json({ success: true, user: updated });
  } catch (error) {
    console.error("syncUser error:", error);
    if (error?.code === 11000) {
      return res.status(409).json({ error: "User profile conflict. Please retry sign-in." });
    }
    return res.status(500).json({ error: "Failed to sync user profile." });
  }
};

export const socialSignup = async (req, res) => {
  try {
    const { name, email, photoURL, provider: providerFromBody } = req.body || {};
    const firebaseUid = req.firebaseUser?.uid;

    if (!firebaseUid) {
      return res.status(400).json({ error: "Missing Firebase UID." });
    }

    const provider =
      req.firebaseUser?.firebase?.sign_in_provider || providerFromBody || "password";

    const updated = await upsertFirebaseUser({
      firebaseUid,
      email: req.firebaseUser?.email || email || req.user?.email,
      name: req.firebaseUser?.name || name || req.user?.name,
      photoURL: req.firebaseUser?.picture || photoURL || req.user?.photoURL,
      provider,
    });

    return res.status(200).json({ success: true, user: updated });
  } catch (error) {
    console.error("socialSignup error:", error.message);
    if (error?.code === 11000) {
      return res.status(409).json({ error: "User profile conflict. Please retry sign-in." });
    }
    return res.status(500).json({ error: "Failed social signup." });
  }
};

export const getMe = async (req, res) => {
  return res.json({ user: req.user });
};

export const updateProfile = async (req, res) => {
  try {
    const { githubUrl, portfolioUrl, resumeUrl, bio, skills, location } = req.body;

    const updated = await User.findByIdAndUpdate(
      req.user._id,
      {
        $set: {
          githubUrl: typeof githubUrl === "string" ? githubUrl : req.user.githubUrl,
          portfolioUrl: typeof portfolioUrl === "string" ? portfolioUrl : req.user.portfolioUrl,
          resumeUrl: typeof resumeUrl === "string" ? resumeUrl : req.user.resumeUrl,
          bio: typeof bio === "string" ? bio : req.user.bio,
          skills: Array.isArray(skills) ? skills : req.user.skills,
          location: typeof location === "object" && location ? location : req.user.location,
        },
      },
      { new: true }
    );

    return res.json({ user: updated });
  } catch (error) {
    console.error("updateProfile error:", error.message);
    return res.status(500).json({ error: "Failed to update profile." });
  }
};
