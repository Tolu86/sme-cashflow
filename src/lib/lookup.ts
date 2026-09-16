import type { Category, Vendor } from "@/types";

export function categoryMap(categories: Category[]): Map<string, Category> {
  return new Map(categories.map((c) => [c.id, c]));
}

export function vendorMap(vendors: Vendor[]): Map<string, Vendor> {
  return new Map(vendors.map((v) => [v.id, v]));
}

export function categoryName(categories: Category[], id?: string): string {
  if (!id) return "Uncategorized";
  return categoryMap(categories).get(id)?.name ?? "Uncategorized";
}

export function vendorName(vendors: Vendor[], id?: string): string {
  if (!id) return "";
  return vendorMap(vendors).get(id)?.name ?? "";
}