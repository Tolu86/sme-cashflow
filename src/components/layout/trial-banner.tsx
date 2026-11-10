"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { useBusiness } from "@/components/providers/business-provider";

const DAY_MS = 24 * 60 * 60 * 1000;

export function TrialBanner() {
  const { business, reload } = useBusiness();
  const { user } = useAuth();
  const [dismissedFor, setDismissedFor] = useState<string | null>(null);
  const bannerKey = business && user ? `${user.uid}:${business.id}` : null;
  // The session key survives refreshes, and AuthProvider clears it on sign-out.
  const storedDismissal = (() => {
    if (!bannerKey || typeof window === "undefined") return false;
    try {
      return window.sessionStorage.getItem("cashflow-trial-dismissed:" + bannerKey) === "1";
    } catch {
      return false;
    }
  })();
  const [now, setNow] = useState<number | null>(null);
  const expiryRefreshAttempted = useRef(false);

  useEffect(() => {
    const updateTime = () => setNow(Date.now());
    updateTime();
    const intervalId = window.setInterval(updateTime, 60_000);
    return () => window.clearInterval(intervalId);
  }, []);

  const trialEndsAt = business?.trialEndsAt;

  useEffect(() => {
    if (
      now !== null &&
      typeof trialEndsAt === "number" &&
      trialEndsAt <= now &&
      business?.plan !== "pro" &&
      business?.plan !== "premium" &&
      !expiryRefreshAttempted.current
    ) {
      expiryRefreshAttempted.current = true;
      void reload();
    }
  }, [now, trialEndsAt, business?.plan, reload]);

  if (
    !business ||
    dismissedFor === bannerKey ||
    storedDismissal ||
    business.plan === "pro" ||
    business.plan === "premium" ||
    typeof trialEndsAt !== "number" ||
    now === null ||
    trialEndsAt <= now
  ) {
    return null;
  }

  const daysRemaining = Math.ceil((trialEndsAt - now) / DAY_MS);
  const feedbackUrl = process.env.NEXT_PUBLIC_BETA_FEEDBACK_FORM_URL;

  return (
    <div className="flex flex-col gap-3 border-b border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-950 sm:flex-row sm:items-center sm:justify-between sm:px-6 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100">
      <div>
        <p className="text-sm font-semibold">
          Your Pro trial is active — {daysRemaining} {daysRemaining === 1 ? "day" : "days"} remaining
        </p>
        <p className="mt-0.5 text-xs opacity-80">
          You have temporary access to Pro features. Upgrade before your trial ends to keep them.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {feedbackUrl ? (
          <a
            href={feedbackUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-9 items-center justify-center rounded-md border border-emerald-700 px-3 py-1.5 text-sm font-medium hover:bg-emerald-100 dark:border-emerald-700 dark:hover:bg-emerald-900"
          >
            Give feedback
          </a>
        ) : null}
        <Link
          href="/settings#subscription"
          className="inline-flex h-8 items-center justify-center rounded-lg bg-emerald-600 px-3 text-xs font-medium text-white transition-colors hover:bg-emerald-700"
        >
          View plans
        </Link>
        <button
          type="button"
          onClick={() => {
            if (!bannerKey) return;
            try {
              window.sessionStorage.setItem("cashflow-trial-dismissed:" + bannerKey, "1");
            } catch {
              // Still dismiss for the current render when storage is unavailable.
            }
            setDismissedFor(bannerKey);
          }}
          aria-label="Dismiss free trial banner until next login"
          title="Dismiss until next login"
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-emerald-800 transition-colors hover:bg-emerald-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
        >
          <X size={18} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
