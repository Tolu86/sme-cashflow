import type {
  Account,
  CashflowPoint,
  PeriodSummary,
  RecurringRule,
  Transaction,
} from "@/types";
import { addDays, todayISO, nextOccurrence } from "@/lib/dates";

export function txNetFor(tx: Transaction, accountId?: string): number {
  if (tx.type === "income") return tx.amount;
  if (tx.type === "expense") return -tx.amount;
  // transfer
  if (accountId !== undefined) {
    if (tx.accountId === accountId) return -tx.amount;
    if (tx.toAccountId === accountId) return tx.amount;
    return 0;
  }
  return 0;
}

export function accountBalance(
  account: Pick<Account, "openingBalance">,
  transactions: Transaction[],
  accountId: string
): number {
  return transactions.reduce((sum, t) => sum + txNetFor(t, accountId), account.openingBalance);
}

export function businessBalance(accounts: Account[], transactions: Transaction[]): number {
  const opening = accounts.reduce((s, a) => s + a.openingBalance, 0);
  return transactions.reduce((s, t) => s + txNetFor(t), opening);
}

export function periodSummary(
  accounts: Account[],
  transactions: Transaction[],
  rangeStartISO: string,
  rangeEndISO: string
): PeriodSummary {
  let income = 0;
  let expense = 0;
  for (const t of transactions) {
    if (t.date < rangeStartISO || t.date > rangeEndISO) continue;
    if (t.type === "income") income += t.amount;
    else if (t.type === "expense") expense += t.amount;
  }
  const currentBalance = businessBalance(accounts, transactions);
  const priorTx = transactions.filter((t) => t.date < rangeStartISO);
  const openingBalance = businessBalance(accounts, priorTx);
  return { openingBalance, currentBalance, income, expense, net: income - expense };
}

export function buildCashflowSeries(
  accounts: Account[],
  transactions: Transaction[],
  days: number
): CashflowPoint[] {
  const end = todayISO();
  const start = addDays(end, -(days - 1));
  const openingTotal = accounts.reduce((s, a) => s + a.openingBalance, 0);
  const balanceBeforeStart = transactions
    .filter((t) => t.date < start)
    .reduce((s, t) => s + txNetFor(t), openingTotal);

  const daily = new Map<string, { income: number; expense: number }>();
  for (const t of transactions) {
    if (t.date < start || t.date > end) continue;
    const entry = daily.get(t.date) ?? { income: 0, expense: 0 };
    if (t.type === "income") entry.income += t.amount;
    else if (t.type === "expense") entry.expense += t.amount;
    daily.set(t.date, entry);
  }

  const points: CashflowPoint[] = [];
  let balance = balanceBeforeStart;
  for (let i = 0; i < days; i++) {
    const date = addDays(start, i);
    const d = daily.get(date) ?? { income: 0, expense: 0 };
    balance += d.income - d.expense;
    points.push({ date, balance, income: d.income, expense: d.expense });
  }
  return points;
}

export interface ForecastItem {
  date: string;
  projectedBalance: number;
  event?: string;
}

export function buildForecast(
  accounts: Account[],
  transactions: Transaction[],
  recurring: RecurringRule[],
  horizonDays: number
): ForecastItem[] {
  const end = todayISO();

  // current balance
  const current = businessBalance(accounts, transactions);

  // recent daily net trend (last up to 90 days)
  const histStart = addDays(end, -89);
  const histTxs = transactions.filter((t) => t.date >= histStart && t.date <= end);
  const netTotal = histTxs.reduce((s, t) => s + txNetFor(t), 0);
  const dailyTrend = netTotal / 90;

  // recurring entries occurring within horizon
  const events: { date: string; amount: number; label: string }[] = [];
  for (const rule of recurring) {
    if (!rule.active) continue;
    let due = rule.nextDueDate;
    let guard = 0;
    while (due <= addDays(end, horizonDays) && guard < 400) {
      events.push({ date: due, amount: txNetFor({ type: rule.type, amount: rule.amount } as Transaction), label: rule.notes || rule.type });
      due = nextOccurrence(rule.frequency, due);
      guard++;
    }
  }
  events.sort((a, b) => a.date.localeCompare(b.date));

  const byDate = new Map<string, { amount: number; labels: string[] }>();
  for (const e of events) {
    const entry = byDate.get(e.date) ?? { amount: 0, labels: [] };
    entry.amount += e.amount;
    entry.labels.push(e.label);
    byDate.set(e.date, entry);
  }

  const points: ForecastItem[] = [];
  let balance = current;
  for (let i = 1; i <= horizonDays; i++) {
    const date = addDays(end, i);
    const event = byDate.get(date);
    const projected = balance + dailyTrend + (event?.amount ?? 0);
    points.push({
      date,
      projectedBalance: Math.round(projected),
      event: event && event.labels.length ? event.labels.join(", ") : undefined,
    });
    balance = projected;
  }
  return points;
}

export function lowestProjectedBalance(
  forecast: ForecastItem[]
): { value: number; date: string } | null {
  if (!forecast.length) return null;
  let lowest = forecast[0];
  for (const f of forecast) {
    if (f.projectedBalance < lowest.projectedBalance) lowest = f;
  }
  return { value: lowest.projectedBalance, date: lowest.date };
}

export interface Anomaly {
  transaction: Transaction;
  reason: string;
  severity: "info" | "warning" | "critical";
}

export function detectAnomalies(transactions: Transaction[]): Anomaly[] {
  const expenses = transactions.filter((t) => t.type === "expense");
  if (expenses.length < 3) return [];

  const byCategory = new Map<string, Transaction[]>();
  for (const t of expenses) {
    const key = t.categoryId ?? "uncategorized";
    const list = byCategory.get(key) ?? [];
    list.push(t);
    byCategory.set(key, list);
  }

  const anomalies: Anomaly[] = [];
  for (const [catId, list] of byCategory) {
    if (list.length < 3) continue;
    const amounts = list.map((t) => t.amount).sort((a, b) => a - b);
    const mean = amounts.reduce((s, a) => s + a, 0) / amounts.length;
    const variance = amounts.reduce((s, a) => s + (a - mean) ** 2, 0) / amounts.length;
    const std = Math.sqrt(variance);
    if (std === 0) continue;
    for (const t of list) {
      const z = (t.amount - mean) / std;
      if (z > 3) {
        anomalies.push({
          transaction: t,
          reason: `This ${catId === "uncategorized" ? "uncategorized" : "categorized"} expense is ${Math.round(
            (t.amount / mean) * 100 - 100
          )}% above your usual amount.`,
          severity: z > 5 ? "critical" : "warning",
        });
      }
    }
  }

  // detect duplicates in same period (same amount, same vendor)
  const seen = new Map<string, Transaction[]>();
  for (const t of transactions) {
    if (t.type !== "expense" || !t.vendorId) continue;
    const key = `${t.vendorId}:${t.amount}`;
    const list = seen.get(key) ?? [];
    list.push(t);
    seen.set(key, list);
  }
  for (const [, list] of seen) {
    const sorted = [...list].sort((a, b) => a.date.localeCompare(b.date));
    for (let i = 1; i < sorted.length; i++) {
      const diffDays = (new Date(sorted[i].date).getTime() - new Date(sorted[i - 1].date).getTime()) / 86400000;
      if (diffDays <= 2) {
        anomalies.push({
          transaction: sorted[i],
          reason: "Possible duplicate charge — same amount posted within 2 days.",
          severity: "warning",
        });
      }
    }
  }

  return anomalies.slice(0, 10);
}

export function upcomingRecurring(recurring: RecurringRule[], horizonDays: number) {
  const end = addDays(todayISO(), horizonDays);
  return recurring
    .filter((r) => r.active && r.nextDueDate <= end)
    .map((r) => ({ rule: r, amount: r.amount, type: r.type }))
    .sort((a, b) => a.rule.nextDueDate.localeCompare(b.rule.nextDueDate));
}

export function monthlyTotals(transactions: Transaction[], monthsBack: number) {
  const now = todayISO();
  const result: { month: string; income: number; expense: number; net: number }[] = [];
  for (let m = monthsBack - 1; m >= 0; m--) {
    const start = addDays(now, -(m * 30));
    const end = m === 0 ? now : addDays(now, -(m * 30) + 29);
    let income = 0;
    let expense = 0;
    for (const t of transactions) {
      if (t.date < start || t.date > end) continue;
      if (t.type === "income") income += t.amount;
      else if (t.type === "expense") expense += t.amount;
    }
    const label = start.slice(0, 7);
    result.push({ month: label, income, expense, net: income - expense });
  }
  return result;
}