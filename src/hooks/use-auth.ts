
"use client";

import { useState, useEffect } from 'react';
import { onAuthStateChanged, type User, type IdTokenResult } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';

interface AuthState {
  user: User | null;
  initializing: boolean; // Renamed from 'loading' for clarity
  isAdmin: boolean;
  claims: IdTokenResult['claims'] | null;
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [claims, setClaims] = useState<IdTokenResult['claims'] | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const tokenResult = await currentUser.getIdTokenResult(false);
          const hasAdminClaim = tokenResult.claims.admin === true;
          setIsAdmin(hasAdminClaim);
          setClaims(tokenResult.claims);
        } catch (error) {
          console.error("Error getting user token claims:", error);
          setIsAdmin(false);
          setClaims(null);
        }
      } else {
        setIsAdmin(false);
        setClaims(null);
      }
      setInitializing(false);
    });

    return () => unsubscribe();
  }, []);

  return { user, initializing, isAdmin, claims };
}
