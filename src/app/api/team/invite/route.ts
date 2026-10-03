
import { createHash, randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import {
  getAdminDb,
  verifyIdToken,
} from "@/lib/firebase/admin";
const resend = new Resend(process.env.RESEND_API_KEY);

export const runtime = "nodejs";

const INVITATION_DURATION = 7 * 24 * 60 * 60 * 1000;

type InviteRequest = {
  businessId?: string;
  email?: string;
  role?: string;
};

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate the person creating the invitation.
    const authorization = req.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Please sign in to invite a team member." },
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
        { error: "Your session has expired. Please sign in again." },
        { status: 401 }
      );
    }

    // 2. Validate the submitted information.
    let body: InviteRequest;

    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid request body." },
        { status: 400 }
      );
    }

    const businessId =
      typeof body.businessId === "string"
        ? body.businessId.trim()
        : "";

    const email =
      typeof body.email === "string"
        ? body.email.trim().toLowerCase()
        : "";

    const role = body.role;

    if (!businessId || businessId.includes("/")) {
      return NextResponse.json(
        { error: "A valid business ID is required." },
        { status: 400 }
      );
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(email)) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    if (role !== "manager" && role !== "staff") {
      return NextResponse.json(
        { error: "Please select Manager or Staff." },
        { status: 400 }
      );
    }

    if (user.email?.toLowerCase() === email) {
      return NextResponse.json(
        { error: "You cannot invite yourself." },
        { status: 400 }
      );
    }

    const db = getAdminDb();

    // 3. Confirm that the business exists.
    const businessRef = db
      .collection("businesses")
      .doc(businessId);

    const businessSnap = await businessRef.get();

    if (!businessSnap.exists) {
      return NextResponse.json(
        { error: "Business not found." },
        { status: 404 }
      );
    }

    const business = businessSnap.data();

    // 4. Only owners and active managers can invite people.
    const isOwner = business?.ownerId === user.uid;

    if (!isOwner) {
      const memberSnap = await businessRef
        .collection("members")
        .doc(user.uid)
        .get();

      const member = memberSnap.data();

      const isActiveManager =
        memberSnap.exists &&
        member?.role === "manager" &&
        member?.status === "active";

      if (!isActiveManager) {
        return NextResponse.json(
          {
            error:
              "Only business owners and active managers can invite team members.",
          },
          { status: 403 }
        );
      }
    }

    // 5. Check whether the invited email already belongs
    // to the business owner or an active member.
    const ownerEmail =
      typeof business?.ownerEmail === "string"
        ? business.ownerEmail.toLowerCase()
        : "";

    if (ownerEmail === email) {
      return NextResponse.json(
        { error: "The business owner is already part of this business." },
        { status: 409 }
      );
    }

    const membersSnap = await businessRef
      .collection("members")
      .get();

    const alreadyMember = membersSnap.docs.some((doc) => {
      const member = doc.data();

      return (
        typeof member.email === "string" &&
        member.email.toLowerCase() === email &&
        member.status === "active"
      );
    });

    if (alreadyMember) {
      return NextResponse.json(
        { error: "This person is already a team member." },
        { status: 409 }
      );
    }

    // 6. Prevent duplicate, unexpired invitations.
    const invitationsRef =
      businessRef.collection("invitations");

    const existingInvitations = await invitationsRef
  .where("email", "==", email)
  .where("status", "==", "pending")
  .get();

const now = Date.now();

const activeInvitationDoc =
  existingInvitations.docs.find((doc) => {
    const invitation = doc.data();

    const expiresAt =
      typeof invitation.expiresAt === "number"
        ? invitation.expiresAt
        : invitation.expiresAt?.toMillis?.() ?? 0;

    return expiresAt > now;
  });

const token = randomBytes(32).toString("hex");

const tokenHash = createHash("sha256")
  .update(token)
  .digest("hex");

const invitationRef = activeInvitationDoc
  ? activeInvitationDoc.ref
  : invitationsRef.doc();

const expiresAt = now + INVITATION_DURATION;

await invitationRef.set(
  {
    businessId,
    email,
    role,
    tokenHash,
    status: "pending",
    invitedBy: user.uid,
    createdAt: activeInvitationDoc
      ? activeInvitationDoc.data().createdAt ?? now
      : now,
    expiresAt,
  },
  { merge: true }
);

    // 9. Generate the invitation URL.
    const appUrl = (
      process.env.NEXT_PUBLIC_APP_URL ||
      req.nextUrl.origin
    ).replace(/\/$/, "");

    const invitationUrl = new URL(
      `/team/invite/${invitationRef.id}`,
      appUrl
    );
    invitationUrl.searchParams.set("businessId", businessId);
    invitationUrl.searchParams.set("token", token);
    const invitationLink = invitationUrl.toString();

const { error: emailError } = await resend.emails.send({
  from:
    process.env.INVITATION_FROM_EMAIL ||
    "onboarding@resend.dev",
  to: email,
  subject: `You're invited to join ${business?.name || "a business"} on SME Cashflow`,
  html: `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937;">
      <h2>You're invited to join a business on SME Cashflow</h2>

      <p>
        You have been invited to join
        <strong>${business?.name || "this business"}</strong>
        as a <strong>${role}</strong>.
      </p>

      <p>
        Click the button below to accept your invitation:
      </p>

      <p>
        <a
          href="${invitationLink}"
          style="
            display: inline-block;
            padding: 12px 20px;
            background-color: #111827;
            color: #ffffff;
            text-decoration: none;
            border-radius: 6px;
          "
        >
          Accept Invitation
        </a>
      </p>

      <p>
        Or copy and paste this link into your browser:
      </p>

      <p style="word-break: break-all;">
        ${invitationLink}
      </p>

      <p>
        This invitation expires in 7 days.
      </p>

      <p>
        If you were not expecting this invitation, you can ignore this email.
      </p>
    </div>
  `,
});

    return NextResponse.json(
  {
    message: emailError
      ? "Invitation created, but the email could not be sent."
      : "Invitation created and email sent successfully.",
    invitationId: invitationRef.id,
    invitationUrl: invitationLink,
    inviteUrl: invitationLink,
    expiresAt,
    emailSent: !emailError,
    emailError: emailError
      ? "The invitation link was created, but the email could not be sent."
      : undefined,
  },
  { status: activeInvitationDoc ? 200 : 201 }
);
  } catch (error) {
    console.error("[team-invite] Failed to create invitation:", error);

    return NextResponse.json(
      {
        error: "Unable to create the invitation. Please try again.",
      },
      { status: 500 }
    );
  }
}