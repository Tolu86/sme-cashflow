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

  return (
    <div className="flex h-full flex-col bg-[#0e2130] text-slate-100">
      <Link href="/dashboard" className="flex items-center gap-3 border-b border-white/10 px-5 py-6 transition-colors hover:bg-white/[0.03]" onClick={onNavigate}>
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 p-1 ring-1 ring-white/10">
          <img
            src="/Logo.png"
            alt="Cashflow Copilot"
            className="h-full w-full object-contain"
          />
        </div>
        <div className="leading-tight">
          <p className="text-sm font-semibold tracking-tight text-white">Cashflow Copilot</p>
          <p className="max-w-[145px] truncate text-xs text-slate-400">{business?.name ?? ""}</p>
        </div>
      </Link>

      <motion.nav
        className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-5"
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
                  "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#00c076]",
                  active
                    ? "bg-[#00c076]/15 text-[#65f0b0] ring-1 ring-inset ring-[#00c076]/25 shadow-[inset_3px_0_0_#00c076]"
                    : "text-slate-300 hover:bg-white/10 hover:text-white"
                )}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            </motion.div>
          );
        })}
      </motion.nav>

      <div className="border-t border-white/10 bg-black/10 px-3 py-4">
        <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
          Accounts
        </p>
        <div className="max-h-36 space-y-0.5 overflow-y-auto">
          {accounts.map((a) => {
            const Icon = accountIcons[a.type] ?? Landmark;
            return (
              <Link
                key={a.id}
                href="/accounts"
                onClick={onNavigate}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
              >
                <Icon size={14} className="text-emerald-300/70" />
                {a.name}
              </Link>
            );
          })}
        </div>
        <Link
          href="/settings"
          onClick={onNavigate}
          className={cn("mt-2 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors", pathname.startsWith("/settings") ? "bg-[#00c076]/15 text-[#65f0b0] ring-1 ring-inset ring-[#00c076]/25" : "text-slate-300 hover:bg-white/10 hover:text-white")}
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
      className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-[#0e2130]/95 px-2 pt-2 shadow-[0_-8px_28px_rgba(15,23,42,0.15)] backdrop-blur-xl lg:hidden"
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
                  ? "bg-[#00c076]/15 text-[#65f0b0]"
                  : "text-slate-300 hover:bg-white/10 hover:text-white"
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
              ? "bg-[#00c076]/15 text-[#65f0b0]"
              : "text-slate-300 hover:bg-white/10 hover:text-white"
          )}
        >
          <Settings size={20} />
          <span>Settings</span>
        </Link>
      </div>
    </nav>
  );
}
