import "server-only";

import { verifyIdToken, getAdminDb } from "@/lib/firebase/admin";

export const maxDuration = 30;

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_BASE = "https://api.paystack.co";

const PLAN_IDS = new Set(["pro"]);

export async function POST(req: Request) {
  try {
    // ---------------------------------------------------------
    // 1. Paystack must be configured
    // ---------------------------------------------------------

    if (!PAYSTACK_SECRET) {
      return Response.json(
        { error: "Payment gateway is not configured." },
        { status: 503 }
      );
    }

    // ---------------------------------------------------------
    // 2. Read request
    // ---------------------------------------------------------

    const body = (await req.json().catch(() => ({}))) as {
      reference?: string;
      businessId?: string;
    };

    if (!body.reference || !body.businessId) {
      return Response.json(
        { error: "Reference and business ID are required." },
        { status: 400 }
      );
    }

    // ---------------------------------------------------------
    // 3. Authenticate the user
    // ---------------------------------------------------------

    const authHeader = req.headers.get("authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return Response.json(
        { error: "Missing authentication token." },
        { status: 401 }
      );
    }

    let decoded;

    try {
      decoded = await verifyIdToken(authHeader.slice(7));
    } catch {
      return Response.json(
        { error: "Invalid or expired token." },
        { status: 401 }
      );
    }

    const db = getAdminDb();

    // ---------------------------------------------------------
    // 4. Verify business ownership
    // ---------------------------------------------------------

    const bizRef = db.doc(`businesses/${body.businessId}`);
    const bizSnap = await bizRef.get();
    const biz = bizSnap.data();

    if (!biz || biz.ownerId !== decoded.uid) {
      return Response.json(
        { error: "You don't have access to this business." },
        { status: 403 }
      );
    }

    // ---------------------------------------------------------
    // 5. Find our pending payment
    // ---------------------------------------------------------

    const paymentRef = db.doc(
      `paymentTransactions/${body.reference}`
    );

    const paymentSnap = await paymentRef.get();

    if (!paymentSnap.exists) {
      return Response.json(
        { error: "Payment transaction not found." },
        { status: 404 }
      );
    }

    const payment = paymentSnap.data();

    // ---------------------------------------------------------
    // 6. Make sure this payment belongs to this user/business
    // ---------------------------------------------------------

    if (
      payment?.userId !== decoded.uid ||
      payment?.businessId !== body.businessId
    ) {
      return Response.json(
        { error: "Payment ownership mismatch." },
        { status: 403 }
      );
    }

    // ---------------------------------------------------------
    // 7. Only Pro is currently purchasable
    // ---------------------------------------------------------

    const plan = payment?.plan as string | undefined;

    if (!plan || !PLAN_IDS.has(plan)) {
      return Response.json(
        { error: "Invalid payment plan." },
        { status: 400 }
      );
    }

    // ---------------------------------------------------------
    // 8. Prevent duplicate fulfillment
    // ---------------------------------------------------------

    if (payment?.status === "paid") {
      return Response.json({
        ok: true,
        plan: "pro",
        alreadyProcessed: true,
      });
    }

    // ---------------------------------------------------------
    // 9. Verify transaction directly with Paystack
    // ---------------------------------------------------------

    const paystackResponse = await fetch(
      `${PAYSTACK_BASE}/transaction/verify/${encodeURIComponent(
        body.reference
      )}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET}`,
        },
      }
    );

    const paystackData = (await paystackResponse.json()) as {
      status?: boolean;
      message?: string;
      data?: {
        status?: string;
        reference?: string;
        amount?: number;
        currency?: string;
        metadata?: {
          business_id?: string;
          user_id?: string;
          plan?: string;
        };
      };
    };

    // ---------------------------------------------------------
    // 10. Check Paystack response
    // ---------------------------------------------------------

    if (
      !paystackResponse.ok ||
      !paystackData.status ||
      !paystackData.data
    ) {
      return Response.json(
        {
          error:
            paystackData.message ??
            "Unable to verify payment with Paystack.",
        },
        { status: 502 }
      );
    }

    const transaction = paystackData.data;

    // ---------------------------------------------------------
    // 11. Payment must actually be successful
    // ---------------------------------------------------------

    if (transaction.status !== "success") {
      return Response.json(
        {
          error: "Payment has not been completed.",
          status: transaction.status ?? "unknown",
        },
        { status: 402 }
      );
    }

    // ---------------------------------------------------------
    // 12. Verify Paystack reference
    // ---------------------------------------------------------

    if (transaction.reference !== body.reference) {
      return Response.json(
        { error: "Transaction reference mismatch." },
        { status: 400 }
      );
    }

    // ---------------------------------------------------------
    // 13. Verify metadata
    // ---------------------------------------------------------

    const metadata = transaction.metadata;

    if (
      metadata?.business_id &&
      metadata.business_id !== body.businessId
    ) {
      return Response.json(
        { error: "Payment business mismatch." },
        { status: 400 }
      );
    }

    if (
      metadata?.user_id &&
      metadata.user_id !== decoded.uid
    ) {
      return Response.json(
        { error: "Payment user mismatch." },
        { status: 400 }
      );
    }

    if (
      metadata?.plan &&
      metadata.plan !== plan
    ) {
      return Response.json(
        { error: "Payment plan mismatch." },
        { status: 400 }
      );
    }

    // ---------------------------------------------------------
    // 14. Verify amount
    // ---------------------------------------------------------

    const expectedAmount = payment?.amount;

    if (
      typeof expectedAmount !== "number" ||
      transaction.amount !== expectedAmount
    ) {
      return Response.json(
        { error: "Payment amount mismatch." },
        { status: 400 }
      );
    }

    // ---------------------------------------------------------
    // 15. Verify currency
    // ---------------------------------------------------------

    if (transaction.currency !== "NGN") {
      return Response.json(
        { error: "Payment currency mismatch." },
        { status: 400 }
      );
    }

    // ---------------------------------------------------------
    // 16. Activate Pro
    // ---------------------------------------------------------

    const now = Date.now();

    await db.runTransaction(async (tx) => {
      const freshPaymentSnap = await tx.get(paymentRef);

      if (freshPaymentSnap.exists) {
        const freshPayment = freshPaymentSnap.data();

        // Another request/webhook may have processed it already.
        if (freshPayment?.status === "paid") {
          return;
        }
      }

      tx.update(paymentRef, {
        status: "paid",
        verifiedAt: now,
        paystackStatus: transaction.status,
        paystackAmount: transaction.amount,
        paystackCurrency: transaction.currency,
        updatedAt: now,
      });

      tx.update(bizRef, {
        plan: "pro",
        planUpdatedAt: now,
        planSource: `paystack:${body.reference}`,
      });
    });

    // ---------------------------------------------------------
    // 17. Return success
    // ---------------------------------------------------------

    return Response.json({
      ok: true,
      plan: "pro",
      reference: body.reference,
    });
  } catch (err) {
    console.error("Paystack verification error:", err);

    const message =
      err instanceof Error
        ? err.message
        : "Internal server error";

    return Response.json(
      { error: message },
      { status: 500 }
    );
  }
}