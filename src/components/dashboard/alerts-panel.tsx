"use client";

import { useState } from "react";
import { Bell, BellOff, Check } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/dates";
import type { AppAlert } from "@/types";

const severityStyles = {
  info: { dot: "bg-sky-500", ring: "border-sky-200 dark:border-sky-800" },
  warning: { dot: "bg-amber-500", ring: "border-amber-200 dark:border-amber-800" },
  critical: { dot: "bg-red-500", ring: "border-red-200 dark:border-red-800" },
};

function AlertIcon() {
  return <Bell size={14} className="text-zinc-400" />;
}

export function AlertsPanel({ alerts }: { alerts: AppAlert[] }) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const visible = alerts.filter((a) => !dismissed.has(a.id)).slice(0, 5);

  if (visible.length === 0) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
        <BellOff size={18} className="text-zinc-400" />
        You&apos;re all caught up — no alerts right now.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {visible.map((a) => {
        const s = severityStyles[a.severity];
        return (
          <div
            key={a.id}
            className={cn("flex items-start gap-3 rounded-xl border bg-white p-4 dark:bg-zinc-900", s.ring)}
          >
            <div className={cn("mt-1 flex h-2 w-2 shrink-0 rounded-full", s.dot)} />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <AlertIcon />
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{a.title}</p>
              </div>
              <p className="mt-1 text-sm text-zinc-500">{a.message}</p>
              {a.date && <p className="mt-1 text-xs text-zinc-400">Date: {formatDate(a.date)}</p>}
            </div>
            <button
              onClick={() => setDismissed((prev) => new Set(prev).add(a.id))}
              className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800"
              title="Dismiss"
            >
              <Check size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
}