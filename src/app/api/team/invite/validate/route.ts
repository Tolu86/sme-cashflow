
import { createHash, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const params = req.nextUrl.searchParams;

    const businessId = params.get("businessId");
    const invitationId = params.get("invitationId");
    const token = params.get("token");

    if (
      !businessId ||
      !invitationId ||
      !token ||
      businessId.includes("/") ||
      invitationId.includes("/")
    ) {
      return NextResponse.json(
        { error: "Invalid invitation link." },
        { status: 400 }
      );
    }

    const db = getAdminDb();

    const invitationSnap = await db
      .collection("businesses")
      .doc(businessId)
      .collection("invitations")
      .doc(invitationId)
      .get();

    if (!invitationSnap.exists) {
      return NextResponse.json(
        { error: "Invitation not found." },
        { status: 404 }
      );
    }

    const invitation = invitationSnap.data()!;

    // Compare the supplied token against its stored hash.
    const suppliedHash = createHash("sha256")
      .update(token)
      .digest();

    const storedHash =
      typeof invitation.tokenHash === "string" &&
      /^[a-f0-9]{64}$/i.test(invitation.tokenHash)
        ? Buffer.from(invitation.tokenHash, "hex")
        : Buffer.alloc(32);

    if (
      !timingSafeEqual(suppliedHash, storedHash) ||
      typeof invitation.tokenHash !== "string"
    ) {
      return NextResponse.json(
        { error: "Invalid invitation token." },
        { status: 401 }
      );
    }

    if (invitation.status !== "pending") {
      return NextResponse.json(
        { error: "This invitation is no longer active." },
        { status: 410 }
      );
    }

    const expiresAt =
      typeof invitation.expiresAt === "number"
        ? invitation.expiresAt
        : invitation.expiresAt?.toMillis?.();

    if (
      typeof expiresAt !== "number" ||
      expiresAt <= Date.now()
    ) {
      return NextResponse.json(
        { error: "This invitation has expired." },
        { status: 410 }
      );
    }

    const businessSnap = await db
      .collection("businesses")
      .doc(businessId)
      .get();

    if (!businessSnap.exists) {
      return NextResponse.json(
        { error: "The business no longer exists." },
        { status: 404 }
      );
    }

    if (
      typeof invitation.email !== "string" ||
      !["manager", "staff"].includes(invitation.role)
    ) {
      return NextResponse.json(
        { error: "Invalid invitation information." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      invitation: {
        email: invitation.email,
        role: invitation.role,
        businessName:
          businessSnap.data()?.name ?? "Unnamed business",
        expiresAt,
      },
    });
  } catch (error) {
    console.error(
      "[invite-validation] Validation failed:",
      error
    );

    return NextResponse.json(
      { error: "Unable to validate invitation." },
      { status: 500 }
    );
  }
}