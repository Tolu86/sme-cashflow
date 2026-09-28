import "server-only";

import {
  verifyRequest,
  errorResponse,
} from "@/lib/ai/route-auth";

import {
  getAdminDb,
  getAdminAuth,
} from "@/lib/firebase/admin";

import { planMeta } from "@/lib/plans";
import type { PlanId } from "@/types";

export const maxDuration = 30;

const PAYSTACK_SECRET =
  process.env.PAYSTACK_SECRET_KEY;

const PAYSTACK_BASE =
  "https://api.paystack.co";

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ??
  "http://localhost:3000";

const PAYSTACK_PRO_PLAN_CODE =
  "PLN_u3cfv54cgum96k3";

const PLAN_IDS = new Set<PlanId>(["pro"]);

export async function POST(req: Request) {
  try {
    /*
     * Make sure Paystack is configured.
     */
    if (!PAYSTACK_SECRET) {
      console.error(
        "PAYSTACK_SECRET_KEY is not configured."
      );

      return Response.json(
        {
          error:
            "Payment gateway is not configured.",
        },
        { status: 503 }
      );
    }

    /*
     * Read request body.
     */
    const body = (await req.json()) as {
      businessId?: string;
      plan?: PlanId;
    };

    /*
     * Validate business ID and plan.
     */
    if (
      !body.businessId ||
      !body.plan ||
      !PLAN_IDS.has(body.plan)
    ) {
      return Response.json(
        {
          error:
            "Invalid business ID or plan.",
        },
        { status: 400 }
      );
    }

    /*
     * Verify the Firebase user and
     * confirm they own this business.
     */
    const { uid } = await verifyRequest(
      req,
      body.businessId
    );

    const db = getAdminDb();

    const bizRef = db.doc(
      `businesses/${body.businessId}`
    );

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
          error:
            "You don't have access to this business.",
        },
        { status: 403 }
      );
    }

    /*
     * Get the user's email directly from
     * Firebase Authentication.
     *
     * We intentionally do NOT use
     * users/{uid}.email because that
     * Firestore document can be edited
     * by the user.
     */
    const auth = getAdminAuth();

    const firebaseUser =
      await auth.getUser(uid);

    const email = firebaseUser.email;

    if (!email) {
      return Response.json(
        {
          error:
            "No email address is associated with this account.",
        },
        { status: 400 }
      );
    }

    /*
     * Validate the Pro plan configuration.
     */
    const meta = planMeta(body.plan);

    if (
      !meta ||
      body.plan !== "pro" ||
      meta.price !== 300_000
    ) {
      return Response.json(
        {
          error:
            "Invalid Pro plan configuration.",
        },
        { status: 400 }
      );
    }

    /*
     * Generate our internal payment reference.
     */
    const reference =
      `sme-${Date.now()}_${Math.random()
        .toString(36)
        .slice(2, 10)}`;

    /*
     * Create a pending payment record
     * before contacting Paystack.
     */
    await db
      .doc(`paymentTransactions/${reference}`)
      .set({
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

    /*
     * Initialize the Paystack transaction.
     *
     * The plan code tells Paystack to
     * create the recurring subscription
     * after the initial payment succeeds.
     */
    const paystackResponse =
      await fetch(
        `${PAYSTACK_BASE}/transaction/initialize`,
        {
          method: "POST",

          headers: {
            Authorization:
              `Bearer ${PAYSTACK_SECRET}`,
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            email,
            amount: meta.price,
            currency: "NGN",
            reference,

            /*
             * Paystack recurring plan.
             */
            plan: PAYSTACK_PRO_PLAN_CODE,

            /*
             * Where Paystack sends the
             * customer after checkout.
             */
            callback_url:
              `${APP_URL}/settings?plan=pro`,

            /*
             * Metadata allows us to connect
             * the Paystack transaction back
             * to the correct user/business.
             */
            metadata: {
              business_id:
                body.businessId,

              user_id: uid,

              plan: "pro",
            },
          }),
        }
      );

    const data =
      (await paystackResponse.json()) as {
        status?: boolean;

        message?: string;

        data?: {
          authorization_url?: string;
          access_code?: string;
          reference?: string;
        };
      };

    /*
     * Make sure Paystack successfully
     * created the checkout transaction.
     */
    if (
      !paystackResponse.ok ||
      !data.status ||
      !data.data?.authorization_url
    ) {
      console.error(
        "Paystack initialization failed:",
        data
      );

      await db
        .doc(
          `paymentTransactions/${reference}`
        )
        .update({
          status:
            "initialization_failed",

          error:
            data.message ??
            "Payment gateway error.",

          updatedAt: Date.now(),
        });

      return Response.json(
        {
          error:
            data.message ??
            "Payment gateway error.",
        },
        { status: 502 }
      );
    }

    /*
     * Save Paystack checkout information.
     */
    await db
      .doc(
        `paymentTransactions/${reference}`
      )
      .update({
        status: "initialized",

        accessCode:
          data.data.access_code ??
          null,

        authorizationUrl:
          data.data.authorization_url,

        paystackReference:
          data.data.reference ??
          reference,

        updatedAt: Date.now(),
      });

    /*
     * Send the checkout URL back
     * to the frontend.
     */
    return Response.json({
      mode: "paystack",

      authorizationUrl:
        data.data.authorization_url,

      reference,

      plan: "pro",
    });
  } catch (err) {
    console.error(
      "Paystack initialization error:",
      err
    );

    return errorResponse(err);
  }
}