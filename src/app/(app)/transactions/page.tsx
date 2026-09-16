"use client";

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
        if (q) {
          const haystack = [t.notes, t.tags.join(" "), categoryName(categories, t.categoryId)].join(" ").toLowerCase();
          if (!haystack.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
  }, [transactions, query, typeFilter, categoryFilter, accountFilter, startDate, endDate, categories]);

  if (loading || !business) return <LoadingScreen label="Loading transactions..." />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Transactions</h1>
          <p className="text-sm text-zinc-500">All the money coming in and going out.</p>
        </div>
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

      <div className="grid grid-cols-1 gap-3 rounded-xl border border-zinc-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-6 dark:border-zinc-800 dark:bg-zinc-900">
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
        <div className="flex items-center gap-1">
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="px-2" />
          <span className="text-zinc-400">–</span>
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="px-2" />
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