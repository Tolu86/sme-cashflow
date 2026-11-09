"use client";

import { PageHeader } from "@/components/ui/page-header";
import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, CalendarDays, Download, Sparkles, ShieldCheck, TrendingUp, Wallet, Activity } from "lucide-react";
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
      <div className="space-y-7" data-tour="dashboard">
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
      className="space-y-7 pb-10"
      data-tour="dashboard"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <section className="relative overflow-hidden rounded-[28px] bg-[#0e2130] px-6 py-8 text-white shadow-xl shadow-slate-900/10 sm:px-9 sm:py-10">
        <div className="pointer-events-none absolute -right-20 -top-32 h-80 w-80 rounded-full bg-emerald-400/10 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-300">
              <Activity size={13} /> Financial workspace
            </div>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Your business, in focus.</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300 sm:text-base">
              Monitor your cash position, anticipate what comes next, and make every financial decision with confidence.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <span className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-2.5 text-xs font-medium text-slate-200">
              <CalendarDays size={15} /> Last 30 days
            </span>
            <Link href="/copilot" className="inline-flex items-center gap-2 rounded-xl bg-[#00c076] px-5 py-2.5 text-sm font-semibold text-[#08291c] transition hover:bg-emerald-300">
              <Sparkles size={16} /> Ask Copilot <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-400">Overview</p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-900 dark:text-white">Financial health</h2>
        </div>
        <Link href="/transactions" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:border-emerald-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
          <Download size={15} /> Transaction history
        </Link>
      </div>

      {summary && (
        <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-3 sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:px-0 sm:pb-0 xl:grid-cols-4">
          {[
            { label: "Current cash balance", value: summary.currentBalance, icon: Wallet, tone: "emerald" },
            { label: "Cash inflow · 30 days", value: summary.income, icon: ArrowUpRight, tone: "sky" },
            { label: "Cash outflow · 30 days", value: summary.expense, icon: Activity, tone: "amber" },
            { label: "Net cash flow · 30 days", value: summary.net, icon: TrendingUp, tone: "emerald" },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="group min-w-[235px] flex-[0_0_82%] snap-start rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-[#142333] sm:min-w-0 sm:flex-auto">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{item.label}</p>
                  <span className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-400"><Icon size={17} /></span>
                </div>
                <p className="mt-6 break-words text-2xl font-semibold tabular-nums tracking-tight text-slate-900 dark:text-white">{formatMoney(item.value, currency)}</p>
                <div className="mt-5 h-1 w-12 rounded-full bg-emerald-400/80" />
              </div>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        <div className="min-w-0 xl:col-span-8">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Cash trajectory</h2>
              <p className="mt-1 text-xs text-slate-500">Your actual balance movement over time</p>
            </div>
            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600"><ShieldCheck size={14} /> Live data</span>
          </div>
          <CashflowChart points={series} currency={currency} onRangeChange={setRange} />
        </div>
        <div className="min-w-0 space-y-4 xl:col-span-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Forward outlook</h2>
            <p className="mt-1 text-xs text-slate-500">Projected minimum balance, next 30 days</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#142333]">
            <span className="inline-flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300">
              <TrendingUp size={15} /> Forecast snapshot
            </span>
            <p className={`mt-6 break-words text-3xl font-semibold tracking-tight ${lowest && lowest.value < 0 ? "text-red-500" : "text-slate-900 dark:text-white"}`}>
              {lowest ? formatMoney(lowest.value, currency) : "—"}
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
              {lowest && lowest.value < 0 ? "Potential cash shortfall" : "Lowest projected cash balance"}
              {lowest ? ` around ${formatDate(lowest.date)}.` : "."}
            </p>
            <Link href="/copilot" className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-emerald-600 hover:underline dark:text-emerald-400">
              Explore with Copilot <ArrowRight size={16} />
            </Link>
          </div>
          <AlertsPanel alerts={alerts.filter((a) => a.type !== "cashCrunch")} />
        </div>
      </div>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        <div className="min-w-0 xl:col-span-8">
          <div className="mb-3">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Live transaction stream</h2>
            <p className="mt-1 text-xs text-slate-500">Your most recent business activity</p>
          </div>
          <RecentTransactions transactions={transactions} currency={currency} />
        </div>
        <div className="xl:col-span-4">
          <div className="rounded-2xl border border-emerald-200 bg-[#eaf8f1] p-6 dark:border-emerald-900 dark:bg-[#102b27]">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500 text-white"><Bot size={22} /></div>
            <h3 className="mt-5 text-xl font-semibold tracking-tight text-slate-900 dark:text-white">Your treasury copilot</h3>
            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">Ask questions about spending, forecast cash flow, and find opportunities to improve your finances.</p>
            <Link href="/copilot" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#0e2130] px-4 py-3 text-sm font-semibold text-white hover:bg-[#1c3b48]">
              Open Copilot <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>
    </motion.div>
  );
}
