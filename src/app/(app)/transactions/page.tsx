"use client";

import { PageHeader } from "@/components/ui/page-header";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Plus, Search, ArrowLeftRight, Upload } from "lucide-react";
import { useBusiness } from "@/components/providers/business-provider";
import { LoadingScreen, EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { TransactionRow } from "@/components/transactions/transaction-row";
import { TransactionForm } from "@/components/transactions/transaction-form";
import { categoryName } from "@/lib/lookup";
import type { Transaction } from "@/types";

export default function TransactionsPage() {
  const { business, transactions, accounts, categories, loading } = useBusiness();
  const currency = business?.currency ?? "USD";

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [accountFilter, setAccountFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const handledEditRef = useRef(false);

  useEffect(() => {
    if (handledEditRef.current) return;
    const params = new URLSearchParams(window.location.search);
    const editId = params.get("edit");
    if (editId) {
      const tx = transactions.find((t) => t.id === editId);
      if (tx) {
        handledEditRef.current = true;
        setEditing(tx);
        setFormOpen(true);
        window.history.replaceState({}, "", "/transactions");
      }
    }
  }, [transactions]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...transactions]
      .filter((t) => {
        if (typeFilter && t.type !== typeFilter) return false;
        if (categoryFilter && t.categoryId !== categoryFilter) return false;
        if (accountFilter && t.accountId !== accountFilter) return false;
        if (startDate && t.date < startDate) return false;
        if (endDate && t.date > endDate) return false;
        if (minAmount && t.amount < Number(minAmount)) return false;
        if (maxAmount && t.amount > Number(maxAmount)) return false;
        if (q) {
          const haystack = [t.notes, t.tags.join(" "), categoryName(categories, t.categoryId)].join(" ").toLowerCase();
          if (!haystack.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
  if (sortBy === "highest") {
    return b.amount - a.amount;
  }

  return (
    b.date.localeCompare(a.date) ||
    b.createdAt - a.createdAt
  );
});
  }, [
  transactions,
  query,
  typeFilter,
  categoryFilter,
  accountFilter,
  startDate,
  endDate,
  minAmount,
  maxAmount,
  sortBy,
  categories,
]);

  if (loading || !business) return <LoadingScreen label="Loading transactions..." />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          title="Transactions"
          description="All the money coming in and going out."
        />
        <div className="flex gap-2">
          <Link href="/import">
            <Button variant="secondary">
              <Upload size={16} />
              Import CSV
            </Button>
          </Link>
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus size={16} />
            Add transaction
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 rounded-xl border border-zinc-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="lg:col-span-2">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search notes or tags..." className="pl-9" />
          </div>
        </div>
        <Select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          placeholder="All types"
          options={[
            { value: "income", label: "Income" },
            { value: "expense", label: "Expense" },
            { value: "transfer", label: "Transfers" },
          ]}
        />
        <Select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          placeholder="All categories"
          options={categories.map((c) => ({ value: c.id, label: c.name }))}
        />
        <Select
          value={accountFilter}
          onChange={(e) => setAccountFilter(e.target.value)}
          placeholder="All accounts"
          options={accounts.map((a) => ({ value: a.id, label: a.name }))}
        />
        <Select
  value={sortBy}
  onChange={(e) => setSortBy(e.target.value)}
  placeholder="Sort by"
  options={[
    { value: "newest", label: "Newest to oldest" },
    { value: "highest", label: "Highest amount to lowest" },
  ]}
/>
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 xl:col-span-2">
  <Input
    type="date"
    value={startDate}
    onChange={(e) => setStartDate(e.target.value)}
    className="min-w-0"
  />

  <span className="text-sm text-zinc-400">–</span>

  <Input
    type="date"
    value={endDate}
    onChange={(e) => setEndDate(e.target.value)}
    className="min-w-0"
  />
</div>
        <div className="grid grid-cols-[minmax(140px,1fr)_auto_minmax(140px,1fr)] items-center gap-2 xl:col-span-2">
  <Input
    type="number"
    min="0"
    value={minAmount}
    onChange={(e) => setMinAmount(e.target.value)}
    placeholder="Min amount"
  
  />

  <span className="text-sm text-zinc-400">–</span>

  <Input
    type="number"
    min="0"
    value={maxAmount}
    onChange={(e) => setMaxAmount(e.target.value)}
    placeholder="Max amount"
    
  />
</div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<ArrowLeftRight size={28} />}
          title={transactions.length === 0 ? "No transactions yet" : "No matches"}
          description={
            transactions.length === 0
              ? "Add your first income or expense to start tracking cash flow."
              : "Try adjusting your filters or search."
          }
          action={
            transactions.length === 0 ? (
              <Button
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
              >
                <Plus size={16} />
                Add transaction
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <p className="border-b border-zinc-200 px-5 py-3 text-xs font-medium text-zinc-500 dark:border-zinc-800">
            {filtered.length} transaction{filtered.length === 1 ? "" : "s"}
          </p>
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {filtered.map((t) => (
              <TransactionRow key={t.id} transaction={t} currency={currency} />
            ))}
          </div>
        </div>
      )}

      <TransactionForm open={formOpen} onClose={() => setFormOpen(false)} transaction={editing} />
    </div>
  );
}