import "server-only";
import type { QueryDocumentSnapshot } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { toMajor } from "@/lib/money";
import { todayISO } from "@/lib/dates";
import {
  businessBalance,
  buildForecast,
  detectAnomalies,
  periodSummary,
} from "@/lib/analytics";
import type { Account, Transaction, Frequency } from "@/types";

interface Tx {
  id: string;
  date: string;
  type: "income" | "expense" | "transfer";
  amount: number;
  categoryId?: string;
  notes?: string;
  accountId: string;
}

export interface AiContext {
  currency: string;
  businessName: string;
  openingBalance: number;
  currentBalance: number;
  income30d: number;
  expense30d: number;
  net30d: number;
  categoryTotals: { name: string; type: string; total: number; count: number }[];
  recentTransactions: {
    date: string;
    description: string;
    category: string;
    amount: number;
    type: string;
  }[];
  recurring: { label: string; frequency: string; amount: number; type: string; nextDue: string }[];
  forecast30d: { date: string; balance: number }[];
  anomalies: string[];
  monthly: { month: string; income: number; expense: number }[];
}

export async function buildAiContext(businessId: string): Promise<AiContext> {
  const db = getAdminDb();
  const businessDoc = await db.doc(`businesses/${businessId}`).get();
  if (!businessDoc.exists) throw new Error("Business not found");
  const business = businessDoc.data() as { name: string; currency: string };

  const accountsSnap = await db.collection(`businesses/${businessId}/accounts`).orderBy("createdAt", "asc").get();
  const accounts = accountsSnap.docs.map((d: QueryDocumentSnapshot) => ({ id: d.id, ...d.data() }) as { id: string; openingBalance: number });

  const categoriesSnap = await db.collection(`businesses/${businessId}/categories`).get();
  const categoryNames = new Map<string, string>();
  for (const d of categoriesSnap.docs) categoryNames.set(d.id, (d.data().name as string) ?? "Uncategorized");

  const txsSnap = await db.collection(`businesses/${businessId}/transactions`).orderBy("date", "asc").limit(5000).get();
  const transactions: Tx[] = txsSnap.docs.map((d: QueryDocumentSnapshot) => {
    const x = d.data();
    return {
      id: d.id,
      date: (x.date as string) ?? "",
      type: x.type as Tx["type"],
      amount: (x.amount as number) ?? 0,
      categoryId: x.categoryId as string | undefined,
      notes: x.notes as string | undefined,
      accountId: x.accountId as string,
    };
  });

  const recurringSnap = await db.collection(`businesses/${businessId}/recurring`).where("active", "==", true).get();
  const recurringItems = recurringSnap.docs.map((d: QueryDocumentSnapshot) => {
    const x = d.data();
    return {
      id: d.id,
      businessId,
      label: (x.notes as string) ?? (x.type === "income" ? "Recurring income" : "Recurring expense"),
      frequency: x.frequency as Frequency,
      amount: x.amount as number,
      type: x.type as "income" | "expense",
      nextDueDate: x.nextDueDate as string,
      startDate: (x.startDate as string) ?? "",
      accountId: x.accountId as string,
      tags: [] as string[],
      active: true,
    };
  });

  const summary = periodSummary(accounts as Account[], transactions as Transaction[], daysAgo(30), todayISO());
  const currentBalance = businessBalance(accounts as Account[], transactions as Transaction[]);
  const forecast = buildForecast(accounts as Account[], transactions as Transaction[], recurringItems, 30);
  const anomalies = detectAnomalies(transactions as Transaction[]).slice(0, 6).map(
    (a) => `[${a.transaction.date}] ${a.transaction.notes ?? a.transaction.type} (${toMajor(a.transaction.amount).toFixed(2)}): ${a.reason}`
  );

  const categoryTotals = new Map<string, { name: string; type: string; total: number; count: number }>();
  for (const t of transactions as Transaction[]) {
    const name = t.categoryId ? categoryNames.get(t.categoryId) ?? "Uncategorized" : "Uncategorized";
    const key = `${t.type}:${t.categoryId ?? ""}`;
    const entry = categoryTotals.get(key) ?? { name, type: t.type, total: 0, count: 0 };
    entry.total += t.amount;
    entry.count += 1;
    categoryTotals.set(key, entry);
  }

  const recent = [...transactions]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 20)
    .map((t) => ({
      date: t.date,
      description: t.notes ?? (t.type === "income" ? "Income" : "Expense"),
      category: t.categoryId ? categoryNames.get(t.categoryId) ?? "Uncategorized" : "Uncategorized",
      amount: toMajor(t.amount),
      type: t.type,
    }));

  return {
    currency: business.currency ?? "USD",
    businessName: business.name,
    openingBalance: toMajor(summary.openingBalance),
    currentBalance: toMajor(currentBalance),
    income30d: toMajor(summary.income),
    expense30d: toMajor(summary.expense),
    net30d: toMajor(summary.net),
    categoryTotals: [...categoryTotals.values()].map((c) => ({ ...c, total: toMajor(c.total) })),
    recentTransactions: recent,
    recurring: recurringItems.map((r: {
  label: string;
  frequency: Frequency;
  amount: number;
  type: "income" | "expense";
  nextDueDate: string;
}) => ({ label: r.label, frequency: r.frequency, amount: toMajor(r.amount), type: r.type, nextDue: r.nextDueDate })),
    forecast30d: forecast.map((f) => ({ date: f.date, balance: toMajor(f.projectedBalance) })),
    anomalies,
    monthly: buildMonthly(transactions),
  };
}

function buildMonthly(txs: Tx[]) {
  const map = new Map<string, { income: number; expense: number }>();
  for (const t of txs) {
    const key = t.date.slice(0, 7);
    const entry = map.get(key) ?? { income: 0, expense: 0 };
    if (t.type === "income") entry.income += t.amount;
    else if (t.type === "expense") entry.expense += t.amount;
    map.set(key, entry);
  }
  return [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-6)
    .map(([month, v]) => ({ month, income: toMajor(v.income), expense: toMajor(v.expense) }));
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}