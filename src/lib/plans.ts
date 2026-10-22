import type { PlanId } from "@/types";

export type PlanFeature =
  | "dashboard"
  | "transactions"
  | "screenshot"
  | "import"
  | "recurring"
  | "accounts"
  | "categories"
  | "alerts"
  | "reports"
  | "copilot"
  | "debt"
  | "inventory"
  | "reminders"
  | "analytics"
  | "staff";

type PlanChoice = Exclude<PlanId, null>;

export interface PlanMeta {
  id: PlanChoice;
  name: string;
  price: number; // kobo per month; 0 = free
  currency: "NGN";
  tagline: string;
  highlights: string[];
  features: PlanFeature[];
  recommended?: boolean;
}

export const PLANS: PlanMeta[] = [
  {
    id: "free",
    name: "Free",
    price: 0,
    currency: "NGN",
    tagline: "Get started with basic tracking",
    highlights: ["Dashboard & transactions", "Basic receipts", "Up to 500 records"],
    features: ["dashboard", "transactions", "screenshot"],
  },
  {
    id: "pro",
    name: "Pro",
    price: 300_000, // ₦3,000/mo
    currency: "NGN",
    tagline: "Full accounting for a growing SME",
    recommended: true,
    highlights: [
      "Full accounting & categories",
      "Recurring & automatic bills",
      "Bank import",
      "Accounts & multi-currency",
      "Alerts & monthly reports",
      "Customer debt tracking",
      "Inventory",
    ],
    features: [
      "dashboard",
      "transactions",
      "screenshot",
      "import",
      "recurring",
      "accounts",
      "categories",
      "alerts",
      "reports",
      "debt",
      "inventory",
    ],
  },
];

const RANK: Record<PlanChoice, number> = { free: 0, pro: 1, premium: 1 };
export const PLAN_RANK = RANK;
export const PLAN_CHOICES: PlanChoice[] = ["free", "pro"];

export function formatPrice(meta: PlanMeta): string {
  if (meta.price <= 0) return "Free";
  const naira = meta.price / 100;
  return `₦${naira.toLocaleString("en-NG")}/mo`;
}

export function isTrialActive(trialEndsAt: number | undefined, now = Date.now()): boolean {
  return typeof trialEndsAt === "number" && trialEndsAt > now;
}

export function effectivePlan(
  plan: PlanId | undefined,
  trialEndsAt?: number
): PlanChoice {
  if (plan === "pro" || plan === "premium") return "pro";
  if (isTrialActive(trialEndsAt)) return "pro";
  return "free";
}

export function planMeta(
  plan: PlanId | undefined,
  trialEndsAt?: number
): PlanMeta {
  const id = effectivePlan(plan, trialEndsAt);
  return PLANS.find((p) => p.id === id) ?? PLANS[0];
}

export function hasFeature(
  plan: PlanId | undefined,
  feature: PlanFeature,
  trialEndsAt?: number
): boolean {
  return planMeta(plan, trialEndsAt).features.includes(feature);
}

const FEATURE_MIN: Record<PlanFeature, PlanChoice> = {
  dashboard: "free",
  transactions: "free",
  screenshot: "free",
  import: "pro",
  recurring: "pro",
  accounts: "pro",
  categories: "pro",
  alerts: "pro",
  reports: "pro",
  debt: "pro",
  inventory: "pro",
  reminders: "pro",
  analytics: "pro",
  staff: "pro",
  copilot: "pro",
};

export function can(
  plan: PlanId | undefined,
  feature: PlanFeature,
  trialEndsAt?: number
): boolean {
  return RANK[effectivePlan(plan, trialEndsAt)] >= RANK[FEATURE_MIN[feature]];
}
