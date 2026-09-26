import "server-only";

import crypto from "node:crypto";
import { getAdminDb } from "@/lib/firebase/admin";

export const maxDuration = 30;

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_PRO_PLAN_CODE = "PLN_u3cfv54cgum96k";

function verifyPaystackSignature(
  rawBody: string,
  signature: string
): boolean {
  if (!PAYSTACK_SECRET || !signature) {
    return false;
  }

  const hash = crypto
    .createHmac("sha512", PAYSTACK_SECRET)
    .update(rawBody)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(hash),
    Buffer.from(signature)
  );
}

export async function POST(req: Request) {
  try {
    // ---------------------------------------------------------
    // 1. Make sure Paystack is configured
    // ---------------------------------------------------------

    if (!PAYSTACK_SECRET) {
      console.error(
        "PAYSTACK_SECRET_KEY is not configured."
      );

      return Response.json(
        { error: "Webhook is not configured." },
        { status: 503 }
      );
    }

    // ---------------------------------------------------------
    // 2. Read the RAW request body
    // ---------------------------------------------------------
    //
    // IMPORTANT:
    // We must read the raw body before JSON parsing because
    // Paystack signs the original request payload.
    //

    const rawBody = await req.text();

    // ---------------------------------------------------------
    // 3. Verify Paystack signature
    // ---------------------------------------------------------

    const signature = req.headers.get(
      "x-paystack-signature"
    );

    if (!signature) {
      console.warn(
        "Paystack webhook rejected: missing signature."
      );

      return Response.json(
        { error: "Missing signature." },
        { status: 401 }
      );
    }

    if (!verifyPaystackSignature(rawBody, signature)) {
      console.warn(
        "Paystack webhook rejected: invalid signature."
      );

      return Response.json(
        { error: "Invalid signature." },
        { status: 401 }
      );
    }

    // ---------------------------------------------------------
    // 4. Parse webhook event
    // ---------------------------------------------------------

    const event = JSON.parse(rawBody) as {
      event?: string;
      data?: Record<string, any>;
    };

    const eventName = event.event;
    const data = event.data;

    if (!eventName || !data) {
      return Response.json(
        { error: "Invalid webhook payload." },
        { status: 400 }
      );
    }

    console.log(
      `Paystack webhook received: ${eventName}`
    );

    const db = getAdminDb();

    // ---------------------------------------------------------
    // 5. Handle successful payment
    // ---------------------------------------------------------

    if (eventName === "charge.success") {
      const reference =
        typeof data.reference === "string"
          ? data.reference
          : null;

      if (!reference) {
        console.warn(
          "charge.success webhook has no reference."
        );

        return Response.json({ received: true });
      }

      const paymentRef = db.doc(
        `paymentTransactions/${reference}`
      );

      const paymentSnap = await paymentRef.get();

      if (!paymentSnap.exists) {
        console.warn(
          `Payment transaction not found: ${reference}`
        );

        // Return 200 so Paystack doesn't repeatedly send
        // an event that our system cannot associate.
        return Response.json({
          received: true,
          ignored: true,
        });
      }

      const payment = paymentSnap.data();

      // -------------------------------------------------------
      // Security checks
      // -------------------------------------------------------

      if (
        payment?.provider !== "paystack" ||
        payment?.plan !== "pro"
      ) {
        console.warn(
          `Invalid payment record for ${reference}`
        );

        return Response.json(
          { error: "Invalid payment record." },
          { status: 400 }
        );
      }

      const metadata =
        data.metadata as
          | {
              business_id?: string;
              user_id?: string;
              plan?: string;
            }
          | undefined;

      if (
        metadata?.business_id &&
        metadata.business_id !== payment.businessId
      ) {
        console.warn(
          `Business mismatch for ${reference}`
        );

        return Response.json(
          { error: "Business mismatch." },
          { status: 400 }
        );
      }

      if (
        metadata?.user_id &&
        metadata.user_id !== payment.userId
      ) {
        console.warn(
          `User mismatch for ${reference}`
        );

        return Response.json(
          { error: "User mismatch." },
          { status: 400 }
        );
      }

      if (
        metadata?.plan &&
        metadata.plan !== "pro"
      ) {
        console.warn(
          `Plan mismatch for ${reference}`
        );

        return Response.json(
          { error: "Plan mismatch." },
          { status: 400 }
        );
      }

      // The plan attached to this subscription must be
      // our Pro Paystack plan.
      const planCode =
        typeof data.plan === "object" &&
        data.plan !== null
          ? (data.plan as { plan_code?: string }).plan_code
          : undefined;

      if (
        planCode &&
        planCode !== PAYSTACK_PRO_PLAN_CODE
      ) {
        console.warn(
          `Paystack plan mismatch for ${reference}`
        );

        return Response.json(
          { error: "Paystack plan mismatch." },
          { status: 400 }
        );
      }

      // Check amount when Paystack provides it.
      if (
        typeof data.amount === "number" &&
        data.amount !== payment.amount
      ) {
        console.warn(
          `Payment amount mismatch for ${reference}`
        );

        return Response.json(
          { error: "Payment amount mismatch." },
          { status: 400 }
        );
      }

      if (
        data.currency &&
        data.currency !== "NGN"
      ) {
        return Response.json(
          { error: "Payment currency mismatch." },
          { status: 400 }
        );
      }

      // -------------------------------------------------------
      // Already processed?
      // -------------------------------------------------------

      if (payment.status === "paid") {
        return Response.json({
          received: true,
          alreadyProcessed: true,
        });
      }

      const businessId =
        payment.businessId as string;

      const bizRef = db.doc(
        `businesses/${businessId}`
      );

      const now = Date.now();

      // -------------------------------------------------------
      // Activate Pro atomically
      // -------------------------------------------------------

      await db.runTransaction(async (tx) => {
        const freshPayment =
          await tx.get(paymentRef);

        if (!freshPayment.exists) {
          return;
        }

        const freshData =
          freshPayment.data();

        if (freshData?.status === "paid") {
          return;
        }

        tx.update(paymentRef, {
          status: "paid",
          paystackStatus: data.status ?? "success",
          paystackReference: reference,
          paidAt: now,
          updatedAt: now,

          customerCode:
            typeof data.customer === "object" &&
            data.customer !== null
              ? (
                  data.customer as {
                    customer_code?: string;
                  }
                ).customer_code ?? null
              : null,
        });

        tx.update(bizRef, {
          plan: "pro",
          planUpdatedAt: now,
          planSource: `paystack:${reference}`,
        });
      });

      console.log(
        `Pro plan activated for business ${businessId}`
      );

      return Response.json({
        received: true,
        activated: true,
      });
    }

    // ---------------------------------------------------------
    // 6. Subscription created
    // ---------------------------------------------------------

    if (eventName === "subscription.create") {
      const subscriptionCode =
        typeof data.subscription_code === "string"
          ? data.subscription_code
          : null;

      const customer =
        typeof data.customer === "object" &&
        data.customer !== null
          ? (data.customer as {
              customer_code?: string;
              email?: string;
            })
          : null;

      const customerCode =
        customer?.customer_code ?? null;

      const customerEmail =
        customer?.email ?? null;

      const plan =
        typeof data.plan === "object" &&
        data.plan !== null
          ? (data.plan as {
              plan_code?: string;
            })
          : null;

      if (
        plan?.plan_code &&
        plan.plan_code !== PAYSTACK_PRO_PLAN_CODE
      ) {
        console.warn(
          "Ignoring subscription for a different Paystack plan."
        );

        return Response.json({
          received: true,
          ignored: true,
        });
      }

      if (!subscriptionCode) {
        console.warn(
          "subscription.create has no subscription code."
        );

        return Response.json({
          received: true,
        });
      }

      // -------------------------------------------------------
      // Find the most recent pending/initialized/paid
      // Pro transaction belonging to this customer email.
      // -------------------------------------------------------

      if (!customerEmail) {
        console.warn(
          "subscription.create has no customer email."
        );

        return Response.json({
          received: true,
        });
      }

      const paymentsSnap = await db
        .collection("paymentTransactions")
        .where("email", "==", customerEmail)
        .where("plan", "==", "pro")
        .limit(20)
        .get();

      if (paymentsSnap.empty) {
        console.warn(
          `No payment transaction found for ${customerEmail}`
        );

        return Response.json({
          received: true,
          subscriptionStored: false,
        });
      }

      let paymentDoc =
        paymentsSnap.docs[0];

      for (const doc of paymentsSnap.docs) {
        const current =
          doc.data();

        const selected =
          paymentDoc.data();

        if (
          typeof current.createdAt === "number" &&
          typeof selected.createdAt === "number" &&
          current.createdAt > selected.createdAt
        ) {
          paymentDoc = doc;
        }
      }

      const payment = paymentDoc.data();

      const businessId =
        payment.businessId as string | undefined;

      if (!businessId) {
        console.warn(
          "Payment has no businessId."
        );

        return Response.json({
          received: true,
        });
      }

      const now = Date.now();

      await db
        .doc(`subscriptions/${businessId}`)
        .set(
          {
            businessId,
            userId: payment.userId,
            plan: "pro",
            paystackPlanCode:
              PAYSTACK_PRO_PLAN_CODE,
            subscriptionCode,
            customerCode,
            customerEmail,
            status:
              typeof data.status === "string"
                ? data.status
                : "active",
            nextPaymentDate:
              data.next_payment_date ?? null,
            createdAt:
              data.createdAt ??
              data.created_at ??
              null,
            updatedAt: now,
          },
          { merge: true }
        );

      return Response.json({
        received: true,
        subscriptionStored: true,
      });
    }

    // ---------------------------------------------------------
    // 7. Subscription will not renew
    // ---------------------------------------------------------

    if (eventName === "subscription.not_renew") {
      const subscriptionCode =
        typeof data.subscription_code === "string"
          ? data.subscription_code
          : null;

      if (!subscriptionCode) {
        return Response.json({
          received: true,
        });
      }

      const subscriptionsSnap = await db
        .collection("subscriptions")
        .where(
          "subscriptionCode",
          "==",
          subscriptionCode
        )
        .limit(1)
        .get();

      if (!subscriptionsSnap.empty) {
        await subscriptionsSnap.docs[0].ref.update({
          status: "non-renewing",
          nextPaymentDate:
            data.next_payment_date ?? null,
          updatedAt: Date.now(),
        });
      }

      // IMPORTANT:
      // We do NOT remove Pro immediately.
      //
      // The customer has already paid for their current
      // billing period. Paystack says the subscription becomes
      // disabled on the next payment date.
      return Response.json({
        received: true,
      });
    }

    // ---------------------------------------------------------
    // 8. Subscription disabled
    // ---------------------------------------------------------

    if (eventName === "subscription.disable") {
      const subscriptionCode =
        typeof data.subscription_code === "string"
          ? data.subscription_code
          : null;

      if (!subscriptionCode) {
        return Response.json({
          received: true,
        });
      }

      const subscriptionsSnap = await db
        .collection("subscriptions")
        .where(
          "subscriptionCode",
          "==",
          subscriptionCode
        )
        .limit(1)
        .get();

      if (!subscriptionsSnap.empty) {
        const subscriptionDoc =
          subscriptionsSnap.docs[0];

        const subscription =
          subscriptionDoc.data();

        const businessId =
          subscription.businessId as string;

        const now = Date.now();

        await db.runTransaction(
          async (tx) => {
            tx.update(subscriptionDoc.ref, {
              status:
                data.status ?? "cancelled",
              disabledAt: now,
              updatedAt: now,
            });

            tx.update(
              db.doc(
                `businesses/${businessId}`
              ),
              {
                plan: "free",
                planUpdatedAt: now,
                planSource:
                  `paystack:subscription-disabled`,
              }
            );
          }
        );
      }

      return Response.json({
        received: true,
      });
    }

    // ---------------------------------------------------------
    // 9. Failed recurring payment
    // ---------------------------------------------------------

    if (
      eventName ===
      "invoice.payment_failed"
    ) {
      const subscription =
        typeof data.subscription === "object" &&
        data.subscription !== null
          ? (data.subscription as {
              subscription_code?: string;
              status?: string;
              next_payment_date?: string;
            })
          : null;

      const subscriptionCode =
        subscription?.subscription_code ??
        null;

      if (subscriptionCode) {
        const subscriptionsSnap =
          await db
            .collection("subscriptions")
            .where(
              "subscriptionCode",
              "==",
              subscriptionCode
            )
            .limit(1)
            .get();

        if (!subscriptionsSnap.empty) {
          await subscriptionsSnap.docs[0].ref.update({
            status: "attention",
            lastPaymentFailedAt:
              Date.now(),
            updatedAt: Date.now(),
          });
        }
      }

      // Do NOT immediately downgrade here.
      //
      // The subscription can still have an active period,
      // and the subscription status needs to determine when
      // access should actually end.
      return Response.json({
        received: true,
      });
    }

    // ---------------------------------------------------------
    // 10. Other Paystack events
    // ---------------------------------------------------------

    return Response.json({
      received: true,
      event: eventName,
    });
  } catch (error) {
    console.error(
      "Paystack webhook error:",
      error
    );

    return Response.json(
      {
        error: "Webhook processing failed.",
      },
      { status: 500 }
    );
  }
}