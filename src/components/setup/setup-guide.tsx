"use client";

import type { ReactNode } from "react";
import { Settings2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useBusiness } from "@/components/providers/business-provider";
import { LoadingScreen } from "@/components/ui/empty-state";

export function SetupGuide({ children }: { children: ReactNode }) {
  const { loading } = useBusiness();

  if (loading) {
    return <LoadingScreen label="Loading your workspace..." />;
  }

  return (
    <div className="space-y-6">
      <Banner />
      {children}
    </div>
  );
}

function Banner() {
  const configured =
    !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
    !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
    !!process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;

  if (configured) return null;

  return (
    <Card padding={false} className="border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-950/50">
      <div className="flex items-start gap-3">
        <Settings2 size={20} className="mt-0.5 text-amber-600 dark:text-amber-400" />
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-300">
            Firebase not configured yet
          </h3>
          <p className="mt-1 text-sm text-amber-700 dark:text-amber-400">
            Copy <code className="rounded bg-amber-100 px-1 dark:bg-amber-900">.env.local.example</code>{" "}
            to <code className="rounded bg-amber-100 px-1 dark:bg-amber-900">.env.local</code> and fill in
            your Firebase project values, then restart the dev server.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.open("https://console.firebase.google.com", "_blank")}
        >
          Firebase Console
        </Button>
      </div>
    </Card>
  );
}