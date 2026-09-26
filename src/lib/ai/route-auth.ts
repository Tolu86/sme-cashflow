import "server-only";
import { verifyIdToken, getAdminDb } from "@/lib/firebase/admin";
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export async function verifyRequest(req: Request, businessId?: string): Promise<{ uid: string }> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) throw new AuthError(401, "Missing authentication token.");
  const token = authHeader.slice(7);
  let decoded;
  try {
    decoded = await verifyIdToken(token);
  } catch (firstErr) {
    await sleep(1200);
    try {
      decoded = await verifyIdToken(token);
    } catch (secondErr) {
      const code =
  (secondErr as { code?: string } | undefined)?.code ??
  "unknown";

const errorName =
  secondErr instanceof Error
    ? secondErr.name
    : typeof secondErr;

const errorMessage =
  secondErr instanceof Error
    ? secondErr.message
    : "No error message available";

// Do not log tokens, credentials or full error objects.
const safeMessage = errorMessage
  .replace(/-----BEGIN [\s\S]*?-----END [^-]+-----/g, "[REDACTED]")
  .replace(/Bearer\s+\S+/gi, "Bearer [REDACTED]")
  .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, "[REDACTED]")
  .slice(0, 300);

console.error(
  `[route-auth] Firebase verification failed: code=${code}, name=${errorName}, message=${safeMessage}`
);

throw new AuthError(
  401,
  "Authentication failed. Please sign in again."
);
    }
  }
  if (businessId) {
    const db = getAdminDb();
    const biz = await db.doc(`businesses/${businessId}`).get();
    const isOwner = biz.exists && biz.data()?.ownerId === decoded.uid;
    if (!isOwner) throw new AuthError(403, "You don't have access to this business.");
  }
  return { uid: decoded.uid };
}

export class AuthError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function errorResponse(err: unknown): Response {
  if (err instanceof AuthError) {
    return Response.json({ error: err.message }, { status: err.status });
  }
  const message = err instanceof Error ? err.message : "Internal server error";
  return Response.json({ error: message }, { status: 500 });
}