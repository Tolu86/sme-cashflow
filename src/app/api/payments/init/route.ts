import "server-only";
import { verifyRequest, errorResponse } from "@/lib/ai/route-auth";
import { getAdminDb } from "@/lib/firebase/admin";
import { planMeta } from "@/lib/plans";
import type { PlanId } from "@/types";

export const maxDuration = 30;

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_BASE = "https://api.paystack.co";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

const PLAN_IDS = new Set(["pro", "premium"] as PlanId[]);

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { businessId?: string; plan?: PlanId };
    if (!body.businessId || !body.plan || !PLAN_IDS.has(body.plan)) {
      return Response.json({ error: "Invalid request" }, { status: 400 });
    }

    const { uid } = await verifyRequest(req, body.businessId);
    const db = getAdminDb();
    const bizSnap = await db.doc(`businesses/${body.businessId}`).get();
    const biz = bizSnap.data();
    if (!biz || biz.ownerId !== uid) {
      return Response.json({ error: "You don't have access to this business." }, { status: 403 });
    }

    const userSnap = await db.doc(`users/${uid}`).get();
    const email = (userSnap.data()?.email as string | undefined) ?? "";
    const meta = planMeta(body.plan);

    if (!PAYSTACK_SECRET) {
      // No gateway configured — apply the plan locally (dev mode).
      await bizSnap.ref.update({
        plan: body.plan,
        planUpdatedAt: Date.now(),
        planSource: "local",
      });
      return Response.json({ mode: "local", plan: body.plan });
    }

    const reference = `sme_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    const res = await fetch(`${PAYSTACK_BASE}/transaction/initialize`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        amount: meta.price,
        currency: "NGN",
        plan: body.plan,
        callback_url: `${APP_URL}/settings?trxref=&plan_id`,
        metadata: {
          business_id: body.businessId,
          plan: body.plan,
          nonce: Math.random().toString(36).slice(2, 10),
        },
      }),
    });
    const data = (await res.json()) as {
      status?: boolean;
      message?: string;
      data?: { authorization_url?: string };
    };
    if (!res.ok || !data.status || !data.data?.authorization_url) {
      return Response.json({ error: data.message ?? "Payment gateway error." }, { status: 502 });
    }
    return Response.json({
      mode: "paystack",
      authorizationUrl: data.data.authorization_url,
      reference,
    });
  } catch (err) {
    return errorResponse(err);
  }
}