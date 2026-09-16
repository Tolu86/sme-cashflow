"use client";

import Link from "next/link";
import { ArrowRight, Sparkles, TrendingDown, TrendingUp, Bot, UploadCloud, TriangleAlert, Repeat } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";

const FEATURES = [
  { icon: Bot, title: "AI Copilot", desc: "Chat with your money. Ask questions like \"when does my cash run dry?\" and get clear answers." },
  { icon: TrendingUp, title: "Cash flow forecasts", desc: "See your projected balance 30-90 days out, powered by your history and recurring bills." },
  { icon: UploadCloud, title: "Bank import", desc: "Drop in a CSV statement and let AI categorize every row for you." },
  { icon: TriangleAlert, title: "Smart alerts", desc: "Low balance, upcoming bills, and cash crunch warnings before they surprise you." },
  { icon: Repeat, title: "Recurring bills", desc: "Track subscriptions, payroll, rent, and invoices that repeat on a schedule." },
  { icon: TrendingDown, title: "Anomaly detection", desc: "Spot unusual spending patterns that could signal waste or fraud." },
];

export default function HomePage() {
  const { user } = useAuth();

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/80">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500 text-sm font-bold text-white">
              C
            </div>
            <span className="text-sm font-semibold">Cashflow Copilot</span>
          </div>
          <div className="flex items-center gap-3">
            {user ? (
              <Link href="/dashboard">
                <Button>
                  Open app
                  <ArrowRight size={16} />
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost">Sign in</Button>
                </Link>
                <Link href="/signup">
                  <Button>Get started</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto max-w-6xl px-4 py-20 text-center sm:px-6 sm:py-28">
          <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-xs font-medium text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-400">
            <Sparkles size={14} />
            AI-powered cash flow intelligence
          </div>
          <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight text-zinc-900 sm:text-6xl dark:text-zinc-50">
            Never run out of cash.
            <span className="block text-emerald-500">Know exactly where you stand.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-zinc-500">
            The cash flow copilot for small businesses. Track income and expenses, forecast your
            runway, and get instant answers from your AI assistant.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href={user ? "/dashboard" : "/signup"}>
              <Button size="lg">
                Start for free
                <ArrowRight size={18} />
              </Button>
            </Link>
            {!user && (
              <Link href="/login">
                <Button variant="secondary" size="lg">
                  View a live demo workspace
                </Button>
              </Link>
            )}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
                    <Icon size={20} />
                  </div>
                  <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">{f.title}</h3>
                  <p className="mt-1 text-sm text-zinc-500">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      <footer className="border-t border-zinc-200 py-8 dark:border-zinc-800">
        <p className="text-center text-sm text-zinc-400">Cashflow Copilot — built for small business owners.</p>
      </footer>
    </div>
  );
}