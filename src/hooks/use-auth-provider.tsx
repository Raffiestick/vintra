"use client";

import React, { createContext, useEffect, useMemo, useState } from "react";
import type { User } from "firebase/auth";
import { onAuthStateChanged, getIdTokenResult } from "firebase/auth";
import { auth } from "@/lib/firebase/client";

export type AuthState = {
  user: User | null;
  claims: Record<string, any> | null;
  isAdmin: boolean;
  /**
   * Current recommended flag to gate UI while auth is resolving
   */
  loading: boolean;
  /**
   * Backwards-compatible alias (some files might still read this)
   */
  initializing: boolean;
};

const defaultState: AuthState = {
  user: null,
  claims: null,
  isAdmin: false,
  loading: true,
  initializing: true,
};

export const AuthContext = createContext<AuthState>(defaultState);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [claims, setClaims] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      try {
        setUser(u);
        if (u) {
          const tok = await getIdTokenResult(u, true);
          // ----> ADD THIS LINE HERE <----
          console.log("USER TOKEN CLAIMS:", tok.claims);
          // ------------------------------
          setClaims(tok.claims ?? null);
        } else {
          setClaims(null);
        }
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  const value: AuthState = useMemo(
    () => ({
      user,
      claims,
      isAdmin: Boolean(claims?.admin === true),
      loading,
      initializing: loading, // alias maintained
    }),
    [user, claims, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}