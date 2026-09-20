import "server-only";
import { verifyIdToken, getAdminDb } from "@/lib/firebase/admin";

export const maxDuration = 30;

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_BASE = "https://api.paystack.co";

const PLAN_IDS = new Set(["pro", "premium"]);

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      reference?: string;
      businessId?: string;
      plan?: string;
    };
    if (!body.reference || !body.businessId || !PLAN_IDS.has(body.plan ?? "")) {
      return Response.json({ error: "Invalid request" }, { status: 400 });
    }

    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return Response.json({ error: "Missing authentication token" }, { status: 401 });
    }
    let decoded;
    try {
      decoded = await verifyIdToken(authHeader.slice(7));
    } catch {
      return Response.json({ error: "Invalid or expired token" }, { status: 401 });
    }

    const db = getAdminDb();
    const bizSnap = await db.doc(`businesses/${body.businessId}`).get();
    const biz = bizSnap.data();
    if (!biz || biz.ownerId !== decoded.uid) {
      return Response.json({ error: "You don't have access to this business" }, { status: 403 });
    }

    let reference = body.reference;

    // Verify only when a gateway is configured.
    if (PAYSTACK_SECRET) {
      const res = await fetch(`${PAYSTACK_BASE}/transaction/verify/${body.reference}`, {
        headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` },
      });
      const data = (await res.json()) as {
        data?: { status?: string; metadata?: { business_id?: string; plan?: string } };
      };
      if (!data.data || data.data.status !== "success") {
        return Response.json({ error: "Payment not completed" }, { status: 402 });
      }
      const meta = data.data.metadata;
      if (meta?.business_id && meta.business_id !== body.businessId) {
        return Response.json({ error: "Payment mismatch" }, { status: 400 });
      }
      if (meta?.plan && PLAN_IDS.has(meta.plan)) {
        reference = `paystack:${reference}`;
      }
    }

    await bizSnap.ref.update({
      plan: body.plan,
      planUpdatedAt: Date.now(),
      planSource: PAYSTACK_SECRET ? `paystack:${body.reference}` : "local",
    });

    return Response.json({ ok: true, plan: body.plan });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return Response.json({ error: message }, { status: 500 });
  }
}
