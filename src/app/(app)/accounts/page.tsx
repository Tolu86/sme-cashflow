"use client";

import { PageHeader } from "@/components/ui/page-header";
import { useState } from "react";
import { Plus, Landmark, Banknote, CreditCard, Trash2, Wallet, ArrowLeftRight } from "lucide-react";
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
  const totalBalance = accounts.reduce((sum, account) => sum + accountBalance(account, transactions, account.id), 0);

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
    <div className="space-y-7 pb-8">
      <div className="space-y-4">
        <PageHeader title="Accounts" description="All your business accounts and balances, organized in one financial workspace." />
        <div className="flex justify-end">
          <Button onClick={() => setOpen(true)}><Plus size={16} /> Add account</Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Total account balance", value: formatMoney(totalBalance, currency), icon: Wallet, detail: "Combined balances" },
          { label: "Connected accounts", value: accounts.length.toLocaleString(), icon: Landmark, detail: "Tracked in your workspace" },
          { label: "Recorded transactions", value: transactions.length.toLocaleString(), icon: ArrowLeftRight, detail: "Across all accounts" },
        ].map(({ label, value, icon: Icon, detail }) => (
          <div key={label} className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-medium text-slate-500">{label}</p>
              <span className="rounded-xl bg-emerald-50 p-2.5 text-emerald-700"><Icon size={18} /></span>
            </div>
            <p className="mt-4 break-words text-2xl font-semibold tabular-nums tracking-tight text-slate-900">{value}</p>
            <p className="mt-1 text-xs text-slate-500">{detail}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold tracking-tight text-slate-900">Your accounts</h2>
        <span className="text-xs font-medium text-slate-500">{accounts.length} total</span>
      </div>

      {accounts.length === 0 ? (
        <EmptyState
          icon={<Landmark size={28} />}
          title="No accounts yet"
          description="Add your bank or cash accounts to start tracking balances."
          action={<Button onClick={() => setOpen(true)}><Plus size={16} />Add account</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {accounts.map((a) => {
            const Icon = TYPE_ICONS[a.type];
            const balance = accountBalance(a, transactions, a.id);
            const txCount = transactions.filter((t) => t.accountId === a.id).length;
            return (
              <Card key={a.id} className="group relative overflow-hidden transition-shadow hover:shadow-md">
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-300" />
                <CardHeader className="pt-1">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
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
                <p className="truncate text-base font-semibold text-slate-900">{a.name}</p>
                <p className={`mt-2 break-words text-3xl font-semibold tracking-tight tabular-nums ${balance < 0 ? "text-red-500" : "text-slate-900"}`}>
                  {formatMoney(balance, currency)}
                </p>
                <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4"><span className="text-xs font-medium text-slate-500">Transactions</span><span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">{txCount}</span></div>
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