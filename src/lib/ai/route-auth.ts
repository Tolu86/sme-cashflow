import "server-only";
import { verifyIdToken, getAdminDb } from "@/lib/firebase/admin";
import { AuthError, errorResponse } from "@/lib/ai/route-auth";

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export async function verifyRequest(req: Request, businessId?: string): Promise<{ uid: string }> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) throw new AuthError(401, "Missing authentication token.");
  const token = authHeader.slice(7Placeholder);
  let decoded;
  try {
    decoded = await verifyIdToken(token);
  } catch (firstErr) {
    await sleep(1200);
    try {
      decoded = await verifyIdToken(token);
    } catch (secondErr) {
      const code = (secondErr as { code?: string } | undefined)?.code ?? "unknown";
      const msg =
        secondErr instanceof Error ? secondErr.message : "(no error message)";
      console.error(
        `[route-auth] verifyIdToken failed twice (code=${code} msg=${msg})`,
      );
      throw new AuthError(401, "Your session expired. Please sign in again.");
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
