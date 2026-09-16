import type { Category } from "@/types";

export const CURRENCIES: { code: string; symbol: string; label: string }[] = [
  { code: "USD", symbol: "$", label: "US Dollar" },
  { code: "EUR", symbol: "€", label: "Euro" },
  { code: "GBP", symbol: "£", label: "British Pound" },
  { code: "NGN", symbol: "₦", label: "Nigerian Naira" },
  { code: "KES", symbol: "KSh", label: "Kenyan Shilling" },
  { code: "ZAR", symbol: "R", label: "South African Rand" },
  { code: "CAD", symbol: "$", label: "Canadian Dollar" },
  { code: "AUD", symbol: "$", label: "Australian Dollar" },
  { code: "INR", symbol: "₹", label: "Indian Rupee" },
  { code: "MXN", symbol: "$", label: "Mexican Peso" },
  { code: "AED", symbol: "د.إ", label: "UAE Dirham" },
  { code: "SGD", symbol: "S$", label: "Singapore Dollar" },
];

export function currencySymbol(code: string): string {
  const c = CURRENCIES.find((x) => x.code === code);
  return c ? c.symbol : `${code} `;
}

export const DEFAULT_CATEGORIES: Omit<Category, "id" | "businessId">[] = [
  { name: "Sales", type: "income", isDefault: true },
  { name: "Services", type: "income", isDefault: true },
  { name: "Subscriptions", type: "income", isDefault: true },
  { name: "Interest", type: "income", isDefault: true },
  { name: "Other Income", type: "income", isDefault: true },
  { name: "Rent", type: "expense", isDefault: true },
  { name: "Payroll", type: "expense", isDefault: true },
  { name: "Utilities", type: "expense", isDefault: true },
  { name: "Inventory", type: "expense", isDefault: true },
  { name: "Software", type: "expense", isDefault: true },
  { name: "Marketing", type: "expense", isDefault: true },
  { name: "Office Supplies", type: "expense", isDefault: true },
  { name: "Travel", type: "expense", isDefault: true },
  { name: "Meals", type: "expense", isDefault: true },
  { name: "Insurance", type: "expense", isDefault: true },
  { name: "Taxes", type: "expense", isDefault: true },
  { name: "Professional Services", type: "expense", isDefault: true },
  { name: "Equipment", type: "expense", isDefault: true },
  { name: "Shipping", type: "expense", isDefault: true },
  { name: "Loan Payment", type: "expense", isDefault: true },
  { name: "Other Expense", type: "expense", isDefault: true },
];

export const DEFAULT_LOW_BALANCE_THRESHOLD = 50000; // minor units = $500