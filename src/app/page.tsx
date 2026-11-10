"use client";

import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  Bot,
  Check,
  CheckCircle2,
  ChevronRight,
  FileUp,
  Landmark,
  LayoutDashboard,
  Repeat2,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";

const FEATURES = [
  {
    icon: Bot,
    title: "AI Copilot",
    description: "Ask questions about your business finances in plain English and explore the answers.",
    detail: "Ask your questions",
    tone: "emerald",
  },
  {
    icon: TrendingUp,
    title: "Cash flow forecasts",
    description: "Review projected balances based on your transaction history and recurring commitments.",
    detail: "30–90 day outlooks",
    tone: "sky",
  },
  {
    icon: FileUp,
    title: "AI receipt photo import",
    description: "Upload receipts as images, review extracted purchases, and categorize expenses in your business workspace.",
    detail: "Scan and categorize",
    tone: "emerald",
  },
  {
    icon: ShieldAlert,
    title: "Smart cash alerts",
    description: "See low-balance warnings and upcoming obligations before they catch you off guard.",
    detail: "Stay prepared",
    tone: "amber",
  },
  {
    icon: Repeat2,
    title: "Recurring payment tracking",
    description: "Keep tabs on bills, subscriptions, rent, and other repeating business expenses.",
    detail: "Know what's due",
    tone: "sky",
  },
  {
    icon: Wallet,
    title: "Account overview",
    description: "Understand how money moves through your accounts from one clear dashboard.",
    detail: "See the big picture",
    tone: "emerald",
  },
];

const PREVIEW_METRICS = [
  { label: "Cash balance", value: "$142,850", detail: "Sample account", icon: Wallet },
  { label: "Cash in · 30 days", value: "$48,320", detail: "Illustrative income", icon: ArrowDownLeft },
  { label: "Cash out · 30 days", value: "$29,120", detail: "Illustrative expenses", icon: ArrowUpRight },
  { label: "Net cash flow", value: "+$19,200", detail: "Example period", icon: TrendingUp },
];

function Brand() {
  return (
    <Link href="/" className="inline-flex items-center gap-2.5" aria-label="Cashflow Copilot home">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white p-0.5 ring-1 ring-slate-200/80 shadow-sm">
        <img src="/Logo.png" alt="" width={40} height={40} className="h-full w-full object-contain" />
      </span>
      <span className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">Cashflow Copilot</span>
    </Link>
  );
}

function DashboardPreview() {
  return (
    <div id="preview" className="scroll-mt-24 overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_22px_65px_-28px_rgba(15,23,42,0.32)] dark:border-slate-700 dark:bg-[#111c2d]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-4 dark:border-slate-800 sm:px-6">
        <div className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
          <div className="flex items-center gap-1.5 pr-2">
            <i className="h-2.5 w-2.5 rounded-full bg-rose-300" />
            <i className="h-2.5 w-2.5 rounded-full bg-amber-300" />
            <i className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
          </div>
          <Landmark size={15} className="text-emerald-600" />
          <span>Example business workspace</span>
        </div>
        <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
          Illustrative sample data
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2.5 p-4 sm:grid-cols-4 sm:gap-3 sm:p-6">
        {PREVIEW_METRICS.map((metric) => {
          const Icon = metric.icon;
          return (
            <div key={metric.label} className="min-w-0 rounded-2xl bg-[#f4f7fc] p-3.5 dark:bg-[#192b3b] sm:p-5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] font-medium leading-4 text-slate-500 sm:text-xs dark:text-slate-400">{metric.label}</p>
                <Icon size={15} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
              </div>
              <p className="mt-3 break-words text-lg font-bold tabular-nums tracking-tight text-slate-900 dark:text-white sm:text-2xl">{metric.value}</p>
              <p className="mt-1 text-[10px] text-slate-500 sm:text-xs dark:text-slate-400">{metric.detail}</p>
            </div>
          );
        })}
      </div>

      <div className="grid gap-4 px-4 pb-4 sm:px-6 sm:pb-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(260px,1fr)]">
        <div className="rounded-2xl border border-slate-100 bg-white p-4 dark:border-slate-700 dark:bg-[#142333] sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Cash flow trajectory</h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Visualize your changing cash position</p>
            </div>
            <div className="flex gap-1 rounded-lg bg-slate-100 p-1 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              <span className="rounded-md bg-white px-2 py-1 shadow-sm dark:bg-slate-700">30D</span>
              <span className="px-2 py-1">60D</span>
              <span className="px-2 py-1">90D</span>
            </div>
          </div>
          <svg className="mt-5 w-full" viewBox="0 0 620 220" role="img" aria-label="Illustrative upward cash balance chart, not live financial data">
            <defs>
              <linearGradient id="preview-forecast-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d="M0 40H620 M0 88H620 M0 136H620 M0 184H620" stroke="#dce7e9" strokeDasharray="4 8" strokeWidth="1" />
            <path d="M8 187 C85 183 121 165 175 150 S248 143 306 118 S401 93 467 70 S551 49 612 31 L612 211 L8 211Z" fill="url(#preview-forecast-fill)" />
            <path d="M8 187 C85 183 121 165 175 150 S248 143 306 118 S401 93 467 70 S551 49 612 31" stroke="#00a96a" strokeWidth="4" strokeLinecap="round" fill="none" />
            <path d="M8 187 L97 178 L164 184 L225 155 L287 151 L352 132 L407 117 L480 103 L548 79 L612 69" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" fill="none" strokeDasharray="8 7" opacity="0.5" />
            <circle cx="612" cy="31" r="5" fill="#00c076" stroke="white" strokeWidth="3" />
          </svg>
          <div className="flex items-center justify-between text-[10px] font-medium text-slate-400 sm:text-xs">
            <span>Today</span>
            <span>Day 45</span>
            <span>Day 90</span>
          </div>
          <p className="mt-4 flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
            <span className="h-2 w-2 rounded-full bg-emerald-500" /> Sample chart for visual demonstration only
          </p>
        </div>
        <div className="flex flex-col rounded-2xl bg-[#f1f6ff] p-4 dark:bg-[#192b3b] sm:p-6">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#00c076] text-white"><Bot size={17} /></span>
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">AI Copilot</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Example conversation</p>
            </div>
          </div>
          <div className="mt-5 self-end rounded-2xl rounded-br-md bg-[#006d41] px-4 py-3 text-xs leading-5 text-white">
            Can you help me understand next month's cash position?
          </div>
          <div className="mt-3 rounded-2xl rounded-bl-md bg-white px-4 py-3 text-xs leading-5 text-slate-700 shadow-sm dark:bg-[#0e2130] dark:text-slate-200">
            <div className="mb-2 flex items-center gap-1.5 font-semibold text-emerald-600 dark:text-emerald-400">
              <Sparkles size={13} /> Copilot preview
            </div>
            Review your incoming payments and recurring expenses together to identify possible gaps ahead of time.
          </div>
          <div className="mt-auto pt-5">
            <Link href="/signup" className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:underline dark:text-emerald-300">
              Explore in your own workspace <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const { user } = useAuth();
  const appHref = user ? "/dashboard" : "/signup";

  return (
    <div className="min-h-screen bg-[#f8f9ff] text-slate-900 dark:bg-[#080f1c] dark:text-white">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-[#f8f9ff]/90 backdrop-blur-xl dark:border-slate-800 dark:bg-[#080f1c]/90">
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <Brand />
          <nav aria-label="Primary" className="hidden items-center gap-7 text-xs font-semibold text-slate-600 dark:text-slate-300 md:flex">
            <a href="#features" className="hover:text-emerald-600">Features</a>
            <a href="#how-it-works" className="hover:text-emerald-600">How it works</a>
            <a href="#preview" className="hover:text-emerald-600">Preview</a>
          </nav>
          <div className="flex items-center gap-2 sm:gap-4">
            {!user && (
              <Link href="/login" className="hidden text-xs font-semibold text-slate-600 hover:text-emerald-600 sm:inline dark:text-slate-300">Sign in</Link>
            )}
            <Link href={appHref} className="inline-flex items-center gap-1.5 rounded-lg bg-[#00c076] px-3 py-2.5 text-xs font-bold text-[#082b1b] shadow-sm transition hover:bg-emerald-300 sm:px-4">
              {user ? "Open app" : "Get started free"} <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="relative isolate overflow-hidden px-4 pb-10 pt-16 text-center sm:px-6 sm:pb-16 sm:pt-24">
          <div className="pointer-events-none absolute inset-x-1/4 -top-48 -z-10 h-[480px] rounded-full bg-emerald-200/30 blur-[110px] dark:bg-emerald-900/20" />
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-[11px] font-semibold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
            <Sparkles size={14} /> AI-powered cash flow intelligence
          </span>
          <h1 className="mx-auto mt-7 max-w-5xl text-[clamp(2.4rem,5vw,4.6rem)] font-bold leading-[1.09] tracking-[-0.04em]">
            Never run out of cash.
            <span className="block text-[#00bd75]">Know exactly where you stand.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-sm leading-7 text-slate-600 dark:text-slate-300 sm:text-lg">
            A clearer view of your small business finances. Track money in and out, see where your cash is heading, and get help from your AI Copilot.
          </p>
          <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
            <Link href={appHref} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#00c076] px-7 py-3 text-sm font-bold text-[#073c29] shadow-lg shadow-emerald-500/15 transition hover:bg-emerald-300">
              {user ? "Open your dashboard" : "Start for free"} <ArrowRight size={17} />
            </Link>
            <a href="#preview" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-7 py-3 text-sm font-semibold text-slate-800 transition hover:border-emerald-300 dark:border-slate-700 dark:bg-[#17263b] dark:text-white">
              <LayoutDashboard size={16} /> View dashboard preview
            </a>
          </div>
          <div className="mx-auto mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-[11px] font-medium text-slate-500 dark:text-slate-400 sm:text-xs">
            <span className="flex items-center gap-1.5"><CheckCircle2 size={14} className="text-emerald-600" /> Track accounts and transactions</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 size={14} className="text-emerald-600" /> Plan with cash forecasts</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 size={14} className="text-emerald-600" /> Ask your Copilot</span>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
          <DashboardPreview />
        </section>

        <section id="how-it-works" className="scroll-mt-24 border-y border-slate-200/70 bg-[#edf4ff] py-16 dark:border-slate-800 dark:bg-[#101e30] sm:py-24">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:items-center lg:gap-20 lg:px-8">
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-400">Built for real operations</p>
              <h2 className="max-w-xl text-3xl font-bold tracking-tight sm:text-4xl">Financial clarity without the spreadsheet nightmare.</h2>
              <p className="mt-5 max-w-xl text-sm leading-7 text-slate-600 dark:text-slate-300 sm:text-base">
                Your transactions, recurring expenses, and cash outlook belong in one place. Spend less time stitching reports together and more time understanding the decisions ahead.
              </p>
            </div>
            <div className="space-y-3">
              {[
                { title: "Add your purchases", text: "Upload receipt images, review the extracted amounts, and categorize purchases.", icon: FileUp },
                { title: "Track what matters", text: "Review accounts, recent transactions, upcoming bills, and current cash position.", icon: Landmark },
                { title: "Explore your next move", text: "Use your financial dashboard and Copilot to investigate trends and potential cash shortfalls.", icon: Sparkles },
              ].map((step, index) => {
                const Icon = step.icon;
                return (
                  <div key={step.title} className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-[#17263b]">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"><Icon size={20} /></span>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-400">Step {index + 1}</p>
                      <h3 className="mt-1 text-sm font-semibold">{step.title}</h3>
                      <p className="mt-1 text-xs leading-6 text-slate-600 dark:text-slate-400">{step.text}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section id="features" className="scroll-mt-24 mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">The essentials, together</span>
            <h2 className="mt-5 text-3xl font-bold tracking-tight sm:text-4xl">Everything you need to understand your cash flow.</h2>
            <p className="mt-4 text-sm leading-7 text-slate-500 dark:text-slate-400 sm:text-base">Useful financial tools for the day-to-day decisions that keep your business moving.</p>
          </div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <div key={feature.title} className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-emerald-200 hover:shadow-lg hover:shadow-emerald-950/5 dark:border-slate-800 dark:bg-[#142333]">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"><Icon size={21} /></span>
                  <h3 className="mt-6 text-base font-bold">{feature.title}</h3>
                  <p className="mt-2 flex-1 text-sm leading-6 text-slate-600 dark:text-slate-400">{feature.description}</p>
                  <div className="mt-6 flex items-center justify-between rounded-xl bg-[#f1f6ff] px-4 py-3 text-xs font-semibold text-slate-700 dark:bg-[#1b3044] dark:text-slate-200">
                    <span className="flex items-center gap-2"><Check size={14} className="text-emerald-600 dark:text-emerald-400" />{feature.detail}</span>
                    <ChevronRight size={15} className="text-slate-400 transition group-hover:translate-x-1" />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 sm:pb-24 lg:px-8">
          <div className="relative overflow-hidden rounded-[28px] bg-[#0e2130] px-6 py-12 text-center text-white shadow-xl sm:px-12 sm:py-16">
            <div className="pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full bg-[#00c076]/20 blur-[70px]" />
            <div className="relative">
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-[11px] font-semibold text-emerald-300"><Sparkles size={13} /> Turn numbers into decisions</span>
              <h2 className="mx-auto mt-5 max-w-3xl text-2xl font-bold tracking-tight sm:text-4xl">Cashflow Copilot — built for small business owners.</h2>
              <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-slate-300 sm:text-base">Bring your data into one workspace and get a clearer financial picture.</p>
              <Link href={appHref} className="mt-7 inline-flex items-center gap-2 rounded-xl bg-[#00c076] px-6 py-3.5 text-sm font-bold text-[#073c29] transition hover:bg-emerald-300">
                {user ? "Open your dashboard" : "Create your free account"} <ArrowRight size={17} />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-[#edf4ff] px-4 py-10 dark:border-slate-800 dark:bg-[#101e30] sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-6 sm:flex-row sm:items-center">
          <div>
            <Brand />
            <p className="mt-3 max-w-sm text-xs leading-6 text-slate-500 dark:text-slate-400">Simple, practical cash flow clarity for growing businesses.</p>
          </div>
          <nav aria-label="Footer" className="flex flex-wrap gap-5 text-xs font-medium text-slate-600 dark:text-slate-300">
            <a href="#features" className="hover:text-emerald-600">Features</a>
            <a href="#how-it-works" className="hover:text-emerald-600">How it works</a>
            <Link href={user ? "/dashboard" : "/login"} className="hover:text-emerald-600">{user ? "Dashboard" : "Sign in"}</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
