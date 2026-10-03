import { NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase/admin";

export async function POST(request: Request) {
  try {
    const authorization = request.headers.get("authorization");

    if (
      !authorization ||
      !authorization.startsWith("Bearer ")
    ) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const token = authorization.substring(7);

    const decodedToken =
      await getAdminAuth().verifyIdToken(token);

    await getAdminAuth().revokeRefreshTokens(
      decodedToken.uid
    );

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "Failed to revoke Firebase sessions:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to sign out of all devices.",
      },
      { status: 500 }
    );
  }
}