"use client";

import { useParams, useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getIdToken } from "firebase/auth";
import { ShieldCheck } from "lucide-react";

import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingScreen } from "@/components/ui/empty-state";
import { auth } from "@/lib/firebase/client";

type InvitationData = {
  email: string;
  role: "manager" | "staff";
  businessName: string;
  expiresAt: number;
};

export default function InvitationPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const invitationId =
    typeof params.invitationId === "string"
      ? params.invitationId
      : "";

  const businessId =
    searchParams.get("businessId") ?? "";

  const token =
    searchParams.get("token") ?? "";

  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [invitation, setInvitation] =
    useState<InvitationData | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    async function validateInvitation() {
      if (
        !invitationId ||
        !businessId ||
        !token
      ) {
        setError(
          "This invitation link is invalid or incomplete."
        );
        setLoading(false);
        return;
      }

      try {
        const params = new URLSearchParams({
          businessId,
          invitationId,
          token,
        });

        const response = await fetch(
          `/api/team/invite/validate?${params.toString()}`,
          {
            method: "GET",
            cache: "no-store",
          }
        );

        const data = await response.json();

        if (!response.ok) {
          setError(
            data?.error ??
              "This invitation could not be validated."
          );
          setLoading(false);
          return;
        }

        if (!data?.invitation) {
          setError(
            "Invitation information could not be loaded."
          );
          setLoading(false);
          return;
        }

        setInvitation(data.invitation);
      } catch (err) {
        console.error(
          "[invitation-page] Validation failed:",
          err
        );

        setError(
          "Unable to check this invitation. Please try again."
        );
      } finally {
        setLoading(false);
      }
    }

    validateInvitation();
  }, [
    invitationId,
    businessId,
    token,
  ]);

  async function handleAcceptInvitation() {
    setError("");
    setSuccess("");

    if (!invitationId || !businessId || !token) {
      setError(
        "This invitation link is invalid."
      );
      return;
    }

    if (!auth?.currentUser) {
      router.push(
        `/login?redirect=${encodeURIComponent(
          window.location.pathname +
            window.location.search
        )}`
      );
      return;
    }

    setAccepting(true);

    try {
      const currentUser = auth.currentUser;

      const idToken =
        await getIdToken(
          currentUser,
          true
        );

      const response = await fetch(
        "/api/team/invite/accept",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
            Authorization:
              `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            businessId,
            invitationId,
            token,
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        setError(
          data?.error ??
            "Unable to accept this invitation."
        );
        return;
      }

      setSuccess(
        "Invitation accepted successfully. Redirecting..."
      );

      // Give the success message a moment
      // before sending the user into the app.
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 1000);
    } catch (err) {
      console.error(
        "[invitation-page] Accept failed:",
        err
      );

      setError(
        "Unable to accept the invitation. Please try again."
      );
    } finally {
      setAccepting(false);
    }
  }

  if (loading) {
    return (
      <LoadingScreen
        label="Checking invitation..."
      />
    );
  }

  if (error && !invitation) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-6 dark:bg-zinc-950">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>
              Invalid invitation
            </CardTitle>
          </CardHeader>

          <div className="space-y-4">
            <p className="text-sm text-zinc-500">
              {error}
            </p>

            <Link href="/login">
              <Button className="w-full">
                Go to sign in
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-6 dark:bg-zinc-950">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader>
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
              <ShieldCheck size={24} />
            </div>

            <CardTitle className="text-center">
              You're invited to join a business
            </CardTitle>
          </CardHeader>

          <div className="space-y-4">
            <p className="text-center text-sm text-zinc-500">
              You've been invited to join
              Cashflow Copilot as a team
              member.
            </p>

            {invitation && (
              <div className="rounded-lg bg-zinc-50 p-4 dark:bg-zinc-900/50">
                <p className="text-sm">
                  <span className="font-medium">
                    Business:
                  </span>{" "}
                  {invitation.businessName}
                </p>

                <p className="mt-2 text-sm">
                  <span className="font-medium">
                    Role:
                  </span>{" "}
                  <span className="capitalize">
                    {invitation.role}
                  </span>
                </p>

                <p className="mt-2 text-sm">
                  <span className="font-medium">
                    Email:
                  </span>{" "}
                  {invitation.email}
                </p>
              </div>
            )}

            {success && (
              <p className="text-center text-sm text-emerald-600">
                {success}
              </p>
            )}

            {error && (
              <p className="text-center text-sm text-red-600">
                {error}
              </p>
            )}

            <Button
              className="w-full"
              onClick={
                handleAcceptInvitation
              }
              disabled={accepting}
            >
              {accepting
                ? "Accepting invitation..."
                : "Accept invitation"}
            </Button>

            {!auth?.currentUser && (
              <p className="text-center text-xs text-zinc-400">
                You'll need to sign in with the
                invited email address before
                accepting.
              </p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}