"use client";

import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, ArrowLeftRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/dates";
import { categoryName, vendorName } from "@/lib/lookup";
import { useBusiness } from "@/components/providers/business-provider";
import type { Transaction, TxType } from "@/types";

const typeMeta: Record<
  TxType,
  { icon: typeof ArrowDownLeft; accent: string; bg: string; label: string }
> = {
  income: { icon: ArrowDownLeft, accent: "text-sky-600 dark:text-sky-400", bg: "bg-sky-500/10", label: "In" },
  expense: { icon: ArrowUpRight, accent: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10", label: "Out" },
  transfer: { icon: ArrowLeftRight, accent: "text-zinc-500", bg: "bg-zinc-500/10", label: "Transfer" },
};

export function TransactionRow({ transaction, currency }: { transaction: Transaction; currency: string }) {
  const { categories, vendors } = useBusiness();
  const meta = typeMeta[transaction.type];
  const Icon = meta.icon;
  const displayName = vendorName(vendors, transaction.vendorId) || categoryName(categories, transaction.categoryId) || transaction.notes || transaction.type;

  return (
    <Link
      href={`/transactions?edit=${transaction.id}`}
      className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
    >
      <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full", meta.bg, meta.accent)}>
        <Icon size={16} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">{displayName}</p>
        <p className="text-xs text-zinc-500">
          {formatDate(transaction.date)}
          {categoryName(categories, transaction.categoryId) !== "Uncategorized" && ` · ${categoryName(categories, transaction.categoryId)}`}
          {meta.label !== "Transfer" && ` · ${meta.label}`}
        </p>
      </div>
      <p
        className={cn(
          "shrink-0 text-sm font-semibold tabular-nums",
          transaction.type === "income"
            ? "text-emerald-600 dark:text-emerald-400"
            : transaction.type === "expense"
              ? "text-zinc-900 dark:text-zinc-100"
              : "text-zinc-400"
        )}
      >
        {transaction.type === "income" ? "+" : transaction.type === "expense" ? "−" : "↔ "}
        {formatMoney(transaction.amount, currency)}
      </p>
    </Link>
  );
}