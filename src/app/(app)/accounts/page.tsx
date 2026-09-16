"use client";

import { useState } from "react";
import { Plus, Landmark, Banknote, CreditCard, Trash2 } from "lucide-react";
import { useBusiness } from "@/components/providers/business-provider";
import { LoadingScreen, EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { accountBalance } from "@/lib/analytics";
import { createOne, removeOne } from "@/lib/firestore/helpers";
import { formatMoney } from "@/lib/money";
import { toMinor } from "@/lib/money";
import type { AccountType } from "@/types";

const TYPE_ICONS: Record<AccountType, typeof Landmark> = {
  bank: Landmark,
  cash: Banknote,
  credit: CreditCard,
};

export default function AccountsPage() {
  const { business, accounts, transactions, reload, loading } = useBusiness();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<AccountType>("bank");
  const [opening, setOpening] = useState("0");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const currency = business?.currency ?? "USD";

  async function create() {
    if (!business?.id) return;
    setError(null);
    if (!name.trim()) return setError("Name your account.");
    setSaving(true);
    try {
      await createOne(business.id, "accounts", {
        businessId: business.id,
        name: name.trim(),
        type,
        openingBalance: toMinor(opening || "0"),
        createdAt: Date.now(),
      });
      await reload();
      setName("");
      setOpening("0");
      setType("bank");
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create account.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteAccount(id: string, hasTxns: boolean) {
    if (!business?.id) return;
    if (hasTxns) {
      alert("This account has transactions. Delete its transactions first, or edit them to another account.");
      return;
    }
    if (!confirm("Delete this account?")) return;
    await removeOne(business.id, "accounts", id);
    await reload();
  }

  if (loading || !business) return <LoadingScreen label="Loading accounts..." />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Accounts</h1>
          <p className="text-sm text-zinc-500">Bank, cash, and credit accounts for your business.</p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus size={16} />
          Add account
        </Button>
      </div>

      {accounts.length === 0 ? (
        <EmptyState
          icon={<Landmark size={28} />}
          title="No accounts yet"
          description="Add your bank or cash accounts to start tracking balances."
          action={<Button onClick={() => setOpen(true)}><Plus size={16} />Add account</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {accounts.map((a) => {
            const Icon = TYPE_ICONS[a.type];
            const balance = accountBalance(a, transactions, a.id);
            const txCount = transactions.filter((t) => t.accountId === a.id).length;
            return (
              <Card key={a.id}>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600 dark:bg-zinc-800">
                      <Icon size={18} />
                    </div>
                    <CardTitle className="capitalize">{a.type} account</CardTitle>
                  </div>
                  <button
                    onClick={() => deleteAccount(a.id, txCount > 0)}
                    className="rounded-lg p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950"
                    title="Delete account"
                  >
                    <Trash2 size={16} />
                  </button>
                </CardHeader>
                <p className="truncate text-lg font-semibold text-zinc-900 dark:text-zinc-100">{a.name}</p>
                <p className={`text-2xl font-bold tabular-nums ${balance < 0 ? "text-red-500" : "text-zinc-900 dark:text-zinc-50"}`}>
                  {formatMoney(balance, currency)}
                </p>
                <p className="mt-1 text-xs text-zinc-500">{txCount} transactions</p>
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Add account">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            create();
          }}
          className="space-y-4"
        >
          <Input label="Account name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Business checking" autoFocus />
          <Select
            label="Type"
            value={type}
            onChange={(e) => setType(e.target.value as AccountType)}
            options={[
              { value: "bank", label: "Bank account" },
              { value: "cash", label: "Cash" },
              { value: "credit", label: "Credit card" },
            ]}
          />
          <Input label="Opening balance" type="number" step="0.01" value={opening} onChange={(e) => setOpening(e.target.value)} placeholder="0.00" />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>Create account</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}