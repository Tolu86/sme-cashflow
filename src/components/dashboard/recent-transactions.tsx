"use client";

import Link from "next/link";
import { ArrowLeftRight } from "lucide-react";
import { TransactionRow } from "@/components/transactions/transaction-row";
import type { Transaction } from "@/types";
import { EmptyState } from "@/components/ui/empty-state";

export function RecentTransactions({
  transactions,
  currency,
}: {
  transactions: Transaction[];
  currency: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Recent activity</h3>
        <Link href="/transactions" className="text-xs font-medium text-emerald-600 hover:underline dark:text-emerald-400">
          View all
        </Link>
      </div>
      <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {transactions.length === 0 ? (
          <EmptyState
            className="border-0"
            icon={<ArrowLeftRight size={28} />}
            title="No transactions yet"
            description="Add your first income or expense to start building your cash flow picture."
          />
        ) : (
          transactions.slice(0, 8).map((t) => <TransactionRow key={t.id} transaction={t} currency={currency} />)
        )}
      </div>
    </div>
  );
}