"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  collection,
} from "firebase/firestore";
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
  BusinessMembership,
  Category,
  RecurringRule,
  Transaction,
  Vendor,
} from "@/types";
import { DEFAULT_CATEGORIES } from "@/lib/constants";
import {
  resolveBusinessRole,
  type BusinessRole,
} from "@/lib/business-permissions";

interface BusinessContextValue {
  business: Business | null;
  role: BusinessRole | null;
  membership: BusinessMembership | null;

  // All members belonging to the current business
  members: BusinessMembership[];

  accounts: Account[];
  categories: Category[];
  vendors: Vendor[];
  transactions: Transaction[];
  recurring: RecurringRule[];
  alerts: AppAlert[];

  loading: boolean;
  error: string | null;

  createBusiness: (
    name: string,
    currency: string,
    accountName: string,
    openingBalance: number
  ) => Promise<void>;

  reload: () => Promise<void>;
}

const BusinessContext =
  createContext<BusinessContextValue>({
    business: null,
    role: null,
    membership: null,

    members: [],

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

export function BusinessProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { user } = useAuth();

  const [business, setBusiness] =
    useState<Business | null>(null);

  const [role, setRole] =
    useState<BusinessRole | null>(null);

  const [membership, setMembership] =
    useState<BusinessMembership | null>(null);

  const [members, setMembers] =
    useState<BusinessMembership[]>([]);

  const [accounts, setAccounts] =
    useState<Account[]>([]);

  const [categories, setCategories] =
    useState<Category[]>([]);

  const [vendors, setVendors] =
    useState<Vendor[]>([]);

  const [transactions, setTransactions] =
    useState<Transaction[]>([]);

  const [recurring, setRecurring] =
    useState<RecurringRule[]>([]);

  const [alerts, setAlerts] =
    useState<AppAlert[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  /*
   * Load all business data.
   */
  const loadBusinessData = useCallback(
    async (businessId: string) => {
      if (!db) {
        throw new Error(
          "Firebase database is not configured."
        );
      }

      /*
       * First load the business itself.
       */
      const businessSnap = await getDoc(
        doc(
          db,
          "businesses",
          businessId
        )
      );

      if (!businessSnap.exists()) {
        setBusiness(null);
        setRole(null);
        setMembership(null);
        setMembers([]);

        setAccounts([]);
        setCategories([]);
        setVendors([]);
        setTransactions([]);
        setRecurring([]);
        setAlerts([]);

        return;
      }

      const bus = {
        id: businessSnap.id,
        ...businessSnap.data(),
      } as Business;

      setBusiness(bus);

      /*
       * -------------------------------------------------------
       * DETERMINE CURRENT USER ROLE
       * -------------------------------------------------------
       *
       * We keep this in a local variable instead of relying on
       * the React "role" state because state updates are async.
       */
      let currentRole: BusinessRole | null =
        null;

      let currentMembership:
        | BusinessMembership
        | null = null;

      /*
       * BUSINESS OWNER
       *
       * The owner does not need a membership document because
       * ownership is determined from businesses/{businessId}.ownerId.
       */
      if (user?.uid === bus.ownerId) {
        currentRole = "owner";
        currentMembership = null;

        setRole("owner");
        setMembership(null);
      }

      /*
       * MANAGER / STAFF
       *
       * Other users must have a membership document.
       */
      else if (user?.uid) {
        const membershipSnap =
          await getDoc(
            doc(
              db,
              "businesses",
              businessId,
              "members",
              user.uid
            )
          );

        if (membershipSnap.exists()) {
          const data =
            membershipSnap.data();

          currentMembership = {
            uid: user.uid,
            businessId,
            email: data.email,
            role: data.role,
            status: data.status,
            createdAt:
              data.createdAt,
          } as BusinessMembership;

          setMembership(
            currentMembership
          );

          if (
            currentMembership.status ===
            "active"
          ) {
            currentRole =
              resolveBusinessRole(
                user.uid,
                bus.ownerId,
                currentMembership.role
              );
          } else {
            currentRole = null;
          }

          setRole(currentRole);
        } else {
          currentMembership = null;
          currentRole = null;

          setMembership(null);
          setRole(null);
        }
      } else {
        currentMembership = null;
        currentRole = null;

        setMembership(null);
        setRole(null);
      }

      /*
       * -------------------------------------------------------
       * LOAD TEAM MEMBERS
       * -------------------------------------------------------
       *
       * Your Firestore rules allow only owners/managers to read
       * the members collection.
       *
       * Therefore staff users MUST NOT request this collection.
       */
      if (
        currentRole === "owner" ||
        currentRole === "manager"
      ) {
        const membersSnapshot =
          await getDocs(
            collection(
              db,
              "businesses",
              businessId,
              "members"
            )
          );

        const loadedMembers =
          membersSnapshot.docs.map(
            (memberDoc) => {
              const data =
                memberDoc.data();
                

              return {
                uid: memberDoc.id,
                businessId,
                role: data.role,
                email: data.email,
                status: data.status,
                createdAt:
                  data.createdAt,
              } as BusinessMembership;
            }
          );
          
        setMembers(
          loadedMembers
        );
      } else {
        /*
         * Staff members do not have permission to read the
         * members collection.
         */
        setMembers([]);
      }

      /*
       * -------------------------------------------------------
       * LOAD BUSINESS COLLECTIONS
       * -------------------------------------------------------
       *
       * These are all stored underneath the same businessId.
       *
       * This means the owner can see transactions created by
       * other members, provided those transactions contain the
       * correct businessId.
       */
      const [
        accs,
        cats,
        vends,
        txs,
        recs,
        alts,
      ] = await Promise.all([
        listAll<Account>(
          businessId,
          "accounts"
        ),

        listAll<Category>(
          businessId,
          "categories"
        ),

        listAll<Vendor>(
          businessId,
          "vendors"
        ),

        listSortedDesc<Transaction>(
          businessId,
          "transactions"
        ),

        listAll<RecurringRule>(
          businessId,
          "recurring"
        ),

        listSortedDesc<AppAlert>(
          businessId,
          "alerts"
        ),
      ]);

      setAccounts(accs);
      setCategories(cats);
      setVendors(vends);
      setTransactions(txs);
      setRecurring(recs);
      setAlerts(alts);
    },
    [user]
  );

  /*
   * Reload the currently selected business.
   */
  const reload = useCallback(
    async () => {
      const businessId =
        business?.id;

      if (!businessId) {
        return;
      }

      await loadBusinessData(
        businessId
      );
    },
    [
      business?.id,
      loadBusinessData,
    ]
  );

  /*
   * ---------------------------------------------------------
   * INITIAL BUSINESS LOAD
   * ---------------------------------------------------------
   */
  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!user || !db) {
        setLoading(false);
        return;
      }

      try {
        setError(null);

        /*
         * Get the user's profile.
         */
        const userDoc =
          await getDoc(
            doc(
              db,
              "users",
              user.uid
            )
          );

        const profileData =
          userDoc.exists()
            ? userDoc.data()
            : null;

        /*
         * The user's businessId tells us which business
         * they currently belong to.
         */
        const businessId =
          profileData?.businessId ??
          null;

        /*
         * User has not joined/created a business yet.
         */
        if (!businessId) {
          if (!cancelled) {
            setBusiness(null);
            setRole(null);
            setMembership(null);
            setMembers([]);

            setAccounts([]);
            setCategories([]);
            setVendors([]);
            setTransactions([]);
            setRecurring([]);
            setAlerts([]);

            setLoading(false);
          }

          return;
        }

        /*
         * Load the business and all relevant data.
         */
        if (!cancelled) {
          await loadBusinessData(
            businessId
          );
        }
      } catch (e) {
        console.error(
          "Failed to load business data:",
          e
        );

        if (!cancelled) {
          setError(
            e instanceof Error
              ? e.message
              : "Failed to load business data"
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [
    user,
    loadBusinessData,
  ]);

  /*
   * ---------------------------------------------------------
   * CREATE BUSINESS
   * ---------------------------------------------------------
   */
  const createBusiness =
    useCallback(
      async (
        name: string,
        currency: string,
        accountName: string,
        openingBalanceCents: number
      ) => {
        if (!user || !db) {
          throw new Error(
            "Not authenticated"
          );
        }

        setError(null);

        /*
         * Create business document.
         */
        const bizRef = doc(
          collection(
            db,
            "businesses"
          )
        );

        const now = Date.now();

        await setDoc(
          bizRef,
          {
            name,
            ownerId: user.uid,
            currency,
            createdAt: now,
            plan: "free",
          } satisfies Omit<
            Business,
            "id"
          >
        );

        const businessId =
          bizRef.id;

        /*
         * Create initial account.
         */
        const nowAccount = {
          name:
            accountName ||
            "Primary Account",
          type: "bank" as const,
          openingBalance:
            openingBalanceCents,
          createdAt: now,
        };

        const accountRef = doc(
          collection(
            db,
            "businesses",
            businessId,
            "accounts"
          )
        );

        await setDoc(
          accountRef,
          nowAccount
        );

        /*
         * Attach business to user's profile.
         */
        await setDoc(
          doc(
            db,
            "users",
            user.uid
          ),
          {
            currency,
            businessId,
          },
          {
            merge: true,
          }
        );

        /*
         * Create default categories.
         */
        for (const cat of
          DEFAULT_CATEGORIES) {
          const ref = doc(
            collection(
              db,
              "businesses",
              businessId,
              "categories"
            )
          );

          await setDoc(
            ref,
            {
              ...cat,
              businessId,
              createdAt: Date.now(),
            }
          );
        }

        /*
         * Reload the newly created business.
         */
        await loadBusinessData(
          businessId
        );
      },
      [
        user,
        loadBusinessData,
      ]
    );

  return (
    <BusinessContext.Provider
      value={{
        business,
        role,
        membership,

        members,

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
  return useContext(
    BusinessContext
  );
}