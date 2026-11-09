"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Wallet,
  Tag,
  Repeat,
  Upload,
  Bot,
  Settings,
  Landmark,
  Banknote,
  CreditCard,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { motion } from "framer-motion";
import { useBusiness } from "@/components/providers/business-provider";
import { can, type PlanFeature } from "@/lib/plans";
import type { AccountType } from "@/types";

const NAV: { href: string; label: string; icon: typeof LayoutDashboard; feature: PlanFeature }[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, feature: "dashboard" },
  { href: "/transactions", label: "Transactions", icon: ArrowLeftRight, feature: "transactions" },
  { href: "/import", label: "Import", icon: Upload, feature: "import" },
  { href: "/recurring", label: "Recurring", icon: Repeat, feature: "recurring" },
  { href: "/accounts", label: "Accounts", icon: Wallet, feature: "accounts" },
  { href: "/categories", label: "Categories", icon: Tag, feature: "categories" },
  { href: "/copilot", label: "Copilot", icon: Bot, feature: "copilot" },
];

const accountIcons: Record<AccountType, typeof Landmark> = {
  bank: Landmark,
  cash: Banknote,
  credit: CreditCard,
};

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { business, accounts } = useBusiness();
  const visible = NAV.filter((item) => can(business?.plan, item.feature, business?.trialEndsAt));
  const locked = NAV.length - visible.length;

  return (
    <div className="flex h-full flex-col bg-white dark:bg-[#111c2d]">
      <Link href="/dashboard" className="flex items-center gap-2 px-5 py-5" onClick={onNavigate}>
        <div className="flex h-14 w-14 shrink-0 items-center justify-center">
          <img
            src="/Logo.png"
            alt="Cashflow Copilot"
            className="h-full w-full object-contain"
          />
        </div>
        <div className="leading-tight">
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Cashflow Copilot</p>
          <p className="text-xs text-zinc-500">{business?.name ?? ""}</p>
        </div>
      </Link>

      <motion.nav
        className="flex-1 space-y-1 px-3 py-2"
        initial={{ opacity: 0, x: -6 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        {visible.map((item, idx) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <motion.div
              key={item.href}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, delay: 0.05 * idx, ease: "easeOut" }}
            >
              <Link
                href={item.href}
                data-tour={`nav-${item.href}`}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-emerald-50 text-emerald-800 ring-1 ring-inset ring-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300 dark:ring-emerald-900"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/70 dark:hover:text-slate-100"
                )}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            </motion.div>
          );
        })}
      </motion.nav>

      <div className="border-t border-slate-200/80 px-3 py-3 dark:border-slate-800">
        <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
          Accounts
        </p>
        <div className="space-y-0.5">
          {accounts.map((a) => {
            const Icon = accountIcons[a.type] ?? Landmark;
            return (
              <Link
                key={a.id}
                href="/accounts"
                onClick={onNavigate}
                className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                <Icon size={14} className="text-zinc-400" />
                {a.name}
              </Link>
            );
          })}
        </div>
        <Link
          href="/settings"
          onClick={onNavigate}
          className="mt-2 flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
        >
          <Settings size={18} />
          Settings
        </Link>
      </div>
    </div>
  );
}
const MOBILE_NAV = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, feature: "dashboard" as PlanFeature },
  { href: "/transactions", label: "Activity", icon: ArrowLeftRight, feature: "transactions" as PlanFeature },
  { href: "/accounts", label: "Accounts", icon: Wallet, feature: "accounts" as PlanFeature },
  { href: "/copilot", label: "Copilot", icon: Bot, feature: "copilot" as PlanFeature },
];

export function MobileNavigation() {
  const pathname = usePathname();
  const { business } = useBusiness();
  const visible = MOBILE_NAV.filter((item) =>
    can(business?.plan, item.feature, business?.trialEndsAt)
  );
  return (
    <nav
      aria-label="Mobile primary navigation"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200/90 bg-white/95 px-2 pt-2 shadow-[0_-8px_28px_rgba(15,23,42,0.06)] backdrop-blur-xl dark:border-slate-800 dark:bg-[#111c2d]/95 lg:hidden"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom), 8px)" }}
    >
      <div className="mx-auto flex max-w-lg items-center justify-around gap-1">
        {visible.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-1 py-2 text-[11px] font-medium transition-colors",
                active
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                  : "text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800"
              )}
            >
              <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
              <span>{item.label}</span>
            </Link>
          );
        })}
        <Link
          href="/settings"
          aria-current={pathname.startsWith("/settings") ? "page" : undefined}
          className={cn(
            "flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-1 py-2 text-[11px] font-medium",
            pathname.startsWith("/settings")
              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
              : "text-slate-500 dark:text-slate-400"
          )}
        >
          <Settings size={20} />
          <span>Settings</span>
        </Link>
      </div>
    </nav>
  );
}
