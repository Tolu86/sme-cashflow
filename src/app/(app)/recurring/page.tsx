"use client";

import { PageHeader } from "@/components/ui/page-header";
import { useMemo, useState } from "react";
import { Plus, Repeat, Power, CalendarDays, ArrowDownLeft, ArrowUpRight, Pencil } from "lucide-react";
import { useBusiness } from "@/components/providers/business-provider";
import { LoadingScreen, EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RecurringForm } from "@/components/recurring/recurring-form";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/dates";
import { updateOne } from "@/lib/firestore/helpers";
import type { RecurringRule } from "@/types";

export default function RecurringPage() {
  const { business, recurring, accounts, reload, loading } = useBusiness();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<RecurringRule | null>(null);

  const currency = business?.currency ?? "USD";

  const sorted = useMemo(
    () => [...recurring].sort((a, b) => a.nextDueDate.localeCompare(b.nextDueDate)),
    [recurring]
  );

  async function toggle(rule: RecurringRule) {
    if (!business?.id) return;
    await updateOne(business.id, "recurring", rule.id, { active: !rule.active });
    await reload();
  }

  if (loading || !business) return <LoadingScreen label="Loading recurring items..." />;

  const activeRules = recurring.filter((rule) => rule.active);
  const nextDue = sorted.find((rule) => rule.active);

  return (
    <div className="space-y-7 pb-8">
      <div className="space-y-4">
        <PageHeader
          title="Recurring payments"
          description="Stay ahead of the bills and income streams that repeat throughout your business."
        />
        <div className="flex justify-end">
          <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
            <Plus size={16} /> Add recurring item
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Recurring items", value: recurring.length.toLocaleString(), icon: Repeat, detail: "Tracked schedules" },
          { label: "Active schedules", value: activeRules.length.toLocaleString(), icon: Power, detail: "Currently included in planning" },
          { label: "Next scheduled date", value: nextDue ? formatDate(nextDue.nextDueDate) : "—", icon: CalendarDays, detail: nextDue ? "Earliest active item" : "No active schedules" },
        ].map(({ label, value, icon: Icon, detail }) => (
          <div key={label} className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium text-slate-500">{label}</p>
              <span className="rounded-xl bg-emerald-50 p-2.5 text-emerald-700"><Icon size={18} /></span>
            </div>
            <p className="mt-4 text-2xl font-semibold tabular-nums tracking-tight text-slate-900">{value}</p>
            <p className="mt-1 text-xs text-slate-500">{detail}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.17em] text-emerald-700">Payment calendar</p>
          <h2 className="mt-1 text-lg font-semibold tracking-tight text-slate-900">Upcoming by due date</h2>
        </div>
        <span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
          {sorted.length} item{sorted.length === 1 ? "" : "s"}
        </span>
      </div>

      {sorted.length === 0 ? (
        <EmptyState
          icon={<Repeat size={28} />}
          title="No recurring items yet"
          description="Add things like rent, payroll, or client subscriptions so forecasts and alerts can account for them."
          action={<Button onClick={() => { setEditing(null); setFormOpen(true); }}><Plus size={16} /> Add recurring item</Button>}
        />
      ) : (
        <Card padding={false} className="overflow-hidden">
          <div className="divide-y divide-slate-100">
            {sorted.map((r) => {
              const account = accounts.find((a) => a.id === r.accountId);
              const isIncome = r.type === "income";
              const Icon = isIncome ? ArrowDownLeft : ArrowUpRight;
              return (
                <div key={r.id} className="flex flex-wrap items-center gap-3 px-4 py-4 transition hover:bg-slate-50/50 sm:flex-nowrap sm:gap-4 sm:px-6">
                  <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${isIncome ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                    <Icon size={19} />
                  </span>
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() => { setEditing(r); setFormOpen(true); }}
                  >
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {r.notes || (isIncome ? "Recurring income" : "Recurring expense")}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      {r.frequency} · Next {formatDate(r.nextDueDate)} · {account?.name ?? "No account"}
                    </p>
                    <span className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-emerald-700"><Pencil size={11} /> Edit schedule</span>
                  </button>
                  <div className="ml-14 flex w-full flex-wrap items-center justify-between gap-3 sm:ml-0 sm:w-auto sm:justify-end">
                    <div className="flex flex-col items-start gap-2 sm:items-end">
                      <p className={`text-sm font-semibold tabular-nums ${isIncome ? "text-emerald-700" : "text-slate-900"}`}>
                        {isIncome ? "+" : "−"}{formatMoney(r.amount, currency)}
                      </p>
                      <Badge variant={r.active ? "success" : "default"}>{r.active ? "Active" : "Paused"}</Badge>
                    </div>
                    <Button variant="secondary" size="sm" onClick={() => toggle(r)} title={r.active ? "Pause recurring item" : "Resume recurring item"}>
                      <Power size={15} className={r.active ? "text-red-500" : "text-emerald-600"} />
                      <span className="sr-only">{r.active ? "Pause" : "Resume"}</span>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <RecurringForm open={formOpen} onClose={() => setFormOpen(false)} rule={editing} />
    </div>
  );
}
