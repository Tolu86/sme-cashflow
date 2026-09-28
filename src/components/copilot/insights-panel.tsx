
"use client";

import { useEffect, useState } from "react";
import { getIdToken } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { useBusiness } from "@/components/providers/business-provider";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Lightbulb,
  TrendingDown,
  TrendingUp,
  CircleAlert,
} from "lucide-react";

interface Finding {
  title: string;
  detail: string;
  tone: "good" | "bad" | "neutral";
}

const toneMeta = {
  good: { badge: "success" as const, Icon: TrendingUp },
  bad: { badge: "danger" as const, Icon: TrendingDown },
  neutral: { badge: "info" as const, Icon: CircleAlert },
};

export function InsightsPanel() {
  const { business } = useBusiness();

  const [findings, setFindings] = useState<Finding[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isPro =
    business?.plan === "pro" ||
    business?.plan === "premium";

  useEffect(() => {
    async function run() {
      if (!business?.id || !isPro) return;

      setLoading(true);
      setError(null);

      try {
        const token = await getIdToken(
          auth!.currentUser!,
          true
        );

        const res = await fetch("/api/ai/analyze", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            businessId: business.id,
          }),
        });

        const json = await res.json();

        if (!res.ok) {
          throw new Error(
            json.error ?? "Request failed"
          );
        }

        setFindings(json.findings ?? []);
      } catch (e) {
        setError(
          e instanceof Error
            ? e.message
            : "Failed to load insights."
        );
      } finally {
        setLoading(false);
      }
    }

    run();
  }, [business?.id, isPro]);

  if (!business) {
    return null;
  }

  if (!isPro) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Lightbulb
              size={16}
              className="text-amber-500"
            />
            <CardTitle>
              Monthly money insights
            </CardTitle>
          </div>
        </CardHeader>

        <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
            <Lightbulb
              size={22}
              className="text-emerald-600"
            />
          </div>

          <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            Insights are a Pro feature
          </h3>

          <p className="mt-2 max-w-md text-sm text-zinc-500">
            Upgrade to Pro to get AI-powered
            analysis and personalized insights
            about your business finances.
          </p>

          <button
            type="button"
            onClick={() => {
              window.location.href = "/settings";
            }}
            className="mt-5 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-600"
          >
            Upgrade to Pro
          </button>

          <p className="mt-2 text-xs text-zinc-400">
            Pro is ₦3,000/month.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Lightbulb
            size={16}
            className="text-amber-500"
          />
          <CardTitle>
            Monthly money insights
          </CardTitle>
        </div>
      </CardHeader>

      {loading ? (
        <div className="flex items-center gap-2 py-6 text-sm text-zinc-500">
          <Spinner className="h-4 w-4 text-emerald-500" />
          Analyzing your books...
        </div>
      ) : error ? (
        <p className="text-sm text-red-500">
          {error}
        </p>
      ) : findings.length === 0 ? (
        <p className="text-sm text-zinc-500">
          No insights yet. Add more transactions to
          see analysis.
        </p>
      ) : (
        <div className="space-y-4">
          {findings.map((f, i) => {
            const meta =
              toneMeta[f.tone] ??
              toneMeta.neutral;

            const Icon = meta.Icon;

            return (
              <div
                key={i}
                className="flex gap-3"
              >
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-500 dark:bg-zinc-800">
                  <Icon size={16} />
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {f.title}
                    </p>

                    <Badge variant={meta.badge}>
                      {f.tone}
                    </Badge>
                  </div>

                  <p className="mt-0.5 text-sm text-zinc-500">
                    {f.detail}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

