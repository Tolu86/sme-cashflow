import "server-only";

import { getAdminDb } from "@/lib/firebase/admin";
import { errorResponse, verifyRequest } from "@/lib/ai/route-auth";

const TRIAL_DURATION_MS = 14 * 24 * 60 * 60 * 1000;
const NEW_BUSINESS_WINDOW_MS = 30 * 60 * 1000;

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      businessId?: string;
    };

    if (!body.businessId || typeof body.businessId !== "string") {
      return Response.json(
        { error: "Business ID is required." },
        { status: 400 }
      );
    }

    // Verifies the Firebase ID token and confirms the caller owns this business.
    await verifyRequest(req, body.businessId);

    const db = getAdminDb();
    const businessRef = db.doc(`businesses/${body.businessId}`);
    const now = Date.now();

    const result = await db.runTransaction(async (tx) => {
      const snap = await tx.get(businessRef);

      if (!snap.exists) {
        return { error: "Business not found.", status: 404 as const };
      }

      const business = snap.data() ?? {};

      // A trial is one-time. Never restart it if it was already granted.
      if (
        business.trialUsed === true ||
        typeof business.trialStartedAt === "number"
      ) {
        const endsAt =
          typeof business.trialEndsAt === "number"
            ? business.trialEndsAt
            : 0;
        const active = endsAt > now;

        return {
          ok: true as const,
          alreadyStarted: true,
          trialStatus: active ? "active" : "expired",
          trialStartedAt: business.trialStartedAt ?? null,
          trialEndsAt: endsAt || null,
        };
      }

      // Only allow activation shortly after business creation.
      // This prevents old businesses from requesting a new trial later.
      const createdAt = business.createdAt;
      if (
        typeof createdAt !== "number" ||
        now - createdAt < 0 ||
        now - createdAt > NEW_BUSINESS_WINDOW_MS
      ) {
        return {
          error: "This business is not eligible for a new trial.",
          status: 403 as const,
        };
      }

      const endsAt = now + TRIAL_DURATION_MS;

      tx.update(businessRef, {
        trialStartedAt: now,
        trialEndsAt: endsAt,
        trialUsed: true,
        trialStatus: "active",
      });

      return {
        ok: true as const,
        alreadyStarted: false,
        trialStatus: "active",
        trialStartedAt: now,
        trialEndsAt: endsAt,
      };
    });

    if ("error" in result) {
      return Response.json(
        { error: result.error },
        { status: result.status }
      );
    }

    return Response.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}
