import admin from "firebase-admin";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverDir = path.resolve(__dirname, "..");

const resolveCredentialPath = () => {
  const configuredPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

  const fromServerDir = (candidate) =>
    path.isAbsolute(candidate) ? candidate : path.resolve(serverDir, candidate);

  const candidates = [
    configuredPath ? fromServerDir(configuredPath) : null,
    "./serviceAccountKey.json",
    "./services/serviceAccountKey.json",
  ]
    .filter(Boolean)
    .map((candidate) => fromServerDir(candidate));

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return fromServerDir(configuredPath || "./serviceAccountKey.json");
};

let serviceAccount;
try {
  const credentialsPath = resolveCredentialPath();
  const fileContent = fs.readFileSync(credentialsPath, "utf-8");
  serviceAccount = JSON.parse(fileContent);

  if (!serviceAccount.private_key || serviceAccount.private_key.includes("replace_with_real_key")) {
    throw new Error("Placeholder/private_key missing. Use the real key from Firebase Console.");
  }

  serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");

  if (!serviceAccount.private_key.includes("BEGIN PRIVATE KEY")) {
    throw new Error("private_key is not a valid PEM private key.");
  }
} catch (error) {
  console.error("FATAL: Firebase Admin credentials could not be loaded.");
  console.error("Expected GOOGLE_APPLICATION_CREDENTIALS to point to a valid Firebase key JSON.");
  console.error("Download from Firebase Console -> Project Settings -> Service Accounts.");
  console.error(`Reason: ${error.message}`);
  process.exit(1);
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

export default admin;
