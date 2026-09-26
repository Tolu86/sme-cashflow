import "server-only";

import { verifyRequest, errorResponse } from "@/lib/ai/route-auth";
import { getAdminDb } from "@/lib/firebase/admin";
import { planMeta } from "@/lib/plans";
import type { PlanId } from "@/types";

export const maxDuration = 30;

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_BASE = "https://api.paystack.co";
const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

const PAYSTACK_PRO_PLAN_CODE = "PLN_u3cfv54cgum96k3";

const PLAN_IDS = new Set<PlanId>(["pro"]);

export async function POST(req: Request) {
  try {
    // ---------------------------------------------------------
    // 1. Make sure Paystack is configured
    // ---------------------------------------------------------

    if (!PAYSTACK_SECRET) {
      console.error("PAYSTACK_SECRET_KEY is not configured.");

      return Response.json(
        {
          error: "Payment gateway is not configured.",
        },
        { status: 503 }
      );
    }

    // ---------------------------------------------------------
    // 2. Read request
    // ---------------------------------------------------------

    const body = (await req.json()) as {
      businessId?: string;
      plan?: PlanId;
    };

    if (!body.businessId || !body.plan || !PLAN_IDS.has(body.plan)) {
      return Response.json(
        {
          error: "Invalid business ID or plan.",
        },
        { status: 400 }
      );
    }

    // ---------------------------------------------------------
    // 3. Authenticate user
    // ---------------------------------------------------------

    const { uid } = await verifyRequest(req, body.businessId);

    const db = getAdminDb();

    // ---------------------------------------------------------
    // 4. Verify business ownership
    // ---------------------------------------------------------

    const bizRef = db.doc(`businesses/${body.businessId}`);
    const bizSnap = await bizRef.get();

    if (!bizSnap.exists) {
      return Response.json(
        {
          error: "Business not found.",
        },
        { status: 404 }
      );
    }

    const biz = bizSnap.data();

    if (!biz || biz.ownerId !== uid) {
      return Response.json(
        {
          error: "You don't have access to this business.",
        },
        { status: 403 }
      );
    }

    // ---------------------------------------------------------
    // 5. Get user's email
    // ---------------------------------------------------------

    const userSnap = await db.doc(`users/${uid}`).get();

    const email = userSnap.data()?.email as string | undefined;

    if (!email) {
      return Response.json(
        {
          error: "No email address is associated with this account.",
        },
        { status: 400 }
      );
    }

    // ---------------------------------------------------------
    // 6. Get Pro plan
    // ---------------------------------------------------------

    const meta = planMeta(body.plan);

    if (
      !meta ||
      body.plan !== "pro" ||
      meta.price !== 300_000
    ) {
      return Response.json(
        {
          error: "Invalid Pro plan configuration.",
        },
        { status: 400 }
      );
    }

    // ---------------------------------------------------------
    // 7. Generate unique transaction reference
    // ---------------------------------------------------------

    const reference = `sme-${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 10)}`;

    // ---------------------------------------------------------
    // 8. Create pending payment record
    // ---------------------------------------------------------

    await db.doc(`paymentTransactions/${reference}`).set({
      reference,
      userId: uid,
      businessId: body.businessId,
      email,
      plan: "pro",
      amount: meta.price,
      currency: "NGN",
      status: "pending",
      provider: "paystack",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // ---------------------------------------------------------
    // 9. Initialize Paystack subscription
    // ---------------------------------------------------------

    const paystackResponse = await fetch(
      `${PAYSTACK_BASE}/transaction/initialize`,
      {
        method: "POST",

        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET}`,
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          email,

          // 300,000 kobo = ₦3,000
          amount: meta.price,

          currency: "NGN",

          reference,

          // This connects the payment to your
          // ₦3,000/month Paystack subscription plan.
          plan: PAYSTACK_PRO_PLAN_CODE,

          callback_url: `${APP_URL}/settings`,

          metadata: {
            business_id: body.businessId,
            user_id: uid,
            plan: "pro",
          },
        }),
      }
    );

    // ---------------------------------------------------------
    // 10. Parse Paystack response
    // ---------------------------------------------------------

    const data = (await paystackResponse.json()) as {
      status?: boolean;
      message?: string;
      data?: {
        authorization_url?: string;
        access_code?: string;
        reference?: string;
      };
    };

    // ---------------------------------------------------------
    // 11. Handle Paystack failure
    // ---------------------------------------------------------

    if (
      !paystackResponse.ok ||
      !data.status ||
      !data.data?.authorization_url
    ) {
      console.error("Paystack initialization failed:", data);

      await db
        .doc(`paymentTransactions/${reference}`)
        .update({
          status: "initialization_failed",
          error: data.message ?? "Payment gateway error.",
          updatedAt: Date.now(),
        });

      return Response.json(
        {
          error: data.message ?? "Payment gateway error.",
        },
        { status: 502 }
      );
    }

    // ---------------------------------------------------------
    // 12. Save Paystack information
    // ---------------------------------------------------------

    await db
      .doc(`paymentTransactions/${reference}`)
      .update({
        status: "initialized",
        accessCode: data.data.access_code ?? null,
        authorizationUrl: data.data.authorization_url,
        paystackReference:
          data.data.reference ?? reference,
        updatedAt: Date.now(),
      });

    // ---------------------------------------------------------
    // 13. Return checkout URL
    // ---------------------------------------------------------

    return Response.json({
      mode: "paystack",
      authorizationUrl: data.data.authorization_url,
      reference,
      plan: "pro",
    });
  } catch (err) {
    console.error("Paystack initialization error:", err);

    return errorResponse(err);
  }
}