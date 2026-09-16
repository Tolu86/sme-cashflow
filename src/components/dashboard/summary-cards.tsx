"use client";

import { Wallet, ArrowDownLeft, ArrowUpRight, TrendingUp, TrendingDown } from "lucide-react";
import { formatMoney } from "@/lib/money";
import type { PeriodSummary } from "@/types";

export function SummaryCards({ summary, currency }: { summary: PeriodSummary; currency: string }) {
  const cards = [
    {
      label: "Cash on hand",
      value: formatMoney(summary.currentBalance, currency),
      icon: Wallet,
      accent: "text-emerald-500",
      bg: "bg-emerald-500/10",
    },
    {
      label: `Cash in (30d)`,
      value: formatMoney(summary.income, currency),
      icon: ArrowDownLeft,
      accent: "text-sky-500",
      bg: "bg-sky-500/10",
    },
    {
      label: `Cash out (30d)`,
      value: formatMoney(summary.expense, currency),
      icon: ArrowUpRight,
      accent: "text-amber-500",
      bg: "bg-amber-500/10",
    },
    {
      label: `Net (30d)`,
      value: formatMoney(summary.net, currency),
      icon: summary.net >= 0 ? TrendingUp : TrendingDown,
      accent: summary.net >= 0 ? "text-emerald-500" : "text-red-500",
      bg: summary.net >= 0 ? "bg-emerald-500/10" : "bg-red-500/10",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <div
            key={c.label}
            className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="flex items-center gap-2">
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${c.bg} ${c.accent}`}>
                <Icon size={16} />
              </div>
              <p className="text-sm text-zinc-500">{c.label}</p>
            </div>
            <p className="mt-3 text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              {c.value}
            </p>
          </div>
        );
      })}
    </div>
  );
}