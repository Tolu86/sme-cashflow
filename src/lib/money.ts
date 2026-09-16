import { currencySymbol } from "./constants";

export function toMinor(value: string | number): number {
  const n = typeof value === "string" ? parseFloat(value) : value;
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

export function toMajor(minor: number): number {
  return minor / 100;
}

export function formatMoney(minor: number, currency = "USD"): string {
  const sign = minor < 0 ? "-" : "";
  const abs = Math.abs(minor);
  const sym = currencySymbol(currency);
  return `${sign}${sym}${(abs / 100).toFixed(2)}`;
}