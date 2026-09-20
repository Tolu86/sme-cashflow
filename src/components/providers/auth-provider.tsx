"use client";

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/client";
import type { UserProfile } from "@/types";
import { DEFAULT_LOW_BALANCE_THRESHOLD } from "@/lib/constants";

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  profile: null,
  loading: true,
  logout: async () => {},
  refreshProfile: async () => {},
});

export function defaultProfile(uid: string, email: string, displayName?: string): UserProfile {
  return {
    uid,
    email,
    displayName,
    currency: "USD",
    lowBalanceThreshold: DEFAULT_LOW_BALANCE_THRESHOLD,
    businessId: null,
    tourCompleted: false,
    createdAt: Date.now(),
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth || !db) {
      setLoading(false);
      return;
    }
    const _db = db;
    const unsubAuth = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (!u) {
        setProfile(null);
        setLoading(false);
        return;
      }
      const ref = doc(_db, "users", u.uid);
      const unsubProfile = onSnapshot(
        ref,
        (snap) => {
          if (snap.exists()) {
            setProfile(snap.data() as UserProfile);
          } else {
            setDoc(
              ref,
              defaultProfile(u.uid, u.email ?? "", u.displayName ?? undefined)
            ).catch(() => {});
          }
        },
        () => setProfile(null)
      );
      setLoading(false);
      return unsubProfile;
    });
    return () => unsubAuth();
  }, []);

  const logout = useCallback(async () => {
    if (auth) await signOut(auth);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user && db) {
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) setProfile(snap.data() as UserProfile);
    }
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, profile, loading, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}