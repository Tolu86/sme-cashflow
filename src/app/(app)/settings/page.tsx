"use client";

import { useEffect, useState } from "react";
import { Plus, Save, Trash2, Users, Building2, Bell, Crown, Check } from "lucide-react";
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
import { PLANS, formatPrice, planMeta } from "@/lib/plans";
import type { PlanId, VendorKind } from "@/types";

export default function SettingsPage() {
  const { business, vendors, accounts, reload, loading } = useBusiness();
  const { user, profile, refreshProfile } = useAuth();

  const [businessName, setBusinessName] = useState(business?.name ?? "");
  const [currency, setCurrency] = useState(profile?.currency ?? "USD");
  const [threshold, setThreshold] = useState(profile ? toMajor(profile.lowBalanceThreshold).toFixed(2) : "500.00");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const [vendorName, setVendorName] = useState("");
  const [vendorKind, setVendorKind] = useState<VendorKind>("supplier");
  const [vendorError, setVendorError] = useState<string | null>(null);

  const [upgrading, setUpgrading] = useState<Exclude<PlanId, null> | null>(null);
  const [planNotice, setPlanNotice] = useState<string | null>(null);
  const current = planMeta(business?.plan);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reference = params.get("reference") ?? params.get("trxref");
    const plan = params.get("plan") as Exclude<PlanId, null> | null;
    if (reference && plan && user && business?.id) {
      (async () => {
        try {
          const token = await user.getIdToken();
          const res = await fetch("/api/payments/verify", {
            method: "POST",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify({ reference, businessId: business.id, plan }),
          });
          if (res.ok) setPlanNotice(`Payment received — you're on the ${planMeta(plan).name} plan now.`);
        } finally {
          window.history.replaceState({}, "", "/settings#plans");
          await reload();
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, business?.id]);

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

  async function startUpgrade(plan: Exclude<PlanId, null>) {
    if (!business?.id || !user) return;
    setUpgrading(plan);
    setPlanNotice(null);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/payments/init", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ businessId: business.id, plan }),
      });
      const data = (await res.json()) as { error?: string; mode?: string; authorizationUrl?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to start upgrade.");
      if (data.mode === "paystack" && data.authorizationUrl) {
        window.location.href = data.authorizationUrl;
        return;
      }
      await reload();
      setPlanNotice(`You're on the ${planMeta(plan).name} plan now.`);
    } catch (err) {
      setPlanNotice(err instanceof Error ? err.message : "Failed to upgrade.");
    } finally {
      setUpgrading(null);
    }
  }

  if (loading || !business) return <LoadingScreen label="Loading settings..." />;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Settings</h1>
        <p className="text-sm text-zinc-500">Manage your business preferences.</p>
      </div>

      <div id="plans">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Crown size={16} className="text-amber-500" />
              <CardTitle>Plan & billing</CardTitle>
            </div>
          </CardHeader>
          <p className="mb-4 text-sm text-zinc-500">
            You're on the <span className="font-semibold text-zinc-900 dark:text-zinc-100">{current.name}</span> plan.
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            {PLANS.map((plan) => {
              const active = plan.id === current.id;
              return (
                <div
                  key={plan.id}
                  className={`flex flex-col rounded-xl border p-4 ${
                    active
                      ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30"
                      : "border-zinc-200 dark:border-zinc-700"
                  } ${plan.recommended ? "ring-1 ring-amber-400" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-zinc-900 dark:text-zinc-100">{plan.name}</p>
                    {plan.recommended && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                        Popular
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-lg font-bold text-zinc-900 dark:text-zinc-100">{formatPrice(plan)}</p>
                  <ul className="mt-3 flex-1 space-y-1.5">
                    {plan.highlights.map((h) => (
                      <li key={h} className="flex items-start gap-1.5 text-xs text-zinc-600 dark:text-zinc-300">
                        <Check size={13} className="mt-0.5 shrink-0 text-emerald-500" />
                        {h}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4">
                    {active ? (
                      <Button variant="secondary" size="sm" className="w-full" disabled>
                        Current plan
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        className="w-full"
                        variant={plan.id === "premium" ? "primary" : "outline"}
                        loading={upgrading === plan.id}
                        onClick={() => startUpgrade(plan.id)}
                      >
                        {current.id === "free" ? "Upgrade" : "Switch plan"}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {planNotice && <p className="mt-3 text-sm text-emerald-600 dark:text-emerald-400">{planNotice}</p>}
        </Card>
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