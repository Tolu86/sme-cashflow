"use client";

import { useState } from "react";
import { Bot, TrendingUp, Lightbulb } from "lucide-react";
import { cn } from "@/lib/cn";
import { CopilotChat } from "@/components/copilot/chat";
import { ForecastPanel } from "@/components/copilot/forecast-panel";
import { InsightsPanel } from "@/components/copilot/insights-panel";
import { useBusiness } from "@/components/providers/business-provider";
import { LoadingScreen } from "@/components/ui/empty-state";

type Tab = "chat" | "forecast" | "insights";

const TABS: { id: Tab; label: string; icon: typeof Bot }[] = [
  { id: "chat", label: "Ask Copilot", icon: Bot },
  { id: "forecast", label: "Forecast", icon: TrendingUp },
  { id: "insights", label: "Insights", icon: Lightbulb },
];

export default function CopilotPage() {
  const { business, loading } = useBusiness();
  const [tab, setTab] = useState<Tab>("chat");

  if (loading || !business) return <LoadingScreen label="Loading your copilot..." />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">AI Copilot</h1>
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