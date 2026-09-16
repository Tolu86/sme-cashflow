"use client";

import { useState } from "react";
import { ArrowRight, Building2, Sparkles } from "lucide-react";
import { useBusiness } from "@/components/providers/business-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { CURRENCIES } from "@/lib/constants";
import { toMinor } from "@/lib/money";

export function OnboardingWizard() {
  const { createBusiness, error } = useBusiness();
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [accountName, setAccountName] = useState("Bank Account");
  const [openingBalance, setOpeningBalance] = useState("0");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!name.trim()) {
      setFormError("Give your business a name to get started.");
      return;
    }
    setSubmitting(true);
    try {
      await createBusiness(
        name.trim(),
        currency,
        accountName.trim() || "Bank Account",
        toMinor(openingBalance || "0")
      );
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl py-10">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500 text-white">
          <Sparkles size={24} />
        </div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Set up your business</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Tell us about your business and we&apos;ll create your cash flow workspace.
        </p>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Business name
            </label>
            <div className="relative">
              <Building2 size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Acme Coffee Roasters"
                className="pl-10"
                autoFocus
              />
            </div>
          </div>

          <Select
            label="Currency"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            placeholder="Select currency"
            options={CURRENCIES.map((c) => ({ value: c.code, label: `${c.code} — ${c.label}` }))}
          />

          <Input label="Primary bank account name" value={accountName} onChange={(e) => setAccountName(e.target.value)} placeholder="Bank Account" />

          <Input
            label="Opening balance (in your currency)"
            value={openingBalance}
            onChange={(e) => setOpeningBalance(e.target.value)}
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            prefix={CURRENCIES.find((c) => c.code === currency)?.symbol}
          />

          {formError && <p className="text-sm text-red-600">{formError}</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}

          <Button type="submit" className="w-full" size="lg" loading={submitting}>
            Create workspace
            {!submitting && <ArrowRight size={18} />}
          </Button>
        </form>
      </Card>
    </div>
  );
}