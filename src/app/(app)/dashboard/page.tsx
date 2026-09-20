"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useBusiness } from "@/components/providers/business-provider";
import { useAuth } from "@/components/providers/auth-provider";
import { SummaryCards } from "@/components/dashboard/summary-cards";
import { CashflowChart } from "@/components/dashboard/cashflow-chart";
import { RecentTransactions } from "@/components/dashboard/recent-transactions";
import { motion } from "framer-motion";
import { AlertsPanel } from "@/components/dashboard/alerts-panel";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, LoadingScreen } from "@/components/ui/empty-state";
import { periodSummary, buildCashflowSeries, buildForecast, lowestProjectedBalance } from "@/lib/analytics";
import { computeAlerts } from "@/lib/alerts";
import { daysAgoISO, todayISO, formatDate } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { Bot } from "lucide-react";

export default function DashboardPage() {
  const { transactions, accounts, recurring, business, loading } = useBusiness();
  const { profile } = useAuth();
  const [range, setRange] = useState(30);

  const currency = business?.currency ?? profile?.currency ?? "USD";

  const summary = useMemo(() => {
    if (!transactions.length && !accounts.length) return null;
    return periodSummary(accounts, transactions, daysAgoISO(29), todayISO());
  }, [accounts, transactions]);

  const series = useMemo(() => buildCashflowSeries(accounts, transactions, range), [accounts, transactions, range]);

  const alerts = useMemo(() => {
    if (!business) return [];
    return computeAlerts(accounts, transactions, recurring, profile?.lowBalanceThreshold ?? 50000, currency);
  }, [accounts, transactions, recurring, business, profile, currency]);

  const forecast = useMemo(() => buildForecast(accounts, transactions, recurring, 30), [accounts, transactions, recurring]);
  const lowest = lowestProjectedBalance(forecast);

  if (loading || !business) return <LoadingScreen label="Loading your cash flow..." />;

  if (transactions.length === 0) {
    return (
      <div className="space-y-6" data-tour="dashboard">
        <EmptyState
          icon={<Bot size={28} />}
          title="Welcome to Cashflow Copilot"
          description="Add your first transaction or import a bank CSV to get AI-powered insights about your business."
          action={
            <div className="flex gap-3">
              <Link href="/transactions">
                <span className="inline-flex h-10 items-center justify-center rounded-lg bg-emerald-500 px-4 text-sm font-medium text-white hover:bg-emerald-600">
                  Add a transaction
                </span>
              </Link>
              <Link href="/import">
                <span className="inline-flex h-10 items-center justify-center rounded-lg bg-white px-4 text-sm font-medium text-zinc-900 ring-1 ring-inset ring-zinc-300 hover:bg-zinc-50 dark:bg-zinc-800 dark:text-zinc-100 dark:ring-zinc-700">
                  Import CSV
                </span>
              </Link>
            </div>
          }
        />
        <AlertsPanel alerts={alerts} />
      </div>
    );
  }

  return (
    <motion.div
      className="space-y-6"
      data-tour="dashboard"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Cash flow at a glance</h1>
          <p className="text-sm text-zinc-500">Here&apos;s how your money is moving.</p>
        </div>
        <Link
          href="/copilot"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 text-sm font-medium text-white transition-colors hover:bg-emerald-600"
        >
          <Bot size={16} />
          Ask your Copilot
        </Link>
      </div>

      {summary && <SummaryCards summary={summary} currency={currency} />}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <CashflowChart points={series} currency={currency} onRangeChange={setRange} />
        </div>
        <div>
          <Card className="mb-4">
            <CardHeader>
              <CardTitle>30-day outlook</CardTitle>
            </CardHeader>
            {lowest && lowest.value < 0 ? (
              <div>
                <p className="text-3xl font-bold text-red-500">{formatMoney(lowest.value, currency)}</p>
                <p className="mt-1 text-sm text-zinc-500">
                  Projected to hit this low around{" "}
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">{formatDate(lowest.date)}</span>.
                  Consider delaying big purchases or chasing receivables.
                </p>
              </div>
            ) : (
              <div>
                <p className="text-3xl font-bold text-emerald-500">
                  {lowest ? formatMoney(lowest.value, currency) : "—"}
                </p>
                <p className="mt-1 text-sm text-zinc-500">
                  Lowest projected balance over the next 30 days. Looking good.
                </p>
              </div>
            )}
            <Link
              href="/copilot"
              className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-emerald-600 hover:underline dark:text-emerald-400"
            >
              Get the full forecast
              <ArrowRight size={14} />
            </Link>
          </Card>
          <AlertsPanel alerts={alerts.filter((a) => a.type !== "cashCrunch")} />
        </div>
      </div>

      <RecentTransactions transactions={transactions} currency={currency} />
    </motion.div>
  );
}