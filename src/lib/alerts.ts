import type { Account, AppAlert, RecurringRule, Transaction } from "@/types";
import { businessBalance, buildForecast, detectAnomalies, lowestProjectedBalance } from "@/lib/analytics";
import { todayISO } from "@/lib/dates";
import { toMajor } from "@/lib/money";

export function computeAlerts(
  accounts: Account[],
  transactions: Transaction[],
  recurring: RecurringRule[],
  lowBalanceThreshold: number,
  currency: string
): AppAlert[] {
  const alerts: AppAlert[] = [];
  const now = Date.now();
  const today = todayISO();

  const balance = businessBalance(accounts, transactions);

  if (balance < lowBalanceThreshold && transactions.length > 0) {
    alerts.push({
      id: `low-${now}`,
      businessId: "",
      type: "lowBalance",
      severity: "critical",
      title: "Low cash balance",
      message: `Your total cash is ${toMajor(balance).toFixed(2)} ${currency} — below your alert threshold of ${toMajor(lowBalanceThreshold).toFixed(2)} ${currency}.`,
      createdAt: now,
      dismissed: false,
      date: today,
    });
  }

  for (const rule of recurring) {
    if (!rule.active) continue;
    const diff = daysUntil(rule.nextDueDate);
    if (diff >= 0 && diff <= 7) {
      alerts.push({
        id: `due-${rule.id}-${now}`,
        businessId: "",
        type: "upcomingBill",
        severity: diff <= 2 ? "warning" : "info",
        title: `Upcoming ${rule.type === "income" ? "income" : "payment"}`,
        message: `${rule.notes || "Recurring item"} of ${toMajor(rule.amount).toFixed(2)} ${currency} is ${diff === 0 ? "due today" : `due in ${diff} day${diff === 1 ? "" : "s"}`}.`,
        createdAt: now,
        dismissed: false,
        date: rule.nextDueDate,
      });
    }
  }

  const forecast = buildForecast(accounts, transactions, recurring, 30);
  const lowest = lowestProjectedBalance(forecast);
  if (lowest && lowest.value < 0) {
    alerts.push({
      id: `crunch-${now}`,
      businessId: "",
      type: "cashCrunch",
      severity: "critical",
      title: "Cash crunch predicted",
      message: `At your current run rate, your balance is projected to reach ${toMajor(lowest.value).toFixed(2)} ${currency} around ${lowest.date}.`,
      createdAt: now,
      dismissed: false,
      date: lowest.date,
    });
  }

  for (const a of detectAnomalies(transactions)) {
    alerts.push({
      id: `anom-${a.transaction.id}-${now}`,
      businessId: "",
      type: "anomaly",
      severity: a.severity,
      title: "Unusual expense detected",
      message: a.reason,
      createdAt: now,
      dismissed: false,
      date: a.transaction.date,
    });
  }

  return alerts;
}

export function daysUntil(iso: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.ceil((new Date(`${iso}T00:00:00`).getTime() - now.getTime()) / 86400000);
}