"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getIdToken } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { useBusiness } from "@/components/providers/business-provider";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/button";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/dates";
import { cn } from "@/lib/cn";
import { buildForecast, lowestProjectedBalance } from "@/lib/analytics";

interface ForecastData {
  narrative: string;
  forecast: { date: string; balance: number }[];
  currentBalance: number;
  net30d: number;
  currency: string;
}

export function ForecastPanel() {
  const { business, transactions, accounts, recurring } = useBusiness();
  const [data, setData] = useState<ForecastData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load(subtle: boolean) {
    if (!business?.id) return;
    setError(null);
    if (!subtle) setLoading(true);
    try {
      const token = await getIdToken(auth!.currentUser!);
      const res = await fetch("/api/ai/forecast", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ businessId: business.id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Request failed");
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load forecast.");
    } finally {
      setLoading(false);
    }
  }

  const chartData = useMemo(() => {
    const local = buildForecast(accounts, transactions, recurring, 30);
    return local.map((p) => ({ date: formatDate(p.date), balance: p.projectedBalance / 100, actual: p.event }));
  }, [accounts, transactions, recurring]);

  const localLowest = lowestProjectedBalance(buildForecast(accounts, transactions, recurring, 30));
  const currency = business?.currency ?? "USD";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">30-day cash flow forecast</h2>
        <Button variant="secondary" size="sm" onClick={() => load(false)} loading={loading}>
          Regenerate
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Projected balance by day</CardTitle>
          </CardHeader>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: 5 }}>
                <defs>
                  <linearGradient id="proj" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-200 dark:stroke-zinc-700" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#71717a" }} tickFormatter={(v: string) => v.slice(0, 6)} minTickGap={30} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#71717a" }} tickFormatter={(v: number) => formatMoney(v, currency).replace(/\.00$/, "")} axisLine={false} tickLine={false} width={70} />
                <Tooltip
                  contentStyle={{ background: "#18181b", border: "none", borderRadius: 12, color: "#fff", fontSize: 12 }}
                  labelStyle={{ color: "#a1a1aa" }}
                  formatter={(value) => [formatMoney(Number(value) || 0, currency), "Balance"]}
                />
                <Area type="monotone" dataKey="balance" stroke="#0ea5e9" strokeWidth={2} fill="url(#proj)" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs text-zinc-500">
            {localLowest && (
              <>
                <span className={cn("font-semibold", localLowest.value < 0 ? "text-red-500" : "text-emerald-500")}>
                  {formatMoney(localLowest.value, currency)}
                </span>
                lowest point around {formatDate(localLowest.date)}
              </>
            )}
          </div>
        </Card>

        <Card className="space-y-3">
          <CardHeader>
            <CardTitle>AI summary</CardTitle>
          </CardHeader>
          {loading && !data ? (
            <div className="flex items-center gap-2 py-8 text-sm text-zinc-500">
              <Spinner className="h-4 w-4 text-emerald-500" /> Building your forecast...
            </div>
          ) : error && !data ? (
            <p className="text-sm text-red-500">{error}</p>
          ) : data ? (
            <div className="prose prose-sm prose-zinc max-w-none dark:prose-invert" dangerouslySetInnerHTML={{ __html: markdownToHtml(data.narrative) }} />
          ) : null}
          {!data && !loading && !error && <p className="text-sm text-zinc-500">Add transactions to generate a forecast.</p>}
        </Card>
      </div>
    </div>
  );
}

function markdownToHtml(md: string): string {
  const html = md
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  // bullets
  const lines = html.split("\n");
  const out: string[] = [];
  let inList = false;
  for (const line of lines) {
    const bullet = /^\s*[-*] (.+)$/.exec(line);
    if (bullet) {
      if (!inList) {
        out.push("<ul class='my-2 space-y-1.5 pl-5 list-disc'>");
        inList = true;
      }
      out.push(`<li>${bullet[1].replace(/`([^`]+)`/g, "<code>$1</code>")}</li>`);
    } else {
      if (inList) {
        out.push("</ul>");
        inList = false;
      }
      if (line.trim()) out.push(`<p class='mb-2'>${line.replace(/`([^`]+)`/g, "<code>$1</code>")}</p>`);
    }
  }
  if (inList) out.push("</ul>");
  return out.join("\n");
}