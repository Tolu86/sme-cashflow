"use client";

import { useState } from "react";
import { Plus, Save, Trash2, Users, Building2, Bell } from "lucide-react";
import { useBusiness } from "@/components/providers/business-provider";
import { useAuth } from "@/components/providers/auth-provider";
import { LoadingScreen } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { createOne, removeOne } from "@/lib/firestore/helpers";
import { setDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { CURRENCIES } from "@/lib/constants";
import { toMinor, toMajor } from "@/lib/money";
import type { VendorKind } from "@/types";

export default function SettingsPage() {
  const { business, vendors, accounts, reload, loading } = useBusiness();
  const { profile, refreshProfile } = useAuth();

  const [businessName, setBusinessName] = useState(business?.name ?? "");
  const [currency, setCurrency] = useState(profile?.currency ?? "USD");
  const [threshold, setThreshold] = useState(profile ? toMajor(profile.lowBalanceThreshold).toFixed(2) : "500.00");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const [vendorName, setVendorName] = useState("");
  const [vendorKind, setVendorKind] = useState<VendorKind>("supplier");
  const [vendorError, setVendorError] = useState<string | null>(null);

  async function saveDetails(e?: React.FormEvent) {
    e?.preventDefault();
    if (!business?.id || !profile) return;
    setSaving(true);
    setStatus(null);
    try {
      await setDoc(doc(db!, "businesses", business.id), { name: businessName.trim() }, { merge: true });
      await setDoc(doc(db!, "users", profile.uid), { currency, lowBalanceThreshold: toMinor(threshold || "0") }, { merge: true });
      await refreshProfile();
      await reload();
      setStatus("Saved.");
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  async function addVendor(e: React.FormEvent) {
    e.preventDefault();
    if (!business?.id) return;
    setVendorError(null);
    if (!vendorName.trim()) return setVendorError("Enter a name.");
    await createOne(business.id, "vendors", {
      businessId: business.id,
      name: vendorName.trim(),
      kind: vendorKind,
    });
    setVendorName("");
    await reload();
  }

  async function removeVendor(id: string) {
    if (!business?.id) return;
    await removeOne(business.id, "vendors", id);
    await reload();
  }

  if (loading || !business) return <LoadingScreen label="Loading settings..." />;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Settings</h1>
        <p className="text-sm text-zinc-500">Manage your business preferences.</p>
      </div>

      <form onSubmit={saveDetails} className="space-y-4">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building2 size={16} className="text-zinc-400" />
              <CardTitle>Business</CardTitle>
            </div>
          </CardHeader>
          <div className="space-y-4">
            <Input
              label="Business name"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              defaultValue={business.name}
              key={business.id}
            />
            <Select
              label="Currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              options={CURRENCIES.map((c) => ({ value: c.code, label: `${c.code} — ${c.label}` }))}
            />
            {status && <p className="text-sm text-zinc-500">{status}</p>}
            <Button type="submit" loading={saving}>
              <Save size={16} />
              Save changes
            </Button>
          </div>
        </Card>
      </form>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell size={16} className="text-zinc-400" />
            <CardTitle>Alerts</CardTitle>
          </div>
        </CardHeader>
        <div className="space-y-4">
          <Input
            label="Low-balance alert threshold (whole units)"
            type="number"
            step="0.01"
            min="0"
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
            prefix={CURRENCIES.find((c) => c.code === currency)?.symbol}
          />
          <Button onClick={saveDetails} loading={saving}>
            <Save size={16} />
            Save threshold
          </Button>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users size={16} className="text-zinc-400" />
            <CardTitle>Vendors & customers</CardTitle>
          </div>
        </CardHeader>
        <form onSubmit={addVendor} className="mb-4 flex flex-wrap items-end gap-2">
          <Input label="Name" value={vendorName} onChange={(e) => setVendorName(e.target.value)} placeholder="e.g. Acme Supplies" className="max-w-xs" />
          <Select
            label="Type"
            value={vendorKind}
            onChange={(e) => setVendorKind(e.target.value as VendorKind)}
            options={[
              { value: "supplier", label: "Supplier" },
              { value: "customer", label: "Customer" },
            ]}
          />
          <Button type="submit">
            <Plus size={16} />
            Add
          </Button>
          {vendorError && <p className="w-full text-sm text-red-600">{vendorError}</p>}
        </form>
        <div className="max-h-64 space-y-1 overflow-y-auto">
          {vendors.map((v) => (
            <div key={v.id} className="flex items-center justify-between rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700">
              <div>
                <p className="font-medium text-zinc-900 dark:text-zinc-100">{v.name}</p>
                <p className="text-xs capitalize text-zinc-500">{v.kind}</p>
              </div>
              <button onClick={() => removeVendor(v.id)} className="rounded-lg p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950">
                <Trash2 size={15} />
              </button>
            </div>
          ))}
          {vendors.length === 0 && <p className="text-sm text-zinc-500">No vendors yet.</p>}
        </div>
      </Card>

      <Card className="text-sm text-zinc-500">
        <CardHeader>
          <CardTitle>Accounts</CardTitle>
        </CardHeader>
        <ul className="space-y-1">
          {accounts.map((a) => (
            <li key={a.id} className="flex justify-between">
              <span>{a.name}</span>
              <span className="capitalize text-zinc-400">{a.type}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}