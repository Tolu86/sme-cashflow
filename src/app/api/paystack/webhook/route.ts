import "server-only";

import crypto from "node:crypto";
import { getAdminDb } from "@/lib/firebase/admin";

export const maxDuration = 30;

const PAYSTACK_SECRET =
  process.env.PAYSTACK_SECRET_KEY;

const PAYSTACK_PRO_PLAN_CODE =
  "PLN_u3cfv54cgum96k3";

const PRO_AMOUNT = 300_000;

/*
 * ---------------------------------------------------------
 * Paystack signature verification
 * ---------------------------------------------------------
 */

function verifyPaystackSignature(
  rawBody: string,
  signature: string
): boolean {
  if (!PAYSTACK_SECRET || !signature) {
    return false;
  }

  const hash = crypto
    .createHmac(
      "sha512",
      PAYSTACK_SECRET
    )
    .update(rawBody)
    .digest("hex");

  const expected = Buffer.from(
    hash,
    "utf8"
  );

  const received = Buffer.from(
    signature,
    "utf8"
  );

  if (
    expected.length !==
    received.length
  ) {
    return false;
  }

  return crypto.timingSafeEqual(
    expected,
    received
  );
}

/*
 * ---------------------------------------------------------
 * Helper functions
 * ---------------------------------------------------------
 */

type WebhookData =
  Record<string, any>;

function getPlanCode(
  data: WebhookData
): string | undefined {
  if (
    typeof data.plan === "object" &&
    data.plan !== null
  ) {
    return (
      data.plan as {
        plan_code?: string;
      }
    ).plan_code;
  }

  return undefined;
}

function getSubscriptionCode(
  data: WebhookData
): string | null {
  if (
    typeof data.subscription ===
      "object" &&
    data.subscription !== null &&
    typeof data.subscription
      .subscription_code === "string"
  ) {
    return data.subscription
      .subscription_code;
  }

  if (
    typeof data.subscription_code ===
    "string"
  ) {
    return data.subscription_code;
  }

  return null;
}

function getCustomerCode(
  data: WebhookData
): string | null {
  if (
    typeof data.customer === "object" &&
    data.customer !== null &&
    typeof data.customer
      .customer_code === "string"
  ) {
    return data.customer.customer_code;
  }

  return null;
}

function getCustomerEmail(
  data: WebhookData
): string | null {
  if (
    typeof data.customer === "object" &&
    data.customer !== null &&
    typeof data.customer.email ===
      "string"
  ) {
    return data.customer.email;
  }

  return null;
}

function getSubscriptionStatus(
  data: WebhookData
): string | null {
  if (
    typeof data.subscription ===
      "object" &&
    data.subscription !== null &&
    typeof data.subscription.status ===
      "string"
  ) {
    return data.subscription.status;
  }

  if (
    typeof data.status === "string"
  ) {
    return data.status;
  }

  return null;
}

function getNextPaymentDate(
  data: WebhookData
): string | null {
  if (
    typeof data.subscription ===
      "object" &&
    data.subscription !== null &&
    typeof data.subscription
      .next_payment_date === "string"
  ) {
    return data.subscription
      .next_payment_date;
  }

  if (
    typeof data.next_payment_date ===
    "string"
  ) {
    return data.next_payment_date;
  }

  return null;
}

function getEmailToken(
  data: WebhookData
): string | null {
  if (
    typeof data.subscription ===
      "object" &&
    data.subscription !== null &&
    typeof data.subscription
      .email_token === "string"
  ) {
    return data.subscription
      .email_token;
  }

  if (
    typeof data.email_token ===
    "string"
  ) {
    return data.email_token;
  }

  return null;
}

function getTransactionReference(
  data: WebhookData
): string | null {
  if (
    typeof data.reference ===
    "string"
  ) {
    return data.reference;
  }

  if (
    typeof data.transaction ===
      "object" &&
    data.transaction !== null &&
    typeof data.transaction
      .reference === "string"
  ) {
    return data.transaction.reference;
  }

  return null;
}

function getAmount(
  data: WebhookData
): number | null {
  if (
    typeof data.amount === "number"
  ) {
    return data.amount;
  }

  if (
    typeof data.amount === "string" &&
    !Number.isNaN(Number(data.amount))
  ) {
    return Number(data.amount);
  }

  if (
    typeof data.transaction ===
      "object" &&
    data.transaction !== null
  ) {
    const amount =
      data.transaction.amount;

    if (
      typeof amount === "number"
    ) {
      return amount;
    }

    if (
      typeof amount === "string" &&
      !Number.isNaN(Number(amount))
    ) {
      return Number(amount);
    }
  }

  return null;
}

function getCurrency(
  data: WebhookData
): string | null {
  if (
    typeof data.currency ===
    "string"
  ) {
    return data.currency;
  }

  if (
    typeof data.transaction ===
      "object" &&
    data.transaction !== null &&
    typeof data.transaction
      .currency === "string"
  ) {
    return data.transaction
      .currency;
  }

  return null;
}

/*
 * ---------------------------------------------------------
 * Main webhook
 * ---------------------------------------------------------
 */

export async function POST(
  req: Request
) {
  try {
    /*
     * -------------------------------------------------------
     * 1. Check Paystack configuration
     * -------------------------------------------------------
     */

    if (!PAYSTACK_SECRET) {
      console.error(
        "PAYSTACK_SECRET_KEY is not configured."
      );

      return Response.json(
        {
          error:
            "Webhook is not configured.",
        },
        { status: 503 }
      );
    }

    /*
     * -------------------------------------------------------
     * 2. Read the RAW request body
     * -------------------------------------------------------
     *
     * This is important because the signature is calculated
     * from the exact raw payload Paystack sends.
     */

    const rawBody =
      await req.text();

    /*
     * -------------------------------------------------------
     * 3. Verify Paystack signature
     * -------------------------------------------------------
     */

    const signature =
      req.headers.get(
        "x-paystack-signature"
      );

    if (!signature) {
      console.warn(
        "Paystack webhook rejected: missing signature."
      );

      return Response.json(
        {
          error:
            "Missing signature.",
        },
        { status: 401 }
      );
    }

    if (
      !verifyPaystackSignature(
        rawBody,
        signature
      )
    ) {
      console.warn(
        "Paystack webhook rejected: invalid signature."
      );

      return Response.json(
        {
          error:
            "Invalid signature.",
        },
        { status: 401 }
      );
    }

    /*
     * -------------------------------------------------------
     * 4. Parse webhook
     * -------------------------------------------------------
     */

    let event: {
      event?: string;
      data?: WebhookData;
    };

    try {
      event = JSON.parse(
        rawBody
      ) as {
        event?: string;
        data?: WebhookData;
      };
    } catch {
      return Response.json(
        {
          error:
            "Invalid webhook JSON.",
        },
        { status: 400 }
      );
    }

    const eventName =
      event.event;

    const data =
      event.data;

    if (
      !eventName ||
      !data
    ) {
      return Response.json(
        {
          error:
            "Invalid webhook payload.",
        },
        { status: 400 }
      );
    }

    console.log(
      `Paystack webhook received: ${eventName}`
    );

    const db =
      getAdminDb();

    const now =
      Date.now();

    /*
     * =======================================================
     * 5. CHARGE.SUCCESS
     * =======================================================
     *
     * This handles:
     *
     * A. Initial Pro subscription payment
     *
     * B. Future recurring Pro payments
     *
     * Paystack sends charge.success for successful
     * subscription payments.
     */

    if (
      eventName ===
      "charge.success"
    ) {
      const reference =
        getTransactionReference(
          data
        );

      const subscriptionCode =
        getSubscriptionCode(
          data
        );

      const planCode =
        getPlanCode(
          data
        );

      /*
       * -----------------------------------------------------
       * Verify plan if Paystack supplied it
       * -----------------------------------------------------
       */

      if (
        planCode &&
        planCode !==
          PAYSTACK_PRO_PLAN_CODE
      ) {
        console.warn(
          `Ignoring charge for different Paystack plan: ${planCode}`
        );

        return Response.json({
          received: true,
          ignored: true,
        });
      }

      /*
       * -----------------------------------------------------
       * Verify amount
       * -----------------------------------------------------
       */

      const amount =
        getAmount(data);

      if (
        amount !== null &&
        amount !== PRO_AMOUNT
      ) {
        console.warn(
          `Unexpected Paystack amount: ${amount}`
        );

        return Response.json(
          {
            error:
              "Payment amount mismatch.",
          },
          { status: 400 }
        );
      }

      /*
       * -----------------------------------------------------
       * Verify currency
       * -----------------------------------------------------
       */

      const currency =
        getCurrency(data);

      if (
        currency &&
        currency !== "NGN"
      ) {
        return Response.json(
          {
            error:
              "Payment currency mismatch.",
          },
          { status: 400 }
        );
      }

      /*
       * -----------------------------------------------------
       * INITIAL PAYMENT
       * -----------------------------------------------------
       *
       * Our initialize route creates:
       *
       * paymentTransactions/{reference}
       *
       * before sending the customer to Paystack.
       */

      if (reference) {
        const paymentRef =
          db.doc(
            `paymentTransactions/${reference}`
          );

        const paymentSnap =
          await paymentRef.get();

        if (
          paymentSnap.exists
        ) {
          const payment =
            paymentSnap.data();

          /*
           * Security checks
           */

          if (
            payment?.provider !==
              "paystack" ||
            payment?.plan !==
              "pro"
          ) {
            console.warn(
              `Invalid payment record for ${reference}`
            );

            return Response.json(
              {
                error:
                  "Invalid payment record.",
              },
              { status: 400 }
            );
          }

          if (
            payment.amount !==
            PRO_AMOUNT
          ) {
            console.warn(
              `Stored payment amount mismatch for ${reference}`
            );

            return Response.json(
              {
                error:
                  "Stored payment amount mismatch.",
              },
              { status: 400 }
            );
          }

          /*
           * Verify metadata when supplied.
           */

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
            metadata.business_id !==
              payment.businessId
          ) {
            return Response.json(
              {
                error:
                  "Business mismatch.",
              },
              { status: 400 }
            );
          }

          if (
            metadata?.user_id &&
            metadata.user_id !==
              payment.userId
          ) {
            return Response.json(
              {
                error:
                  "User mismatch.",
              },
              { status: 400 }
            );
          }

          if (
            metadata?.plan &&
            metadata.plan !==
              "pro"
          ) {
            return Response.json(
              {
                error:
                  "Plan mismatch.",
              },
              { status: 400 }
            );
          }

          const businessId =
            payment.businessId as
              | string
              | undefined;

          const userId =
            payment.userId as
              | string
              | undefined;

          if (
            !businessId ||
            !userId
          ) {
            return Response.json(
              {
                error:
                  "Payment is missing business or user information.",
              },
              { status: 400 }
            );
          }

          const bizRef =
            db.doc(
              `businesses/${businessId}`
            );

          const customerCode =
            getCustomerCode(
              data
            );

          const customerEmail =
            getCustomerEmail(
              data
            );

          const subscriptionStatus =
            getSubscriptionStatus(
              data
            );

          const nextPaymentDate =
            getNextPaymentDate(
              data
            );

          const emailToken =
            getEmailToken(
              data
            );

          /*
           * ---------------------------------------------------
           * Fulfill initial payment
           * ---------------------------------------------------
           */

          await db.runTransaction(
            async (tx) => {
              const freshPayment =
                await tx.get(
                  paymentRef
                );

              if (
                !freshPayment.exists
              ) {
                return;
              }

              const freshData =
                freshPayment.data();

              /*
               * Idempotency:
               * Paystack may deliver the same event again.
               */
              if (
                freshData?.status ===
                "paid"
              ) {
                return;
              }

              /*
               * Mark payment as paid.
               */

              tx.update(
                paymentRef,
                {
                  status: "paid",

                  paystackStatus:
                    data.status ??
                    "success",

                  paystackReference:
                    reference,

                  customerCode,

                  customerEmail,

                  subscriptionCode,

                  subscriptionStatus,

                  nextPaymentDate,

                  emailToken,

                  paidAt: now,

                  verifiedAt: now,

                  updatedAt: now,
                }
              );

              /*
               * Activate Pro.
               */

              tx.update(
                bizRef,
                {
                  plan: "pro",

                  planUpdatedAt:
                    now,

                  planSource:
                    `paystack:${reference}`,
                }
              );

              /*
               * If Paystack already gave us
               * the subscription code, save it
               * immediately.
               */

              if (
                subscriptionCode
              ) {
                const subscriptionRef =
                  db.doc(
                    `subscriptions/${businessId}`
                  );

                tx.set(
                  subscriptionRef,
                  {
                    businessId,

                    userId,

                    plan: "pro",

                    paystackPlanCode:
                      PAYSTACK_PRO_PLAN_CODE,

                    subscriptionCode,

                    customerCode,

                    customerEmail,

                    status:
                      subscriptionStatus ??
                      "active",

                    nextPaymentDate,

                    emailToken,

                    createdAt:
                      now,

                    updatedAt:
                      now,
                  },
                  {
                    merge: true,
                  }
                );
              }
            }
          );

          console.log(
            `Pro plan activated for business ${businessId}`
          );

          return Response.json({
            received: true,

            activated: true,

            initialPayment: true,

            subscriptionStored:
              Boolean(
                subscriptionCode
              ),
          });
        }
      }

      /*
       * =====================================================
       * RECURRING PAYMENT
       * =====================================================
       *
       * A future recurring transaction normally has a new
       * transaction reference, so there will not be an
       * existing paymentTransactions document for it.
       *
       * We identify the subscription using its subscription
       * code.
       */

      if (
        !subscriptionCode
      ) {
        console.warn(
          "Successful charge has no subscription code and no matching payment record."
        );

        return Response.json({
          received: true,
          ignored: true,
        });
      }

      /*
       * Find subscription.
       */

      const subscriptionsSnap =
        await db
          .collection(
            "subscriptions"
          )
          .where(
            "subscriptionCode",
            "==",
            subscriptionCode
          )
          .limit(1)
          .get();

      if (
        subscriptionsSnap.empty
      ) {
        console.warn(
          `Subscription not found for recurring charge: ${subscriptionCode}`
        );

        return Response.json({
          received: true,

          subscriptionFound:
            false,
        });
      }

      const subscriptionDoc =
        subscriptionsSnap
          .docs[0];

      const subscription =
        subscriptionDoc.data();

      const businessId =
        subscription.businessId as
          | string
          | undefined;

      const userId =
        subscription.userId as
          | string
          | undefined;

      if (
        !businessId
      ) {
        return Response.json({
          received: true,
          ignored: true,
        });
      }

      /*
       * Prepare renewal data.
       */

      const nextPaymentDate =
        getNextPaymentDate(
          data
        );

      const customerCode =
        getCustomerCode(
          data
        );

      const customerEmail =
        getCustomerEmail(
          data
        );

      /*
       * Paystack transaction reference
       * becomes our renewal reference.
       */

      const renewalReference =
        reference ??
        `renewal-${subscriptionCode}-${now}`;

      const renewalRef =
        db.doc(
          `paymentTransactions/${renewalReference}`
        );

      /*
       * Save recurring payment and
       * keep business Pro.
       */

      await db.runTransaction(
        async (tx) => {
          const existingRenewal =
            await tx.get(
              renewalRef
            );

          /*
           * Idempotency:
           * don't create the same renewal twice.
           */

          if (
            !existingRenewal.exists
          ) {
            tx.set(
              renewalRef,
              {
                reference:
                  renewalReference,

                userId:
                  userId ?? null,

                businessId,

                email:
                  customerEmail ??
                  subscription.customerEmail ??
                  null,

                plan: "pro",

                amount:
                  PRO_AMOUNT,

                currency:
                  "NGN",

                status:
                  "paid",

                provider:
                  "paystack",

                type:
                  "subscription_renewal",

                subscriptionCode,

                customerCode:
                  customerCode ??
                  subscription.customerCode ??
                  null,

                customerEmail:
                  customerEmail ??
                  subscription.customerEmail ??
                  null,

                paystackStatus:
                  data.status ??
                  "success",

                paystackReference:
                  renewalReference,

                paidAt: now,

                createdAt:
                  now,

                updatedAt:
                  now,
              }
            );
          }

          /*
           * Update subscription.
           */

          tx.update(
            subscriptionDoc.ref,
            {
              status: "active",

              lastPaymentAt:
                now,

              lastPaymentReference:
                renewalReference,

              nextPaymentDate:
                nextPaymentDate ??
                subscription.nextPaymentDate ??
                null,

              customerCode:
                customerCode ??
                subscription.customerCode ??
                null,

              customerEmail:
                customerEmail ??
                subscription.customerEmail ??
                null,

              updatedAt:
                now,
            }
          );

          /*
           * Keep Pro active.
           */

          tx.update(
            db.doc(
              `businesses/${businessId}`
            ),
            {
              plan: "pro",

              planUpdatedAt:
                now,

              planSource:
                `paystack:renewal:${renewalReference}`,
            }
          );
        }
      );

      console.log(
        `Recurring Pro payment recorded for business ${businessId}`
      );

      return Response.json({
        received: true,
        renewed: true,
      });
    }

    /*
     * =======================================================
     * 6. SUBSCRIPTION.CREATE
     * =======================================================
     *
     * Paystack sends subscription.create when the customer
     * has been subscribed successfully.
     *
     * We use the payment transaction's Paystack/customer
     * information to associate the subscription.
     */

    if (
      eventName ===
      "subscription.create"
    ) {
      const subscriptionCode =
        getSubscriptionCode(
          data
        );

      if (
        !subscriptionCode
      ) {
        console.warn(
          "subscription.create has no subscription code."
        );

        return Response.json({
          received: true,
        });
      }

      const planCode =
        getPlanCode(
          data
        );

      if (
        planCode &&
        planCode !==
          PAYSTACK_PRO_PLAN_CODE
      ) {
        return Response.json({
          received: true,
          ignored: true,
        });
      }

      const customer =
        typeof data.customer ===
          "object" &&
        data.customer !== null
          ? data.customer
          : null;

      const customerEmail =
        typeof customer?.email ===
        "string"
          ? customer.email
          : null;

      const customerCode =
        typeof customer?.customer_code ===
        "string"
          ? customer.customer_code
          : null;

      if (
        !customerEmail
      ) {
        console.warn(
          "subscription.create has no customer email."
        );

        return Response.json({
          received: true,
        });
      }

      /*
       * Find the most recent initialized/paid Pro
       * transaction belonging to this customer.
       *
       * This is still only a fallback association.
       * The initial charge.success handler normally
       * stores the subscription first.
       */

      const paymentsSnap =
        await db
          .collection(
            "paymentTransactions"
          )
          .where(
            "email",
            "==",
            customerEmail
          )
          .where(
            "plan",
            "==",
            "pro"
          )
          .limit(20)
          .get();

      if (
        paymentsSnap.empty
      ) {
        console.warn(
          `No Pro payment transaction found for ${customerEmail}`
        );

        return Response.json({
          received: true,

          subscriptionStored:
            false,
        });
      }

      /*
       * Select the newest payment.
       */

      let paymentDoc =
        paymentsSnap.docs[0];

      for (
        const candidate of
        paymentsSnap.docs
      ) {
        const current =
          candidate.data();

        const selected =
          paymentDoc.data();

        if (
          typeof current.createdAt ===
            "number" &&
          typeof selected.createdAt ===
            "number" &&
          current.createdAt >
            selected.createdAt
        ) {
          paymentDoc =
            candidate;
        }
      }

      const payment =
        paymentDoc.data();

      const businessId =
        payment.businessId as
          | string
          | undefined;

      const userId =
        payment.userId as
          | string
          | undefined;

      if (
        !businessId ||
        !userId
      ) {
        return Response.json({
          received: true,

          subscriptionStored:
            false,
        });
      }

      const nextPaymentDate =
        getNextPaymentDate(
          data
        );

      const emailToken =
        getEmailToken(
          data
        );

      const subscriptionStatus =
        getSubscriptionStatus(
          data
        ) ?? "active";

      /*
       * Save subscription.
       */

      await db
        .doc(
          `subscriptions/${businessId}`
        )
        .set(
          {
            businessId,

            userId,

            plan: "pro",

            paystackPlanCode:
              PAYSTACK_PRO_PLAN_CODE,

            subscriptionCode,

            customerCode,

            customerEmail,

            status:
              subscriptionStatus,

            nextPaymentDate,

            emailToken,

            createdAt:
              data.createdAt ??
              data.created_at ??
              now,

            updatedAt:
              now,
          },
          {
            merge: true,
          }
        );

      console.log(
        `Paystack subscription stored for business ${businessId}`
      );

      return Response.json({
        received: true,

        subscriptionStored:
          true,
      });
    }

    /*
     * =======================================================
     * 7. SUBSCRIPTION.NOT_RENEW
     * =======================================================
     *
     * Do NOT remove Pro immediately.
     *
     * Paystack describes non-renewing subscriptions as
     * still active until the next payment date.
     */

    if (
      eventName ===
      "subscription.not_renew"
    ) {
      const subscriptionCode =
        getSubscriptionCode(
          data
        );

      if (
        !subscriptionCode
      ) {
        return Response.json({
          received: true,
        });
      }

      const subscriptionsSnap =
        await db
          .collection(
            "subscriptions"
          )
          .where(
            "subscriptionCode",
            "==",
            subscriptionCode
          )
          .limit(1)
          .get();

      if (
        !subscriptionsSnap.empty
      ) {
        const subscriptionDoc =
          subscriptionsSnap
            .docs[0];

        await subscriptionDoc.ref
          .update({
            status:
              "non-renewing",

            nextPaymentDate:
              getNextPaymentDate(
                data
              ),

            updatedAt:
              now,
          });
      }

      return Response.json({
        received: true,

        nonRenewing:
          true,
      });
    }

    /*
     * =======================================================
     * 8. SUBSCRIPTION.DISABLE
     * =======================================================
     *
     * This is where Pro is finally removed.
     */

    if (
      eventName ===
      "subscription.disable"
    ) {
      const subscriptionCode =
        getSubscriptionCode(
          data
        );

      if (
        !subscriptionCode
      ) {
        return Response.json({
          received: true,
        });
      }

      const subscriptionsSnap =
        await db
          .collection(
            "subscriptions"
          )
          .where(
            "subscriptionCode",
            "==",
            subscriptionCode
          )
          .limit(1)
          .get();

      if (
        subscriptionsSnap.empty
      ) {
        console.warn(
          `Disabled subscription not found: ${subscriptionCode}`
        );

        return Response.json({
          received: true,

          subscriptionFound:
            false,
        });
      }

      const subscriptionDoc =
        subscriptionsSnap
          .docs[0];

      const subscription =
        subscriptionDoc.data();

      const businessId =
        subscription.businessId as
          | string
          | undefined;

      if (
        !businessId
      ) {
        return Response.json({
          received: true,
        });
      }

      const status =
        typeof data.status ===
        "string"
          ? data.status
          : "cancelled";

      await db.runTransaction(
        async (tx) => {
          /*
           * Update subscription status.
           */

          tx.update(
            subscriptionDoc.ref,
            {
              status,

              disabledAt:
                now,

              updatedAt:
                now,
            }
          );

          /*
           * Remove Pro access.
           */

          tx.update(
            db.doc(
              `businesses/${businessId}`
            ),
            {
              plan: "free",

              planUpdatedAt:
                now,

              planSource:
                `paystack:subscription-${status}`,
            }
          );
        }
      );

      console.log(
        `Pro plan removed for business ${businessId}: subscription ${status}`
      );

      return Response.json({
        received: true,

        downgraded: true,
      });
    }

    /*
     * =======================================================
     * 9. INVOICE.PAYMENT_FAILED
     * =======================================================
     *
     * Mark the subscription as attention.
     *
     * Do NOT immediately downgrade the business.
     */

    if (
      eventName ===
      "invoice.payment_failed"
    ) {
      const subscriptionCode =
        getSubscriptionCode(
          data
        );

      if (
        !subscriptionCode
      ) {
        return Response.json({
          received: true,
        });
      }

      const subscriptionsSnap =
        await db
          .collection(
            "subscriptions"
          )
          .where(
            "subscriptionCode",
            "==",
            subscriptionCode
          )
          .limit(1)
          .get();

      if (
        !subscriptionsSnap.empty
      ) {
        const subscriptionDoc =
          subscriptionsSnap
            .docs[0];

        const subscription =
          subscriptionDoc.data();

        await subscriptionDoc.ref
          .update({
            status:
              "attention",

            lastPaymentFailedAt:
              now,

            lastPaymentFailure:
              typeof data.description ===
              "string"
                ? data.description
                : null,

            nextPaymentDate:
              getNextPaymentDate(
                data
              ) ??
              subscription.nextPaymentDate ??
              null,

            updatedAt:
              now,
          });

        console.warn(
          `Recurring payment failed for subscription ${subscriptionCode}`
        );
      }

      return Response.json({
        received: true,

        paymentFailed:
          true,
      });
    }

    /*
     * =======================================================
     * 10. INVOICE.UPDATE
     * =======================================================
     */

    if (
      eventName ===
      "invoice.update"
    ) {
      const subscriptionCode =
        getSubscriptionCode(
          data
        );

      if (
        subscriptionCode
      ) {
        const subscriptionsSnap =
          await db
            .collection(
              "subscriptions"
            )
            .where(
              "subscriptionCode",
              "==",
              subscriptionCode
            )
            .limit(1)
            .get();

        if (
          !subscriptionsSnap.empty
        ) {
          const subscriptionDoc =
            subscriptionsSnap
              .docs[0];

          await subscriptionDoc.ref
            .update({
              lastInvoiceStatus:
                typeof data.status ===
                "string"
                  ? data.status
                  : null,

              lastInvoiceCode:
                typeof data.invoice_code ===
                "string"
                  ? data.invoice_code
                  : null,

              updatedAt:
                now,
            });
        }
      }

      return Response.json({
        received: true,
      });
    }

    /*
     * =======================================================
     * 11. UNHANDLED PAYSTACK EVENTS
     * =======================================================
     *
     * Return 200 so Paystack knows the webhook was received.
     */

    return Response.json({
      received: true,

      event:
        eventName,
    });
  } catch (error) {
    console.error(
      "Paystack webhook error:",
      error
    );

    return Response.json(
      {
        error:
          "Webhook processing failed.",
      },
      { status: 500 }
    );
  }
}