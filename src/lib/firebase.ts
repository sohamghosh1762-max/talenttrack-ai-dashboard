import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, type Auth } from "firebase/auth";

export const firebaseConfig = {
  apiKey: (import.meta.env.VITE_FIREBASE_API_KEY || "").trim(),
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "talenttrack-ai-75a10.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "talenttrack-ai-75a10",
  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "talenttrack-ai-75a10.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "522852717438",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:522852717438:web:d6d24b4d5961545d8c592f",
};

function createFirebaseApp(): FirebaseApp {
  const existingApps = getApps();
  if (existingApps.length > 0) {
    const existing = existingApps[0]!;
    if (
      existing.options.apiKey === firebaseConfig.apiKey &&
      existing.options.projectId === firebaseConfig.projectId
    ) {
      return existing;
    }
  }
  return initializeApp(firebaseConfig);
}

const app: FirebaseApp = createFirebaseApp();

let authInstance: Auth;
try {
  authInstance = getAuth(app);
} catch {
  authInstance = {} as Auth;
}

const auth: Auth = authInstance;

const googleAuthProvider = new GoogleAuthProvider();
googleAuthProvider.setCustomParameters({ prompt: "select_account" });

// Safe diagnostic confirmation without exposing complete key
if (typeof window !== "undefined") {
  const rawKey = firebaseConfig.apiKey || "";
  console.log("[Firebase Runtime Diagnostic]", {
    projectId: firebaseConfig.projectId,
    authDomain: firebaseConfig.authDomain,
    appId: firebaseConfig.appId,
    apiKeyConfigured: Boolean(rawKey),
    apiKeyLength: rawKey.length,
    apiKeyPrefix: rawKey.length >= 6 ? rawKey.slice(0, 6) : rawKey,
    apiKeySuffix: rawKey.length >= 4 ? rawKey.slice(-4) : rawKey,
  });
}

// Canonical exports
export { app, auth, googleAuthProvider };
export const firebaseApp = app;
export const firebaseAuth = auth;
export default app;
