"use client";

import { useMemo, useState } from "react";
import { Plus, Repeat, Power } from "lucide-react";
import { useBusiness } from "@/components/providers/business-provider";
import { LoadingScreen, EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Recurring</h1>
          <p className="text-sm text-zinc-500">
            Rent, payroll, subscriptions and invoices that repeat. We&apos;ll remind you when they&apos;re due.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Plus size={16} />
          Add recurring item
        </Button>
      </div>

      {sorted.length === 0 ? (
        <EmptyState
          icon={<Repeat size={28} />}
          title="No recurring items yet"
          description="Add things like rent, payroll, or client subscriptions so forecasts and alerts can account for them."
          action={
            <Button
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus size={16} />
              Add recurring item
            </Button>
          }
        />
      ) : (
        <Card padding={false}>
          <CardHeader className="px-5 pt-4">
            <CardTitle>Upcoming by due date</CardTitle>
          </CardHeader>
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {sorted.map((r) => {
              const account = accounts.find((a) => a.id === r.accountId);
              const isIncome = r.type === "income";
              return (
                <div key={r.id} className="flex items-center gap-3 px-5 py-3">
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-full ${
                      isIncome ? "bg-sky-500/10 text-sky-600" : "bg-amber-500/10 text-amber-600"
                    }`}
                  >
                    <Repeat size={16} />
                  </div>
                  <button
                    className="min-w-0 flex-1 text-left"
                    onClick={() => {
                      setEditing(r);
                      setFormOpen(true);
                    }}
                  >
                    <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {r.notes || (isIncome ? "Recurring income" : "Recurring expense")}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {r.frequency} · next {formatDate(r.nextDueDate)} · {account?.name ?? "no account"}
                    </p>
                  </button>
                  <Badge variant={r.active ? "success" : "default"}>{r.active ? "active" : "paused"}</Badge>
                  <p
                    className={`shrink-0 text-sm font-semibold tabular-nums ${
                      isIncome ? "text-emerald-600" : "text-zinc-900 dark:text-zinc-100"
                    }`}
                  >
                    {isIncome ? "+" : "−"}{formatMoney(r.amount, currency)}
                  </p>
                  <Button variant="ghost" size="sm" onClick={() => toggle(r)}>
                    <Power size={15} className={r.active ? "text-red-500" : "text-emerald-500"} />
                  </Button>
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