"use client";

import { useEffect, useState } from "react";
import { getIdToken } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { useBusiness } from "@/components/providers/business-provider";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, TrendingDown, TrendingUp, CircleAlert } from "lucide-react";

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function run() {
      if (!business?.id) return;
      setLoading(true);
      try {
        const token = await getIdToken(auth!.currentUser!, true);
        const res = await fetch("/api/ai/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ businessId: business.id }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Request failed");
        setFindings(json.findings ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load insights.");
      } finally {
        setLoading(false);
      }
    }
    run();
  }, [business?.id]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Lightbulb size={16} className="text-amber-500" />
          <CardTitle>Monthly money insights</CardTitle>
        </div>
      </CardHeader>
      {loading ? (
        <div className="flex items-center gap-2 py-6 text-sm text-zinc-500">
          <Spinner className="h-4 w-4 text-emerald-500" /> Analyzing your books...
        </div>
      ) : error ? (
        <p className="text-sm text-red-500">{error}</p>
      ) : findings.length === 0 ? (
        <p className="text-sm text-zinc-500">No insights yet. Add more transactions to see analysis.</p>
      ) : (
        <div className="space-y-4">
          {findings.map((f, i) => {
            const meta = toneMeta[f.tone] ?? toneMeta.neutral;
            const Icon = meta.Icon;
            return (
              <div key={i} className="flex gap-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-500 dark:bg-zinc-800">
                  <Icon size={16} />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{f.title}</p>
                    <Badge variant={meta.badge}>{f.tone}</Badge>
                  </div>
                  <p className="mt-0.5 text-sm text-zinc-500">{f.detail}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}