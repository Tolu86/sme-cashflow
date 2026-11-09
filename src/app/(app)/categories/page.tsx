"use client";

import { PageHeader } from "@/components/ui/page-header";
import { useState } from "react";
import { Plus, Tag, Trash2, ArrowDownLeft, ArrowUpRight, Layers3 } from "lucide-react";
import { useBusiness } from "@/components/providers/business-provider";
import { LoadingScreen, EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { createOne, removeOne, updateOne } from "@/lib/firestore/helpers";
import { cn } from "@/lib/cn";
import type { Category } from "@/types";

export default function CategoriesPage() {
  const { business, categories, transactions, reload, loading } = useBusiness();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [name, setName] = useState("");
  const [type, setType] = useState<"income" | "expense">("expense");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const expense = categories.filter((c) => c.type === "expense");
  const income = categories.filter((c) => c.type === "income");

  function openAdd(t: "income" | "expense") {
    setEditing(null);
    setType(t);
    setName("");
    setOpen(true);
  }

  function openEdit(c: Category) {
    setEditing(c);
    setType(c.type);
    setName(c.name);
    setError(c.isDefault ? "Default categories can't be renamed." : null);
    setOpen(true);
  }

  async function save() {
    if (!business?.id) return;
    setError(null);
    if (!name.trim()) return setError("Enter a category name.");
    if (type !== "income" && type !== "expense") return;
    setSaving(true);
    try {
      if (editing) {
        if (!editing.isDefault) {
          await updateOne(business.id, "categories", editing.id, { name: name.trim() });
        }
      } else {
        await createOne(business.id, "categories", {
          businessId: business.id,
          name: name.trim(),
          type,
          isDefault: false,
        });
      }
      await reload();
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save category.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(c: Category) {
    if (!business?.id) return;
    const used = transactions.some((t) => t.categoryId === c.id);
    if (used) {
      alert("This category is used by transactions. Edit those transactions first.");
      return;
    }
    if (!confirm(`Delete "${c.name}"?`)) return;
    await removeOne(business.id, "categories", c.id);
    await reload();
  }

  if (loading || !business) return <LoadingScreen label="Loading categories..." />;

  return (
    <div className="space-y-7 pb-8">
      <PageHeader title="Categories" description="Bring structure to your transactions with income and expense categories." />

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Total categories", value: categories.length, icon: Layers3, detail: "All classifications" },
          { label: "Expense categories", value: expense.length, icon: ArrowUpRight, detail: "Track business spending" },
          { label: "Income categories", value: income.length, icon: ArrowDownLeft, detail: "Organize revenue streams" },
        ].map(({ label, value, icon: Icon, detail }) => (
          <div key={label} className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium text-slate-500">{label}</p>
              <span className="rounded-xl bg-emerald-50 p-2.5 text-emerald-700"><Icon size={18} /></span>
            </div>
            <p className="mt-4 text-3xl font-semibold tabular-nums tracking-tight text-slate-900">{value}</p>
            <p className="mt-1 text-xs text-slate-500">{detail}</p>
          </div>
        ))}
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-2">
        <CategorySection title="Expense categories" categories={expense} onAdd={() => openAdd("expense")} onEdit={openEdit} onDelete={remove} />
        <CategorySection title="Income categories" categories={income} onAdd={() => openAdd("income")} onEdit={openEdit} onDelete={remove} />
      </div>

      {categories.length === 0 && (
        <EmptyState icon={<Tag size={28} />} title="No categories yet" description="Add some categories to organize your transactions." />
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? "Edit category" : "Add category"}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
          className="space-y-4"
        >
          <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Inventory" disabled={editing?.isDefault} autoFocus />
          <Select
            label="Type"
            value={type}
            onChange={(e) => setType(e.target.value as "income" | "expense")}
            options={[
              { value: "expense", label: "Expense" },
              { value: "income", label: "Income" },
            ]}
            disabled={!!editing}
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" loading={saving} disabled={editing?.isDefault}>Done</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function CategorySection({
  title,
  categories,
  onAdd,
  onEdit,
  onDelete,
}: {
  title: string;
  categories: Category[];
  onAdd: () => void;
  onEdit: (c: Category) => void;
  onDelete: (c: Category) => void;
}) {
  return (
    <Card className="relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-300 to-transparent" />
      <CardHeader className="pt-1">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><Tag size={17} /></span>
          <div><CardTitle>{title}</CardTitle><p className="mt-0.5 text-xs text-slate-500">{categories.length} available</p></div>
        </div>
        <Button variant="secondary" size="sm" onClick={onAdd}>
          <Plus size={16} />
          Add
        </Button>
      </CardHeader>
      {categories.length === 0 ? (
        <p className="text-sm text-zinc-500">No {title.toLowerCase()} yet.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <div
              key={c.id}
              className="group flex max-w-full items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 transition hover:border-emerald-200 hover:bg-emerald-50/50"
            >
              <button
                onClick={() => onEdit(c)}
                className={cn("truncate text-left text-sm font-semibold text-slate-700 hover:text-emerald-700")}
              >
                {c.name}
              </button>
              {!c.isDefault && (
                <button onClick={() => onDelete(c)} className="rounded-md p-1 text-slate-400 transition hover:bg-red-50 hover:text-red-500 sm:opacity-40 sm:group-hover:opacity-100" title={`Delete ${c.name}`} aria-label={`Delete ${c.name}`}>
                  <Trash2 size={14} />
                </button>
              )}
              {c.isDefault && <Badge variant="default">default</Badge>}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}