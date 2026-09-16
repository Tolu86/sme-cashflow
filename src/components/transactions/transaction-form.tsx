"use client";

import { useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useBusiness } from "@/components/providers/business-provider";
import { createOne, updateOne, removeOne } from "@/lib/firestore/helpers";
import { toMinor, toMajor } from "@/lib/money";
import { todayISO } from "@/lib/dates";
import type { Transaction, TxType } from "@/types";

interface Props {
  open: boolean;
  onClose: () => void;
  transaction?: Transaction | null;
}

const TYPE_OPTIONS = [
  { value: "income", label: "Income" },
  { value: "expense", label: "Expense" },
  { value: "transfer", label: "Transfer" },
];

export function TransactionForm({ open, onClose, transaction }: Props) {
  const { business, accounts, categories, vendors, reload } = useBusiness();
  const bizId = business?.id;

  const [type, setType] = useState<TxType>("expense");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayISO());
  const [accountId, setAccountId] = useState("");
  const [toAccountId, setToAccountId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [vendor, setVendor] = useState("");
  const [notes, setNotes] = useState("");
  const [tags, setTags] = useState("");
  const [status, setStatus] = useState<"cleared" | "pending">("cleared");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (transaction) {
      setType(transaction.type);
      setAmount(toMajor(transaction.amount).toFixed(2));
      setDate(transaction.date);
      setAccountId(transaction.accountId);
      setToAccountId(transaction.toAccountId ?? "");
      setCategoryId(transaction.categoryId ?? "");
      setVendor(transaction.vendorId ? vendorName(vendors, transaction.vendorId) : "");
      setNotes(transaction.notes ?? "");
      setTags(transaction.tags.join(", "));
      setStatus(transaction.status);
    } else {
      setType("expense");
      setAmount("");
      setDate(todayISO());
      const first = accounts[0]?.id;
      setAccountId(first ?? "");
      setToAccountId("");
      setCategoryId("");
      setVendor("");
      setNotes("");
      setTags("");
      setStatus("cleared");
    }
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, transaction]);

  const filteredCategories = useMemo(
    () => categories.filter((c) => (type === "income" ? c.type === "income" : c.type === "expense")),
    [categories, type]
  );
  const vendorList = useMemo(
    () => vendors.filter((v) => (type === "income" ? v.kind === "customer" : v.kind === "supplier")),
    [vendors, type]
  );

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!bizId) {
      setError("Business not found.");
      return;
    }
    const cents = toMinor(amount);
    if (cents <= 0) {
      setError("Enter an amount greater than zero.");
      return;
    }
    if (!accountId) {
      setError("Choose an account.");
      return;
    }
    if (type === "transfer" && toAccountId === accountId) {
      setError("Choose a different destination account for a transfer.");
      return;
    }
    setSaving(true);
    try {
      let vendorId = transaction?.vendorId ?? null;
      const vendorNameValue = vendor.trim();
      if (vendorNameValue) {
        if (!vendorId) {
          const existing = vendors.find((v) => v.name.toLowerCase() === vendorNameValue.toLowerCase());
          if (existing) {
            vendorId = existing.id;
          } else {
            vendorId = await createOne(bizId, "vendors", {
              businessId: bizId,
              name: vendorNameValue,
              kind: type === "income" ? "customer" : "supplier",
            });
          }
        } else if (transaction?.vendorId && vendoredNameChanged()) {
          await updateOne(bizId, "vendors", transaction.vendorId, { name: vendorNameValue });
        }
      } else if (transaction?.vendorId) {
        vendorId = null;
      }

      const data = {
        businessId: bizId,
        accountId,
        type,
        amount: cents,
        date,
        categoryId: type === "transfer" ? null : categoryId || null,
        vendorId,
        toAccountId: type === "transfer" ? toAccountId || null : null,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        notes: notes.trim(),
        status,
        updatedAt: Date.now(),
        autoCategorized: transaction?.autoCategorized ?? false,
      } as Partial<Transaction>;

      if (transaction) {
        await updateOne(bizId, "transactions", transaction.id, data);
      } else {
        await createOne(bizId, "transactions", {
          ...data,
          createdAt: Date.now(),
          autoCategorized: false,
        } as Partial<Transaction>);
      }
      await reload();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save transaction.");
    } finally {
      setSaving(false);
    }
  }

  function vendoredNameChanged() {
    const original = transaction?.vendorId ? vendorName(vendors, transaction.vendorId) : "";
    return original.toLowerCase() !== vendor.trim().toLowerCase();
  }

  async function handleDelete() {
    if (!bizId || !transaction) return;
    if (!confirm("Delete this transaction? This cannot be undone.")) return;
    setSaving(true);
    try {
      await removeOne(bizId, "transactions", transaction.id);
      await reload();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={transaction ? "Edit transaction" : "Add transaction"}>
      <form onSubmit={handleSave} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Type"
            value={type}
            onChange={(e) => {
              setType(e.target.value as TxType);
              setCategoryId("");
            }}
            options={TYPE_OPTIONS}
          />
          <Input
            label="Amount"
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            prefix={business?.currency === "USD" ? "$" : ""}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          <Select
            label="Account"
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            placeholder="Select account"
            options={accounts.map((a) => ({ value: a.id, label: a.name }))}
          />
        </div>

        {type === "transfer" ? (
          <Select
            label="To account"
            value={toAccountId}
            onChange={(e) => setToAccountId(e.target.value)}
            placeholder="Select account"
            options={accounts.filter((a) => a.id !== accountId).map((a) => ({ value: a.id, label: a.name }))}
          />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Category"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              placeholder={categories.length ? "Select category" : "No categories yet"}
              options={filteredCategories.map((c) => ({ value: c.id, label: c.name }))}
            />
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                {type === "income" ? "Customer (optional)" : "Vendor (optional)"}
              </label>
              <input
                list="vendor-list"
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
                placeholder={type === "income" ? "Acme Corp" : "Landlord"}
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
              <datalist id="vendor-list">
                {vendorList.map((v) => (
                  <option key={v.id} value={v.name} />
                ))}
              </datalist>
            </div>
          </div>
        )}

        <Input label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. June electric bill" />
        <Input label="Tags (comma separated)" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="rent, utilities" />
        <Select
          label="Status"
          value={status}
          onChange={(e) => setStatus(e.target.value as "cleared" | "pending")}
          options={[
            { value: "cleared", label: "Cleared" },
            { value: "pending", label: "Pending" },
          ]}
        />

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex items-center justify-between gap-3 pt-2">
          {transaction ? (
            <Button type="button" variant="danger" size="sm" onClick={handleDelete} loading={saving}>
              Delete
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              {transaction ? "Save changes" : "Add transaction"}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

function vendorName(vendors: { id: string; name: string }[], id?: string): string {
  return vendors.find((v) => v.id === id)?.name ?? "";
}