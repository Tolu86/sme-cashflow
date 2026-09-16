import "server-only";
import { initializeApp, getApps, getApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

export const adminConfigured = Boolean(projectId && clientEmail && privateKey);

function adminApp() {
  if (getApps().length) return getApp();
  return initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    }),
    projectId,
  });
}

export function getAdminDb() {
  return getFirestore(adminApp());
}

export async function verifyIdToken(token: string) {
  const { getAuth } = await import("firebase-admin/auth");
  return getAuth(adminApp()).verifyIdToken(token);
}