"use client";

import { useState } from "react";
import {
  Bot,
  TrendingUp,
  Lightbulb,
  Lock,
  ArrowUpRight,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { CopilotChat } from "@/components/copilot/chat";
import { ForecastPanel } from "@/components/copilot/forecast-panel";
import { InsightsPanel } from "@/components/copilot/insights-panel";
import { useBusiness } from "@/components/providers/business-provider";
import { LoadingScreen } from "@/components/ui/empty-state";
import Link from "next/link";

type Tab = "chat" | "forecast" | "insights";

const TABS: { id: Tab; label: string; icon: typeof Bot }[] = [
  { id: "chat", label: "Ask Copilot", icon: Bot },
  { id: "forecast", label: "Forecast", icon: TrendingUp },
  { id: "insights", label: "Insights", icon: Lightbulb },
];

export default function CopilotPage() {
  const { business, loading } = useBusiness();
  const [tab, setTab] = useState<Tab>("chat");

  if (loading || !business) {
    return <LoadingScreen label="Loading your copilot..." />;
  }

  const isPro =
    business.plan === "pro" || business.plan === "premium";

  if (!isPro) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            AI Copilot
          </h1>
          <p className="text-sm text-zinc-500">
            Your AI finance assistant with live data from {business.name}.
          </p>
        </div>

        <div className="flex min-h-[420px] items-center justify-center rounded-2xl border border-zinc-200 bg-white p-8 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="max-w-md text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
              <Lock
                size={28}
                className="text-emerald-600 dark:text-emerald-400"
              />
            </div>

            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
              AI Copilot is a Pro feature
            </h2>

            <p className="mt-2 text-sm leading-6 text-zinc-500">
              Get AI-powered financial insights, forecasts, transaction
              categorization, and an intelligent finance assistant for your
              business.
            </p>

            <Link
              href="/settings"
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
            >
              Upgrade to Pro
              <ArrowUpRight size={16} />
            </Link>

            <p className="mt-3 text-xs text-zinc-400">
              Pro is ₦3,000/month.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          AI Copilot
        </h1>
        <p className="text-sm text-zinc-500">
          Your AI finance assistant with live data from {business.name}.
        </p>
      </div>

      <div className="flex flex-wrap gap-1 rounded-xl border border-zinc-200 bg-white p-1 dark:border-zinc-800 dark:bg-zinc-900">
        {TABS.map((t) => {
          const Icon = t.icon;

          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                tab === t.id
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
              )}
            >
              <Icon size={16} />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "chat" && <CopilotChat />}
      {tab === "forecast" && <ForecastPanel />}
      {tab === "insights" && <InsightsPanel />}
    </div>
  );
}