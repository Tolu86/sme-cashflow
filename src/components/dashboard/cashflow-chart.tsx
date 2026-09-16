"use client";

import { useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/money";
import type { CashflowPoint } from "@/types";
import { formatDate } from "@/lib/dates";

export function CashflowChart({
  points,
  currency,
  onRangeChange,
}: {
  points: CashflowPoint[];
  currency: string;
  onRangeChange?: (days: number) => void;
}) {
  const [range, setRange] = useState(30);

  const data = points.map((p) => ({
    ...p,
    label: formatDate(p.date),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cash flow</CardTitle>
        <div className="flex gap-1 rounded-lg bg-zinc-100 p-1 dark:bg-zinc-800">
          {[30, 90].map((d) => (
            <button
              key={d}
              onClick={() => {
                setRange(d);
                onRangeChange?.(d);
              }}
              className={cn(
                "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                range === d
                  ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-white"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
              )}
            >
              {d}d
            </button>
          ))}
        </div>
      </CardHeader>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 5, bottom: 0, left: 5 }}>
            <defs>
              <linearGradient id="balance" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--tw-ring-color)" className="stroke-zinc-200 dark:stroke-zinc-700" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: "#71717a" }}
              tickFormatter={(v: string) => v.slice(0, 6)}
              minTickGap={30}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#71717a" }}
              tickFormatter={(v: number) => formatMoney(v, currency).replace(/\.00$/, "")}
              axisLine={false}
              tickLine={false}
              width={70}
            />
            <Tooltip
              contentStyle={{
                background: "var(--color-zinc-900)",
                border: "none",
                borderRadius: 12,
                color: "#fff",
                fontSize: 12,
              }}
              labelStyle={{ color: "#a1a1aa" }}
              formatter={(value) => [formatMoney(Number(value) || 0, currency), "Balance"]}
            />
            <Area
              type="monotone"
              dataKey="balance"
              stroke="#10b981"
              strokeWidth={2}
              fill="url(#balance)"
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}