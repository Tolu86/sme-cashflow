import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, verifyIdToken } from "@/lib/firebase/admin";

export const runtime = "nodejs";

type AcceptInviteRequest = {
  businessId?: string;
  invitationId?: string;
  token?: string;
};

export async function POST(req: NextRequest) {
  try {
    // 1. The invitee must be signed in.
    const authorization =
      req.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json(
        {
          error:
            "Please sign in before accepting this invitation.",
        },
        { status: 401 }
      );
    }

    let user;

    try {
      user = await verifyIdToken(
        authorization.slice("Bearer ".length)
      );
    } catch {
      return NextResponse.json(
        {
          error:
            "Your session has expired. Please sign in again.",
        },
        { status: 401 }
      );
    }

    // 2. Read the invitation information.
    let body: AcceptInviteRequest;

    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        {
          error: "Invalid request body.",
        },
        { status: 400 }
      );
    }

    const businessId =
      typeof body.businessId === "string"
        ? body.businessId.trim()
        : "";

    const invitationId =
      typeof body.invitationId === "string"
        ? body.invitationId.trim()
        : "";

    const token =
      typeof body.token === "string"
        ? body.token.trim()
        : "";

    if (
      !businessId ||
      !invitationId ||
      !token ||
      businessId.includes("/") ||
      invitationId.includes("/")
    ) {
      return NextResponse.json(
        {
          error: "Invalid invitation information.",
        },
        { status: 400 }
      );
    }

    if (!user.email) {
      return NextResponse.json(
        {
          error:
            "Your account does not have an email address.",
        },
        { status: 400 }
      );
    }

    const db = getAdminDb();

    const businessRef = db
      .collection("businesses")
      .doc(businessId);

    const invitationRef = businessRef
      .collection("invitations")
      .doc(invitationId);

    // 3. Load the invitation.
    const invitationSnap =
      await invitationRef.get();

    if (!invitationSnap.exists) {
      return NextResponse.json(
        {
          error: "Invitation not found.",
        },
        { status: 404 }
      );
    }

    const invitation =
      invitationSnap.data();

    if (!invitation) {
      return NextResponse.json(
        {
          error: "Invitation data is missing.",
        },
        { status: 404 }
      );
    }

    // 4. Check that the invitation is still pending.
    if (invitation.status !== "pending") {
      return NextResponse.json(
        {
          error:
            "This invitation is no longer active.",
        },
        { status: 410 }
      );
    }

    // 5. Check the invitation expiry.
    const expiresAt =
      typeof invitation.expiresAt === "number"
        ? invitation.expiresAt
        : invitation.expiresAt?.toMillis?.();

    if (
      typeof expiresAt !== "number" ||
      expiresAt <= Date.now()
    ) {
      return NextResponse.json(
        {
          error:
            "This invitation has expired.",
        },
        { status: 410 }
      );
    }

    // 6. Verify that the invitation email belongs
    // to the currently signed-in Firebase account.
    const invitedEmail =
      typeof invitation.email === "string"
        ? invitation.email.trim().toLowerCase()
        : "";

    const userEmail =
      user.email.trim().toLowerCase();

    if (!invitedEmail || invitedEmail !== userEmail) {
      return NextResponse.json(
        {
          error:
            "This invitation was sent to a different email address.",
        },
        { status: 403 }
      );
    }

    // 7. Verify the invitation token.
    //
    // The token itself is never stored in Firestore.
    // Only its SHA-256 hash is stored.
    const { createHash, timingSafeEqual } =
      await import("node:crypto");

    const suppliedHash = createHash("sha256")
      .update(token)
      .digest();

    const storedHash =
      typeof invitation.tokenHash === "string" &&
      /^[a-f0-9]{64}$/i.test(
        invitation.tokenHash
      )
        ? Buffer.from(
            invitation.tokenHash,
            "hex"
          )
        : null;

    if (
      !storedHash ||
      storedHash.length !== suppliedHash.length ||
      !timingSafeEqual(
        suppliedHash,
        storedHash
      )
    ) {
      return NextResponse.json(
        {
          error:
            "This invitation token is invalid.",
        },
        { status: 401 }
      );
    }

    // 8. Verify the business still exists.
    const businessSnap =
      await businessRef.get();

    if (!businessSnap.exists) {
      return NextResponse.json(
        {
          error:
            "The business associated with this invitation no longer exists.",
        },
        { status: 404 }
      );
    }

    const business =
      businessSnap.data();

    // 9. The business owner cannot accept a team invitation.
    if (business?.ownerId === user.uid) {
      return NextResponse.json(
        {
          error:
            "The business owner is already a member of this business.",
        },
        { status: 409 }
      );
    }

    // 10. Check the user's current profile.
    const userRef = db
      .collection("users")
      .doc(user.uid);

    const userSnap =
      await userRef.get();

    const userProfile =
      userSnap.data();

    // The current app supports one business per user.
    if (
      userProfile?.businessId &&
      userProfile.businessId !== businessId
    ) {
      return NextResponse.json(
        {
          error:
            "Your account is already connected to another business.",
        },
        { status: 409 }
      );
    }

    // 11. Validate the invitation role.
    const role = invitation.role;

    if (
      role !== "manager" &&
      role !== "staff"
    ) {
      return NextResponse.json(
        {
          error:
            "This invitation contains an invalid role.",
        },
        { status: 400 }
      );
    }

    const memberRef = businessRef
      .collection("members")
      .doc(user.uid);

    const existingMember =
      await memberRef.get();

    if (existingMember.exists) {
      const existingData =
        existingMember.data();

      if (
        existingData?.status === "active"
      ) {
        return NextResponse.json(
          {
            error:
              "You are already a member of this business.",
          },
          { status: 409 }
        );
      }
    }

    const now = Date.now();

    // 12. Create/activate the membership and
    // mark the invitation as accepted.
    await db.runTransaction(
      async (transaction) => {
        transaction.set(
          memberRef,
          {
            uid: user.uid,
            businessId,
            email: userEmail,
            role,
            status: "active",
            createdAt:
              existingMember.exists &&
              existingMember.data()?.createdAt
                ? existingMember.data()
                    ?.createdAt
                : now,
          },
          { merge: true }
        );

        transaction.update(
          invitationRef,
          {
            status: "accepted",
            acceptedBy: user.uid,
            acceptedAt: now,
          }
        );

        transaction.set(
          userRef,
          {
            businessId,
          },
          { merge: true }
        );
      }
    );

    return NextResponse.json({
      message:
        "Invitation accepted successfully.",
      businessId,
      role,
    });
  } catch (error) {
    console.error(
      "[team-invite-accept] Failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to accept the invitation. Please try again.",
      },
      { status: 500 }
    );
  }
}