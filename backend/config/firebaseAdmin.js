import admin from "firebase-admin";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

let serviceAccount;

try {
  // 1. Production (Render): Load from Environment Variable
  if (process.env.FIREBASE_CREDENTIALS) {
    console.log("Loading Firebase credentials from Environment Variable...");
    serviceAccount = JSON.parse(process.env.FIREBASE_CREDENTIALS);
  } 
  // 2. Local Development: Load from physical file
  else {
    console.log("Loading Firebase credentials from local file...");
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    
    // Looks in the current directory, or falls back to services/ directory
    const defaultPath = path.resolve(__dirname, "serviceAccountKey.json");
    const altPath = path.resolve(__dirname, "../services/serviceAccountKey.json");

    if (fs.existsSync(defaultPath)) {
      serviceAccount = JSON.parse(fs.readFileSync(defaultPath, "utf-8"));
    } else if (fs.existsSync(altPath)) {
      serviceAccount = JSON.parse(fs.readFileSync(altPath, "utf-8"));
    } else {
      throw new Error("Could not locate serviceAccountKey.json locally.");
    }
  }

  // Ensure the private key formatting doesn't break when parsed from an Env Var
  if (serviceAccount.private_key) {
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");
  }

  if (!serviceAccount.private_key.includes("BEGIN PRIVATE KEY")) {
    throw new Error("private_key is not a valid PEM private key.");
  }

} catch (error) {
  console.error("FATAL: Firebase Admin credentials could not be loaded.");
  console.error(`Reason: ${error.message}`);
  process.exit(1);
}

// Initialize Firebase Admin securely
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

export default admin;