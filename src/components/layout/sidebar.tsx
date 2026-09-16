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
import { useBusiness } from "@/components/providers/business-provider";
import type { AccountType } from "@/types";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/transactions", label: "Transactions", icon: ArrowLeftRight },
  { href: "/import", label: "Import", icon: Upload },
  { href: "/recurring", label: "Recurring", icon: Repeat },
  { href: "/accounts", label: "Accounts", icon: Wallet },
  { href: "/categories", label: "Categories", icon: Tag },
  { href: "/copilot", label: "Copilot", icon: Bot },
];

const accountIcons: Record<AccountType, typeof Landmark> = {
  bank: Landmark,
  cash: Banknote,
  credit: CreditCard,
};

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { business, accounts } = useBusiness();

  return (
    <div className="flex h-full flex-col">
      <Link href="/dashboard" className="flex items-center gap-2 px-5 py-5" onClick={onNavigate}>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500 text-sm font-bold text-white">
          C
        </div>
        <div className="leading-tight">
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Cashflow Copilot</p>
          <p className="text-xs text-zinc-500">{business?.name ?? ""}</p>
        </div>
      </Link>

      <nav className="flex-1 space-y-1 px-3 py-2">
        {NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
              )}
            >
              <Icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-zinc-200 px-3 py-3 dark:border-zinc-800">
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