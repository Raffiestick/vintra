
"use client";

import { useState, useEffect } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';
import { DEV_ADMIN_UID } from '@/lib/auth/roles';

interface AuthState {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const tokenResult = await currentUser.getIdTokenResult(true);
          // Check for admin claim OR hardcoded developer UID
          const hasAdminClaim = tokenResult.claims.admin === true;
          const isDevAdmin = currentUser.uid === DEV_ADMIN_UID;
          setIsAdmin(hasAdminClaim || isDevAdmin);
        } catch (error) {
          console.error("Error getting user token claims:", error);
          setIsAdmin(currentUser.uid === DEV_ADMIN_UID);
        }
      } else {
        // No user, not an admin.
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { user, loading, isAdmin };
}
