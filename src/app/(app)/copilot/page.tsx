"use client";

import { PageHeader } from "@/components/ui/page-header";
import { useState } from "react";
import {
  Bot,
  TrendingUp,
  Lightbulb,
  Lock,
  ArrowUpRight,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { CopilotChat } from "@/components/copilot/chat";
import { ForecastPanel } from "@/components/copilot/forecast-panel";
import { InsightsPanel } from "@/components/copilot/insights-panel";
import { useBusiness } from "@/components/providers/business-provider";
import { LoadingScreen } from "@/components/ui/empty-state";
import Link from "next/link";
import { isTrialActive } from "@/lib/plans";

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
    business.plan === "pro" ||
    business.plan === "premium" ||
    isTrialActive(business.trialEndsAt);

  if (!isPro) {
    return (
      <div className="space-y-7 pb-8">
        <PageHeader
          title="Cashflow Copilot"
          description="Get AI-powered insights about your business."
        />

        <div className="flex min-h-[420px] items-center justify-center rounded-2xl border border-slate-200/80 bg-white p-8 shadow-sm">
          <div className="max-w-md text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50">
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
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#00c076] px-5 py-3 text-sm font-semibold text-[#073c29] transition-colors hover:bg-emerald-300"
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
    <div className="space-y-7 pb-8">
      <PageHeader
        title="AI Copilot"
        description={`Your financial assistant for ${business.name}. Explore cash flow, forecasts, and insights in one workspace.`}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Ask a question", detail: "Understand your finances", icon: Bot },
          { label: "Explore forecasts", detail: "Plan the next 30 days", icon: TrendingUp },
          { label: "Discover insights", detail: "Spot spending patterns", icon: Lightbulb },
        ].map(({ label, detail, icon: Icon }) => (
          <div key={label} className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
            <span className="rounded-xl bg-emerald-50 p-3 text-emerald-700"><Icon size={19} /></span>
            <div className="min-w-0"><p className="text-sm font-semibold text-slate-900">{label}</p><p className="mt-0.5 text-xs text-slate-500">{detail}</p></div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <Sparkles size={17} className="text-emerald-600" />
        <h2 className="text-base font-semibold text-slate-900">Your assistant workspace</h2>
      </div>

      <div role="tablist" aria-label="Copilot tools" className="flex flex-wrap gap-2 rounded-2xl border border-slate-200/80 bg-white p-2 shadow-sm">
        {TABS.map((t) => {
          const Icon = t.icon;

          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-3 text-xs font-semibold transition-colors sm:flex-none sm:px-5 sm:text-sm",
                tab === t.id
                  ? "bg-[#eaf8f1] text-emerald-800 ring-1 ring-emerald-100"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
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