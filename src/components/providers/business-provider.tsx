"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { doc, getDoc, setDoc, collection } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "./auth-provider";
import {
  listAll,
  listSortedDesc,
} from "@/lib/firestore/helpers";
import type {
  Account,
  AppAlert,
  Business,
  Category,
  RecurringRule,
  Transaction,
  Vendor,
} from "@/types";
import { DEFAULT_CATEGORIES } from "@/lib/constants";

interface BusinessContextValue {
  business: Business | null;
  accounts: Account[];
  categories: Category[];
  vendors: Vendor[];
  transactions: Transaction[];
  recurring: RecurringRule[];
  alerts: AppAlert[];
  loading: boolean;
  error: string | null;
  createBusiness: (name: string, currency: string, accountName: string, openingBalance: number) => Promise<void>;
  reload: () => Promise<void>;
}

const BusinessContext = createContext<BusinessContextValue>({
  business: null,
  accounts: [],
  categories: [],
  vendors: [],
  transactions: [],
  recurring: [],
  alerts: [],
  loading: true,
  error: null,
  createBusiness: async () => {},
  reload: async () => {},
});

export function BusinessProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [business, setBusiness] = useState<Business | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [recurring, setRecurring] = useState<RecurringRule[]>([]);
  const [alerts, setAlerts] = useState<AppAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadBusinessData = useCallback(
    async (businessId: string) => {
      const [bus, accs, cats, vends, txs, recs, alts] = await Promise.all([
        getDoc(doc(db!, "businesses", businessId)).then((s) =>
          s.exists()
            ? ({ id: s.id, ...s.data() } as Business)
            : null
        ),
        listAll<Account>(businessId, "accounts"),
        listAll<Category>(businessId, "categories"),
        listAll<Vendor>(businessId, "vendors"),
        listSortedDesc<Transaction>(businessId, "transactions"),
        listAll<RecurringRule>(businessId, "recurring"),
        listSortedDesc<AppAlert>(businessId, "alerts"),
      ]);
      setBusiness(bus);
      setAccounts(accs);
      setCategories(cats);
      setVendors(vends);
      setTransactions(txs);
      setRecurring(recs);
      setAlerts(alts);
    },
    []
  );

  const reload = useCallback(async () => {
    const bizId = business?.id;
    if (bizId) await loadBusinessData(bizId);
  }, [business, loadBusinessData]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!user || !db) {
        setLoading(false);
        return;
      }
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const profileData = userDoc.exists() ? userDoc.data() : null;
        const bizId = profileData?.businessId ?? null;
        if (!bizId) {
          if (!cancelled) {
            setBusiness(null);
            setLoading(false);
          }
          return;
        }
        if (!cancelled) await loadBusinessData(bizId);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load business data");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [user, loadBusinessData]);

  const createBusiness = useCallback(
    async (name: string, currency: string, accountName: string, openingBalanceCents: number) => {
      if (!user || !db) throw new Error("Not authenticated");
      setError(null);

      const bizRef = doc(collection(db!, "businesses"));
      const now = Date.now();
      await setDoc(bizRef, {
        name,
        ownerId: user.uid,
        currency,
        createdAt: now,
      } satisfies Omit<Business, "id">);
      const bizId = bizRef.id;

      const nowAccount = {
        name: accountName || "Primary Account",
        type: "bank" as const,
        openingBalance: openingBalanceCents,
        createdAt: now,
      };
      const accountRef = doc(collection(db!, "businesses", bizId, "accounts"));
      await setDoc(accountRef, nowAccount);

      await setDoc(doc(db!, "users", user.uid), {
        currency,
        businessId: bizId,
      }, { merge: true });

      for (const cat of DEFAULT_CATEGORIES) {
        const ref = doc(collection(db!, "businesses", bizId, "categories"));
        await setDoc(ref, { ...cat, businessId: bizId, createdAt: Date.now() });
      }

      await loadBusinessData(bizId);
    },
    [user, loadBusinessData]
  );

  return (
    <BusinessContext.Provider
      value={{
        business,
        accounts,
        categories,
        vendors,
        transactions,
        recurring,
        alerts,
        loading,
        error,
        createBusiness,
        reload,
      }}
    >
      {children}
    </BusinessContext.Provider>
  );
}

export function useBusiness() {
  return useContext(BusinessContext);
}