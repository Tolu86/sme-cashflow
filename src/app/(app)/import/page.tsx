"use client";

import { PageHeader } from "@/components/ui/page-header";
import { useMemo, useRef, useState } from "react";
import {
  UploadCloud,
  Wand2,
  Check,
  X,
  FileSpreadsheet,
  Loader2,
  Lock,
  ShieldCheck,
  ListChecks,
} from "lucide-react";
import { getIdToken } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { useBusiness } from "@/components/providers/business-provider";
import { LoadingScreen } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { parseCsv, toDrafts, type TransactionDraft } from "@/lib/csv/parse";
import { createOne } from "@/lib/firestore/helpers";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/cn";
import { isTrialActive } from "@/lib/plans";

interface Row extends TransactionDraft {
  include: boolean;
  categoryId: string;
  vendorName: string;
}

export default function ImportPage() {
  const { business, accounts, categories, vendors, reload, loading } = useBusiness();
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [fileName, setFileName] = useState<string>("");
  const [selectedAccount, setSelectedAccount] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [categorizing, setCategorizing] = useState(false);
  const [importing, setImporting] = useState(false);

  const expenseCategories = useMemo(
    () => categories.filter((c) => c.type === "expense").map((c) => ({ value: c.id, label: c.name })),
    [categories]
  );
  const incomeCats = useMemo(
    () => categories.filter((c) => c.type === "income").map((c) => ({ value: c.id, label: c.name })),
    [categories]
  );

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    setErr(null);
    setMsg(null);
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = parseCsv(String(reader.result ?? ""));
        const drafts = toDrafts(parsed);
        if (!drafts.length) {
          setErr("Couldn't find rows with usable dates and amounts. Check the file format.");
          setFileName(file.name);
          return;
        }
        setFileName(file.name);
        setRows(
          drafts.map((d) => ({
            ...d,
            include: true,
            categoryId: "",
            vendorName: "",
          }))
        );
        setSelectedAccount(accounts[0]?.id ?? "");
        setMsg(`Parsed ${drafts.length} transactions from ${file.name}.`);
      } catch {
        setErr("Failed to parse that CSV file.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  async function runCategorize() {
    if (!business?.id || !rows.length) return;
    setCategorizing(true);
    setErr(null);
    try {
      const token = await getIdToken(auth!.currentUser!);
      const res = await fetch("/api/ai/categorize", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          businessId: business.id,
          drafts: rows.map((r) => ({ description: r.description, amount: r.amount, type: r.type })),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Categorization failed");
      setRows((prev) =>
        prev.map((row, i) => {
          const match = json.results?.find((r: { index: number }) => r.index === i);
          if (!match) return row;
          return {
            ...row,
            categoryId: match.categoryId ?? row.categoryId,
            vendorName: match.vendorName ?? row.vendorName,
          };
        })
      );
      setMsg("AI categorized your transactions. Review and adjust below.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Categorization failed.");
    } finally {
      setCategorizing(false);
    }
  }

  async function doImport() {
    if (!business?.id || !rows.length) return;
    if (!selectedAccount) {
      setErr("Choose the bank account these transactions belong to.");
      return;
    }
    setImporting(true);
    setErr(null);
    try {
      const batchId = `import-${Date.now()}`;
      const eligible = rows.filter((r) => r.include);
      let created = 0;
      for (const r of eligible) {
        let vendorId: string | null = null;
        if (r.vendorName.trim()) {
          const existing = vendors.find((v) => v.name.toLowerCase() === r.vendorName.trim().toLowerCase());
          if (existing) {
            vendorId = existing.id;
          } else {
            vendorId = await createOne(business.id, "vendors", {
              businessId: business.id,
              name: r.vendorName.trim(),
              kind: r.type === "income" ? "customer" : "supplier",
            });
          }
        }
        await createOne(business.id, "transactions", {
          businessId: business.id,
          accountId: selectedAccount,
          type: r.type,
          amount: r.amount,
          date: r.date,
          categoryId: r.categoryId || null,
          vendorId,
          tags: [],
          notes: r.description.slice(0, 200),
          status: "cleared",
          createdAt: Date.now(),
          updatedAt: Date.now(),
          importBatchId: batchId,
          autoCategorized: r.categoryId !== "",
        });
        created++;
      }
      await reload();
      setRows([]);
      setFileName("");
      setMsg(`Imported ${created} transactions.`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Import failed.");
    } finally {
      setImporting(false);
    }
  }

  if (loading || !business) return <LoadingScreen label="Loading importer..." />;

  const includedCount = rows.filter(
  (r) => r.include
).length;

const isPro =
  business.plan === "pro" ||
  business.plan === "premium" ||
  isTrialActive(business.trialEndsAt);

  return (
    <div className="space-y-7 pb-8">
      <PageHeader
        title="Import transactions"
        description="Bring your bank statement into Cashflow Copilot, review the entries, and choose what to add."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { step: "01", title: "Upload your CSV", icon: UploadCloud, text: "Choose a bank transaction export." },
          { step: "02", title: "Review entries", icon: ListChecks, text: "Verify categories, amounts, and the destination account." },
          { step: "03", title: "Finish importing", icon: ShieldCheck, text: "Add the selected records to your workspace." },
        ].map(({ step, title, icon: Icon, text }) => (
          <div key={step} className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-2"><span className="text-xs font-bold tracking-[0.18em] text-emerald-700">STEP {step}</span><span className="rounded-xl bg-emerald-50 p-2 text-emerald-700"><Icon size={18} /></span></div>
            <h2 className="mt-4 text-sm font-semibold text-slate-900">{title}</h2>
            <p className="mt-2 text-xs leading-5 text-slate-500">{text}</p>
          </div>
        ))}
      </div>

      <div
        role="button"
        tabIndex={0}
        aria-label="Choose a CSV file to import"
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileRef.current?.click(); } }}
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const file = e.dataTransfer.files?.[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = () => {
              try {
                const parsed = parseCsv(String(reader.result ?? ""));
                const drafts = toDrafts(parsed);
                if (!drafts.length) return setErr("No usable rows found in that file.");
                setFileName(file.name);
                setRows(drafts.map((d) => ({ ...d, include: true, categoryId: "", vendorName: "" })));
                setSelectedAccount(accounts[0]?.id ?? "");
                setMsg(`Parsed ${drafts.length} transactions.`);
              } catch {
                setErr("Failed to parse that CSV file.");
              }
            };
            reader.readAsText(file);
          }
        }}
        className="flex cursor-pointer flex-col items-center justify-center rounded-[24px] border-2 border-dashed border-emerald-200 bg-gradient-to-br from-white via-white to-emerald-50/80 px-6 py-16 text-center shadow-sm transition hover:border-emerald-400 hover:shadow-md focus-visible:outline-2 focus-visible:outline-emerald-500"
      >
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700"><UploadCloud size={30} /></div>
        <p className="text-base font-semibold text-slate-900">
          {fileName ? `Loaded ${fileName}` : "Drop your CSV here or click to browse"}
        </p>
        <p className="mt-2 text-xs leading-5 text-slate-500">
          Works with most bank exports (Date, Description, Amount columns).
        </p>
        <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFile} />
      </div>

      {err && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <X size={16} /> {err}
        </div>
      )}
      {msg && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <Check size={16} /> {msg}
        </div>
      )}

      {rows.length > 0 && (
        <div className="space-y-4">
          <div className="flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="secondary" size="sm" onClick={() => setRows((prev) => prev.map((r) => ({ ...r, include: !r.include })))}>
                Toggle all
              </Button>
              {isPro ? (
                <Button
                  size="sm"
                  onClick={runCategorize}
                  loading={categorizing}
                >
                  <Wand2 size={14} />
                  Auto-categorize
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                  window.location.href = "/settings";
                  }}
                >
                  <Lock size={14} />
                  Upgrade to Pro
                </Button>
            )}
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Select
                value={selectedAccount}
                onChange={(e) => setSelectedAccount(e.target.value)}
                placeholder="Bank account"
                options={accounts.map((a) => ({ value: a.id, label: a.name }))}
              />
              <Button onClick={doImport} loading={importing}>
                <Check size={16} />
                Import {includedCount} of {rows.length}
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3">
                    <FileSpreadsheet size={14} />
                  </th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Vendor / Customer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r, i) => (
                  <tr key={i} className={cn(!r.include && "opacity-50")}>
                    <td className="px-4 py-2">
                      <input
                        type="checkbox"
                        checked={r.include}
                        onChange={() => setRows((prev) => prev.map((x, xi) => (xi === i ? { ...x, include: !x.include } : x)))}
                        className="h-4 w-4 rounded border-zinc-300 text-emerald-500 focus:ring-emerald-500"
                      />
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 font-mono text-xs text-zinc-600 dark:text-zinc-400">{r.date}</td>
                    <td className="max-w-[16rem] truncate px-4 py-2 text-zinc-700 dark:text-zinc-300">{r.description}</td>
                    <td
                      className={cn(
                        "whitespace-nowrap px-4 py-2 font-semibold tabular-nums",
                        r.type === "income" ? "text-emerald-600" : "text-zinc-800 dark:text-zinc-200"
                      )}
                    >
                      {r.type === "income" ? "+" : "−"}{formatMoney(r.amount, business.currency)}
                    </td>
                    <td className="px-4 py-2">
                      <Select
                        value={r.categoryId}
                        onChange={(e) => setRows((prev) => prev.map((x, xi) => (xi === i ? { ...x, categoryId: e.target.value } : x)))}
                        placeholder="Uncategorized"
                        options={(r.type === "income" ? incomeCats : expenseCategories)}
                        className="py-1.5 text-xs"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        list="import-vendors"
                        value={r.vendorName}
                        onChange={(e) => setRows((prev) => prev.map((x, xi) => (xi === i ? { ...x, vendorName: e.target.value } : x)))}
                        placeholder="—"
                        className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-emerald-500"
                      />
                      <datalist id="import-vendors">
                        {vendors.map((v) => (
                          <option key={v.id} value={v.name} />
                        ))}
                      </datalist>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {categorizing && (
            <div className="flex items-center gap-2 text-sm text-zinc-500">
              <Loader2 size={16} className="animate-spin text-emerald-500" />
              Asking AI to categorize {rows.length} rows...
            </div>
          )}
        </div>
      )}
    </div>
  );
}