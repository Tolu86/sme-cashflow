"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { getIdToken } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { useBusiness } from "@/components/providers/business-provider";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingScreen } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { formatMoney, toMinor, toMajor } from "@/lib/money";
import { Camera, CheckCircle2, FileImage, ImagePlus, Loader2, Plus, ReceiptText, ShieldCheck, Trash2, TriangleAlert, X } from "lucide-react";

interface ReceiptRow {
  index: number;
  description: string;
  quantity: string;
  amountInput: string;
  categoryId: string;
  include: boolean;
  uncertain: boolean;
}

interface ReceiptResponse {
  receiptId: string;
  merchant: string;
  date: string;
  currency: string;
  receiptTotalMinor: number | null;
  items: Array<{
    index: number;
    description: string;
    quantity: string;
    amountMinor: number | null;
    categoryId: string;
    uncertain: boolean;
  }>;
  warnings: string[];
}

const MAX_ORIGINAL_FILE = 12_000_000;
const MAX_UPLOAD_BYTES = 2_800_000;

async function prepareImage(file: File): Promise<string> {
  const extension = file.name.toLowerCase().split(".").pop();
  if (!["png", "jpeg", "jpg"].includes(extension || "") ||
      !["image/png", "image/jpeg"].includes(file.type)) {
    throw new Error("Only PNG, JPG and JPEG receipt images are supported.");
  }
  if (file.size > MAX_ORIGINAL_FILE) throw new Error("Choose an image smaller than 12 MB.");

  const bitmap = await createImageBitmap(file);
  try {
    for (const maxDimension of [1800, 1400, 1100, 850]) {
      const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Image processing is not supported by this browser.");
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

      for (const quality of [0.85, 0.7, 0.55]) {
        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
        if (!blob || blob.size > MAX_UPLOAD_BYTES) continue;
        return await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result ?? ""));
          reader.onerror = () => reject(new Error("Unable to read the image."));
          reader.readAsDataURL(blob);
        });
      }
    }
    throw new Error("This receipt image is too large to analyze. Try a smaller photo.");
  } finally {
    bitmap.close();
  }
}

export default function ImportPage() {
  const { business, accounts, categories, reload, loading } = useBusiness();
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [imageData, setImageData] = useState("");
  const [receipt, setReceipt] = useState<ReceiptResponse | null>(null);
  const [rows, setRows] = useState<ReceiptRow[]>([]);
  const [accountId, setAccountId] = useState("");
  const [merchant, setMerchant] = useState("");
  const [date, setDate] = useState("");
  const [totalInput, setTotalInput] = useState("");
  const [reading, setReading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const expenseCategories = categories.filter((category) => category.type === "expense");
  const categoryOptions = [
    { value: "", label: "Choose expense category" },
    ...expenseCategories.map((category) => ({ value: category.id, label: category.name })),
  ];
  const selected = rows.filter((row) => row.include);
  const selectedTotal = selected.reduce((sum, row) => sum + toMinor(row.amountInput), 0);
  const reviewedTotal = totalInput.trim() === "" ? null : toMinor(totalInput);
  const difference = reviewedTotal === null ? null : selectedTotal - reviewedTotal;
  const unmatched = selected.some((row) =>
    !row.description.trim() ||
    !row.categoryId ||
    !Number.isFinite(Number(row.amountInput)) ||
    Number(row.amountInput) <= 0
  );

  function resetReceipt() {
    setReceipt(null);
    setRows([]);
    setFileName("");
    setImageData("");
    setError(null);
    setNotice(null);
    setTotalInput("");
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setNotice(null);
    setReceipt(null);
    setRows([]);
    setImageData("");
    setFileName("");
    try {
      setReading(true);
      const image = await prepareImage(file);
      setImageData(image);
      setFileName(file.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not prepare the image.");
    } finally {
      setReading(false);
    }
  }

  async function analyze() {
    if (!business?.id || !imageData || reading) return;
    setReading(true);
    setError(null);
    setNotice(null);
    try {
      const token = await getIdToken(auth!.currentUser!);
      const response = await fetch("/api/ai/receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
        body: JSON.stringify({ businessId: business.id, imageData }),
      });
      const parsed = await response.json();
      if (!response.ok) throw new Error(parsed.error || "Receipt analysis failed.");
      const result = parsed as ReceiptResponse;
      setReceipt(result);
      setMerchant(result.merchant);
      setDate(result.date);
      setAccountId(accounts[0]?.id ?? "");
      setTotalInput(result.receiptTotalMinor === null ? "" : toMajor(result.receiptTotalMinor).toFixed(2));
      setRows(result.items.map((item) => ({
        index: item.index,
        description: item.description,
        quantity: item.quantity,
        amountInput: item.amountMinor === null ? "" : toMajor(item.amountMinor).toFixed(2),
        categoryId: item.categoryId,
        include: true,
        uncertain: item.uncertain,
      })));
      setNotice("Receipt analyzed. Review the extracted items and totals carefully before saving.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not analyze the receipt.");
    } finally {
      setReading(false);
    }
  }

  function updateRow(index: number, field: "description" | "quantity" | "amountInput" | "categoryId" | "include", value: string | boolean) {
    setRows((current) => current.map((row) => row.index === index ? { ...row, [field]: value } : row));
  }

  function addRow() {
    setRows((current) => [
      ...current,
      { index: Math.max(-1, ...current.map((row) => row.index)) + 1,
        description: "", quantity: "", amountInput: "", categoryId: "", include: true, uncertain: true },
    ]);
  }

  async function saveItems() {
    if (!receipt || !business?.id || saving) return;
    setError(null);
    setNotice(null);
    if (!accountId) return setError("Choose an account to charge.");
    if (!selected.length) return setError("Select at least one receipt item.");
    if (unmatched) return setError("Every selected item needs a description, amount greater than zero, and expense category.");
    if (difference !== null && Math.abs(difference) > 1) {
      return setError("The selected amounts do not equal the reviewed receipt total. Check taxes, discounts, and misread values.");
    }

    const confirmed = window.confirm(
      "Save " + selected.length + " expense transactions totaling " + formatMoney(selectedTotal, business.currency) +
      " against the selected account? Each receipt item will be saved separately."
    );
    if (!confirmed) return;

    setSaving(true);
    try {
      const token = await getIdToken(auth!.currentUser!);
      const response = await fetch("/api/receipt/import", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
        body: JSON.stringify({
          businessId: business.id,
          receiptId: receipt.receiptId,
          merchant,
          date,
          accountId,
          receiptTotalMinor: reviewedTotal,
          items: selected.map((row) => ({
            description: row.description.trim(),
            quantity: row.quantity.trim(),
            amountMinor: toMinor(row.amountInput),
            categoryId: row.categoryId,
          })),
        }),
      });
      const saved = await response.json();
      if (!response.ok) throw new Error(saved.error || "Import failed.");
      await reload();
      setReceipt(null);
      setRows([]);
      setFileName("");
      setImageData("");
      setTotalInput("");
      setNotice("Saved " + saved.created + " categorized expense entries totaling " + formatMoney(saved.totalMinor, business.currency) + ".");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save the receipt.");
    } finally {
      setSaving(false);
    }
  }

  if (loading || !business) return <LoadingScreen label="Loading receipt importer..." />;

  return (
    <div className="space-y-7 pb-8">
      <PageHeader
        title="Import a receipt"
        description="Upload a purchase receipt, extract each item with AI, and categorize expenses before adding them to your books."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { icon: FileImage, number: "01", title: "Upload a photo", description: "PNG, JPG or JPEG receipts" },
          { icon: Camera, number: "02", title: "Review AI extraction", description: "Check amounts and expense categories" },
          { icon: ShieldCheck, number: "03", title: "Approve & save", description: "Record individual receipt items" },
        ].map((step) => {
          const Icon = step.icon;
          return (
            <div key={step.number} className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold tracking-widest text-emerald-700">STEP {step.number}</span>
                <span className="rounded-xl bg-emerald-50 p-2.5 text-emerald-700"><Icon size={18} /></span>
              </div>
              <p className="mt-4 text-sm font-semibold text-slate-900">{step.title}</p>
              <p className="mt-1 text-xs text-slate-500">{step.description}</p>
            </div>
          );
        })}
      </div>

      <div
        className="cursor-pointer rounded-[24px] border-2 border-dashed border-emerald-200 bg-gradient-to-br from-white to-emerald-50/80 p-7 text-center shadow-sm transition hover:border-emerald-400 sm:p-10"
        role="button"
        tabIndex={0}
        aria-label="Choose a receipt photo"
        onClick={() => fileRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") { event.preventDefault(); fileRef.current?.click(); }
        }}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          void handleFile(event.dataTransfer.files?.[0]);
        }}
      >
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700"><ImagePlus size={27} /></div>
        <p className="text-base font-semibold text-slate-900">{fileName || "Choose or drop a receipt image"}</p>
        <p className="mt-2 text-xs leading-5 text-slate-500">PNG, JPG or JPEG · Up to 12 MB before automatic image compression</p>
        <p className="mt-2 text-xs text-slate-500">Images are sent securely to the configured NVIDIA AI service for analysis and are not saved as receipt files.</p>
        <input
          ref={fileRef}
          type="file"
          accept=".png,.jpg,.jpeg,image/png,image/jpeg"
          className="hidden"
          onChange={(event) => { void handleFile(event.target.files?.[0]); event.target.value = ""; }}
        />
      </div>

      {imageData && (
        <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center">
          <img src={imageData} alt="Selected receipt preview" className="max-h-40 w-full rounded-xl border border-slate-100 bg-slate-50 object-contain sm:w-36" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-900">{fileName}</p>
            <p className="mt-1 text-xs text-slate-500">AI can misread blurry text, taxes, and quantities. Review the results before importing.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={analyze} loading={reading}><ReceiptText size={16} /> {receipt ? "Analyze again" : "Read receipt"}</Button>
            <Button variant="secondary" onClick={resetReceipt} disabled={reading || saving}><X size={16} /> Clear</Button>
          </div>
        </div>
      )}

      {reading && <p role="status" className="flex items-center gap-2 text-sm text-slate-500"><Loader2 size={16} className="animate-spin text-emerald-600" /> Preparing or reading your receipt...</p>}
      {error && <p role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"><TriangleAlert size={18} className="shrink-0" /> {error}</p>}
      {notice && <p role="status" className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"><CheckCircle2 size={18} className="shrink-0" /> {notice}</p>}

      {receipt && (
        <div className="space-y-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex items-center gap-2">
              <ReceiptText size={18} className="text-emerald-700" />
              <h2 className="text-lg font-semibold text-slate-900">Receipt details</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Input label="Merchant" value={merchant} onChange={(event) => setMerchant(event.target.value)} placeholder="Store name" />
              <Input label="Receipt date" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
              <Select label="Paid from account" value={accountId} onChange={(event) => setAccountId(event.target.value)}
                options={[{ value: "", label: "Choose an account" }, ...accounts.map((account) => ({ value: account.id, label: account.name }))]} />
              <Input label="Receipt total (major units)" type="number" min="0" step="0.01" value={totalInput} onChange={(event) => setTotalInput(event.target.value)} placeholder="Unknown / enter total" />
            </div>
            {accounts.length === 0 && <p className="mt-3 text-sm text-amber-700">Add an <Link href="/accounts" className="underline">account</Link> before saving an import.</p>}
            {receipt.warnings.length > 0 && <div className="mt-5 rounded-xl bg-amber-50 p-4 text-xs leading-6 text-amber-900">{receipt.warnings.map((warning, index) => <p key={index}>• {warning}</p>)}</div>}
            <p className="mt-3 text-xs text-slate-500">The receipt total includes taxes, fees and discounts. Add extra expense rows for fees, or adjust item amounts for discounts, until the reviewed total matches.</p>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-5">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Extracted purchases</h2>
                <p className="mt-1 text-xs text-slate-500">Select the items to record. All saved entries are expenses.</p>
              </div>
              <Button variant="secondary" size="sm" onClick={addRow}><Plus size={15} /> Add missing item / fee</Button>
            </div>

            <div className="divide-y divide-slate-100">
              {rows.map((row) => (
                <div key={row.index} className="grid gap-3 px-4 py-4 sm:grid-cols-[auto_minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.6fr)_auto] sm:items-end sm:px-5">
                  <label className="flex items-center gap-2 self-center text-xs text-slate-600">
                    <input type="checkbox" checked={row.include} onChange={(event) => updateRow(row.index, "include", event.target.checked)} className="h-4 w-4 accent-emerald-600" aria-label={"Include " + row.description} />
                    <span className="sm:sr-only">Include</span>
                  </label>
                  <Input label="Item" value={row.description} onChange={(event) => updateRow(row.index, "description", event.target.value)} placeholder="Chicken" />
                  <Input label="Quantity" value={row.quantity} onChange={(event) => updateRow(row.index, "quantity", event.target.value)} placeholder="2kg" />
                  <Input label="Line total" type="number" min="0.01" step="0.01" value={row.amountInput} onChange={(event) => updateRow(row.index, "amountInput", event.target.value)} placeholder="0.00" />
                  <Select label="Expense category" value={row.categoryId} onChange={(event) => updateRow(row.index, "categoryId", event.target.value)} options={categoryOptions} />
                  <button type="button" onClick={() => setRows((items) => items.filter((item) => item.index !== row.index))}
                    className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"
                    title="Remove item" aria-label={"Remove " + row.description}><Trash2 size={17} /></button>
                  {row.uncertain && row.include && <p className="text-xs text-amber-700 sm:col-start-2 sm:col-end-6">AI was uncertain about this row. Confirm its amount and category.</p>}
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 bg-slate-50/70 px-5 py-5">
              <div>
                <p className="text-xs text-slate-500">{selected.length} of {rows.length} items selected</p>
                <p className="mt-1 text-lg font-semibold tabular-nums text-slate-900">Selected total: {formatMoney(selectedTotal, business.currency)}</p>
                {difference !== null && <p className={"mt-1 text-xs " + (Math.abs(difference) > 1 ? "text-amber-700" : "text-emerald-700")}>
                  Difference from receipt total: {formatMoney(difference, business.currency)}
                </p>}
              </div>
              <Button loading={saving} disabled={reading || unmatched || selected.length === 0 || !accountId || (difference !== null && Math.abs(difference) > 1)} onClick={saveItems}>
                <ShieldCheck size={16} /> Save {selected.length} expense {selected.length === 1 ? "item" : "items"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
