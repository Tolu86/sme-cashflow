import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { storage } from "@/lib/firebase/client";

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

export function validateScreenshot(file: File): string | null {
  if (!file.type.startsWith("image/")) return "Only image files are allowed.";
  if (!ALLOWED.includes(file.type)) return "Use JPG, PNG, WebP, or HEIC.";
  if (file.size > MAX_BYTES) return "Image must be under 5 MB.";
  return null;
}

export async function uploadScreenshot(uid: string, file: File): Promise<{ url: string; path: string }> {
  if (!storage) throw new Error("Firebase Storage is not configured.");
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const name = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
  const objectRef = ref(storage, `screenshots/${uid}/${name}`);
  await uploadBytes(objectRef, file, { contentType: file.type });
  const url = await getDownloadURL(objectRef);
  return { url, path: objectRef.fullPath };
}

export async function deleteScreenshot(path?: string): Promise<void> {
  if (!path || !storage) return;
  try {
    await deleteObject(ref(storage, path));
  } catch {
    // The object may already be gone; ignore.
  }
}