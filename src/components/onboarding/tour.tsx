"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  ArrowLeftRight,
  Bot,
  Check,
  LayoutDashboard,
  Repeat,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/components/providers/auth-provider";
import { useBusiness } from "@/components/providers/business-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

interface TourStep {
  id: string;
  title: string;
  body: string;
  href?: string;
  target?: string;
  icon: typeof Sparkles;
}

const STEPS: TourStep[] = [
  {
    id: "welcome",
    title: "Welcome to Cashflow Copilot",
    body: "Your cash flow command center — real-time balances, smart forecasting, and an AI copilot that knows your numbers. Let's take a quick tour.",
    icon: Sparkles,
  },
  {
    id: "dashboard",
    title: "Your money at a glance",
    body: "This is your dashboard: cash on hand, money in, money out, your 30-day outlook, and alerts if cash is about to get tight.",
    href: "/dashboard",
    target: "[data-tour='dashboard']",
    icon: LayoutDashboard,
  },
  {
    id: "transactions",
    title: "Log every transaction",
    body: "Transactions is where each sale and purchase gets recorded, tagged, and categorized — the foundation of every forecast.",
    target: "[data-tour='nav-/transactions']",
    icon: ArrowLeftRight,
  },
  {
    id: "import",
    title: "Import your bank CSV",
    body: "Paste a bank CSV into Import and Copilot auto-categorizes the rows for you. No more data entry marathons.",
    target: "[data-tour='nav-/import']",
    icon: Upload,
  },
  {
    id: "recurring",
    title: "Repeating bills & income",
    body: "Rent, payroll, subscriptions — tell Copilot what repeats and it will warn you before a payment breaks your cash flow.",
    target: "[data-tour='nav-/recurring']",
    icon: Repeat,
  },
  {
    id: "copilot",
    title: "Meet your Copilot",
    body: "This chat knows your transactions, forecast, and bills. Ask things like \"How much did I spend this month?\" or \"When will I run out of cash?\"",
    href: "/copilot",
    target: "[data-tour='copilot-input']",
    icon: Bot,
  },
  {
    id: "done",
    title: "You're all set!",
    body: "Start by adding your first transaction or importing a bank CSV. Copilot has your back from here.",
    icon: Check,
  },
];

interface Pos {
  top: number;
  left: number;
}

export function OnboardingTour() {
  const { profile, refreshProfile } = useAuth();
  const { business } = useBusiness();
  const router = useRouter();
  const pathname = usePathname();

  const [index, setIndex] = useState(0);
  const [rects, setRects] = useState<Record<string, DOMRect | null>>({});
  const [pos, setPos] = useState<Pos>({ top: 20, left: 20 });
  const [hidden, setHidden] = useState(false);
  const [saving, setSaving] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const show = !hidden && !!business && !!profile?.businessId && !profile?.tourCompleted;
  const step = STEPS[index];
  const isLast = index === STEPS.length - 1;
  const StepIcon = step.icon;
  const rect = rects[step.id] ?? null;

  const finish = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    if (profile?.uid && db) {
      setDoc(doc(db, "users", profile.uid), { tourCompleted: true }, { merge: true })
        .then(() => refreshProfile())
        .catch(() => {})
        .finally(() => setSaving(false));
    } else {
      setSaving(false);
    }
    setHidden(true);
  }, [profile, saving, refreshProfile]);

  useEffect(() => {
    if (!show) return;

    if (step.href && pathname !== step.href) {
      router.push(step.href);
      return;
    }

    const t = setTimeout(() => {
      if (step.target) {
        const el = document.querySelector<HTMLElement>(step.target);
        if (el) {
          el.scrollIntoView({ block: "center", behavior: "smooth" });
          setRects((prev) => ({ ...prev, [step.id]: el.getBoundingClientRect() }));
          return;
        }
      }
      setRects((prev) => ({ ...prev, [step.id]: null }));
    }, 450);

    return () => clearTimeout(t);
  }, [show, index, step, pathname, router]);

  useEffect(() => {
    if (!show || !step.target) return;
    const target = step.target;
    const recompute = () => {
      const el = document.querySelector<HTMLElement>(target);
      if (el) setRects((prev) => ({ ...prev, [step.id]: el.getBoundingClientRect() }));
    };
    window.addEventListener("resize", recompute);
    window.addEventListener("scroll", recompute, { capture: true, passive: true });
    return () => {
      window.removeEventListener("resize", recompute);
      window.removeEventListener("scroll", recompute, true);
    };
  }, [show, step]);

  useEffect(() => {
    if (!show) return;
    const card = cardRef.current;
    const w = card?.offsetWidth ?? 340;
    const h = card?.offsetHeight ?? 220;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const gap = 14;
    const pad = 16;

    if (!rect) {
      setPos({ top: Math.max(pad, vh / 2 - h / 2), left: Math.max(pad, vw / 2 - w / 2) });
      return;
    }

    const placeBelow = rect.bottom + h + gap < vh;
    const top = placeBelow
      ? rect.bottom + gap
      : Math.max(pad, rect.top - h - gap);
    const left = Math.min(Math.max(pad, rect.left + rect.width / 2 - w / 2), vw - w - pad);
    setPos({ top, left });
  }, [show, rect, index]);

  useEffect(() => {
    if (!show) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish();
      if (e.key === "ArrowRight") setIndex((i) => Math.min(STEPS.length - 1, i + 1));
      if (e.key === "ArrowLeft") setIndex((i) => Math.max(0, i - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [show, finish]);

  if (!show) return null;

  return (
    <>
      <div className="fixed inset-0 z-40" aria-hidden="true">
        {rect ? (
          <div
            className="absolute rounded-xl ring-2 ring-emerald-400/80"
            style={{
              top: rect.top,
              left: rect.left,
              width: rect.width,
              height: rect.height,
              boxShadow: "0 0 0 9999px rgba(15, 23, 42, 0.6)",
            }}
          />
        ) : (
          <div className="absolute inset-0 bg-zinc-950/60" />
        )}
      </div>

      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-label={step.title}
        className="fixed z-50 w-[340px] max-w-[calc(100vw-2rem)] rounded-xl border border-zinc-200 bg-white p-5 shadow-2xl dark:border-zinc-700 dark:bg-zinc-900"
        style={{ top: pos.top, left: pos.left }}
      >
        <div className="mb-3 flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500 text-white">
              <StepIcon size={16} />
            </div>
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
              Step {index + 1} of {STEPS.length}
            </p>
          </div>
          <button
            onClick={finish}
            disabled={saving}
            className="rounded-lg p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800"
            aria-label="Skip tour"
          >
            <X size={16} />
          </button>
          <span className="sr-only">{isLast ? "Finish tour" : "Skip tour"}</span>
        </div>

        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">{step.title}</h3>
        <p className="mt-1 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">{step.body}</p>

        <div className="mt-5 flex items-center justify-between">
          <div className="flex gap-1.5">
            {STEPS.map((s, i) => (
              <span
                key={s.id}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === index ? "w-5 bg-emerald-500" : "w-1.5 bg-zinc-300 dark:bg-zinc-700"
                )}
              />
            ))}
          </div>
          <div className="flex gap-2">
            {index > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setIndex((i) => i - 1)} disabled={saving}>
                <ArrowLeft size={14} />
                Back
              </Button>
            )}
            {isLast ? (
              <Button size="sm" onClick={finish} loading={saving}>
                <Check size={14} />
                Get started
              </Button>
            ) : (
              <Button size="sm" onClick={() => setIndex((i) => i + 1)}>
                Next
                <ArrowRight size={14} />
              </Button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}