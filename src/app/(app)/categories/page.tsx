"use client";

import { useState } from "react";
import { Plus, Tag, Trash2 } from "lucide-react";
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Categories</h1>
        <p className="text-sm text-zinc-500">Organize transactions into income and expense categories.</p>
      </div>

      <CategorySection title="Expense categories" categories={expense} onAdd={() => openAdd("expense")} onEdit={openEdit} onDelete={remove} />
      <CategorySection title="Income categories" categories={income} onAdd={() => openAdd("income")} onEdit={openEdit} onDelete={remove} />

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
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <Button variant="ghost" size="sm" onClick={onAdd}>
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
              className="group flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-1.5 dark:border-zinc-700"
            >
              <button
                onClick={() => onEdit(c)}
                className={cn("text-sm font-medium text-zinc-700 hover:text-emerald-600 dark:text-zinc-300")}
              >
                {c.name}
              </button>
              {!c.isDefault && (
                <button onClick={() => onDelete(c)} className="text-zinc-400 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100">
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