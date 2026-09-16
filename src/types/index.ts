export type TxType = "income" | "expense" | "transfer";
export type AccountType = "bank" | "cash" | "credit";
export type TxStatus = "cleared" | "pending";
export type Frequency = "daily" | "weekly" | "biweekly" | "monthly" | "quarterly" | "yearly";
export type AlertType = "lowBalance" | "upcomingBill" | "cashCrunch" | "anomaly";
export type AlertSeverity = "info" | "warning" | "critical";
export type VendorKind = "customer" | "supplier";

export interface Business {
  id: string;
  name: string;
  ownerId: string;
  currency: string;
  createdAt: number;
}

export interface Account {
  id: string;
  businessId: string;
  name: string;
  type: AccountType;
  openingBalance: number;
  createdAt: number;
}

export interface Category {
  id: string;
  businessId: string;
  name: string;
  type: "income" | "expense";
  icon?: string;
  isDefault: boolean;
}

export interface Vendor {
  id: string;
  businessId: string;
  name: string;
  kind: VendorKind;
}

export interface Transaction {
  id: string;
  businessId: string;
  accountId: string;
  type: TxType;
  amount: number;
  date: string;
  categoryId?: string;
  vendorId?: string;
  toAccountId?: string;
  tags: string[];
  notes?: string;
  status: TxStatus;
  createdAt: number;
  updatedAt: number;
  importBatchId?: string;
  autoCategorized: boolean;
  recurringId?: string;
}

export interface RecurringRule {
  id: string;
  businessId: string;
  accountId: string;
  type: "income" | "expense";
  amount: number;
  categoryId?: string;
  vendorId?: string;
  notes?: string;
  tags: string[];
  frequency: Frequency;
  startDate: string;
  nextDueDate: string;
  active: boolean;
}

export interface AppAlert {
  id: string;
  businessId: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  createdAt: number;
  dismissed: boolean;
  date?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  currency: string;
  lowBalanceThreshold: number;
  businessId: string | null;
  createdAt: number;
}

export interface AccountTotals {
  [accountId: string]: number;
}

export interface PeriodSummary {
  openingBalance: number;
  currentBalance: number;
  income: number;
  expense: number;
  net: number;
}

export interface CashflowPoint {
  date: string;
  balance: number;
  income: number;
  expense: number;
}

export interface ForecastPoint {
  date: string;
  projectedBalance: number;
}