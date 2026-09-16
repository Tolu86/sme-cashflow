import "server-only";
import { verifyIdToken, getAdminDb } from "@/lib/firebase/admin";

export async function verifyRequest(req: Request, businessId?: string): Promise<{ uid: string }> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) throw new AuthError(401, "Missing authentication token.");
  const token = authHeader.slice(7);
  let decoded;
  try {
    decoded = await verifyIdToken(token);
  } catch {
    throw new AuthError(401, "Invalid or expired token.");
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