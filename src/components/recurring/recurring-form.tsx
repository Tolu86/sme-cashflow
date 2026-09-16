"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useBusiness } from "@/components/providers/business-provider";
import { createOne, updateOne, removeOne } from "@/lib/firestore/helpers";
import { toMinor, toMajor } from "@/lib/money";
import { todayISO, nextOccurrence } from "@/lib/dates";
import type { RecurringRule } from "@/types";

const FREQ_OPTIONS = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Every 2 weeks" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "yearly", label: "Yearly" },
];

const TYPE_OPTIONS = [
  { value: "income", label: "Income" },
  { value: "expense", label: "Expense" },
];

interface Props {
  open: boolean;
  onClose: () => void;
  rule?: RecurringRule | null;
}

export function RecurringForm({ open, onClose, rule }: Props) {
  const { business, accounts, categories, reload } = useBusiness();
  const bizId = business?.id;

  const [type, setType] = useState<"income" | "expense">("expense");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState("monthly");
  const [startDate, setStartDate] = useState(todayISO());
  const [accountId, setAccountId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (rule) {
      setType(rule.type);
      setAmount(toMajor(rule.amount).toFixed(2));
      setFrequency(rule.frequency);
      setStartDate(rule.nextDueDate);
      setAccountId(rule.accountId);
      setCategoryId(rule.categoryId ?? "");
      setNotes(rule.notes ?? "");
    } else {
      setType("expense");
      setAmount("");
      setFrequency("monthly");
      setStartDate(todayISO());
      setAccountId(accounts[0]?.id ?? "");
      setCategoryId("");
      setNotes("");
    }
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, rule]);

  const catOptions = categories
    .filter((c) => (type === "income" ? c.type === "income" : c.type === "expense"))
    .map((c) => ({ value: c.id, label: c.name }));

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!bizId) return setError("Business not found.");
    const cents = toMinor(amount);
    if (cents <= 0) return setError("Enter an amount greater than zero.");
    if (!accountId) return setError("Choose an account.");
    setSaving(true);
    try {
      const data = {
        businessId: bizId,
        accountId,
        type,
        amount: cents,
        frequency,
        startDate,
        nextDueDate: nextOccurrence(frequency, startDate),
        categoryId: categoryId || null,
        notes: notes.trim(),
        tags: [],
        active: true,
      };
      if (rule) {
        await updateOne(bizId, "recurring", rule.id, data);
      } else {
        await createOne(bizId, "recurring", data);
      }
      await reload();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!bizId || !rule) return;
    if (!confirm("Delete this recurring item?")) return;
    setSaving(true);
    try {
      await removeOne(bizId, "recurring", rule.id);
      await reload();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={rule ? "Edit recurring item" : "Add recurring item"}>
      <form onSubmit={handleSave} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Select label="Type" value={type} onChange={(e) => { setType(e.target.value as "income" | "expense"); setCategoryId(""); }} options={TYPE_OPTIONS} />
          <Input label="Amount" type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Select label="Frequency" value={frequency} onChange={(e) => setFrequency(e.target.value)} options={FREQ_OPTIONS} />
          <Input label="Next date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
        </div>
        <Select label="Account" value={accountId} onChange={(e) => setAccountId(e.target.value)} placeholder="Select account" options={accounts.map((a) => ({ value: a.id, label: a.name }))} />
        <Select label="Category (optional)" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} placeholder="Uncategorized" options={catOptions} />
        <Input label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Office rent" />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex items-center justify-between gap-3 pt-2">
          {rule ? (
            <Button type="button" variant="danger" size="sm" onClick={handleDelete} loading={saving}>
              Delete
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" loading={saving}>{rule ? "Save changes" : "Add item"}</Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}