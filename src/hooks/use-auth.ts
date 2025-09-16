
"use client";

import { useState, useEffect } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';
// Removed DEV_ADMIN_UID import to prevent server-only code in client bundle

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
          // The admin check now relies solely on the secure custom claim.
          // This prevents server-side values from being bundled on the client.
          const hasAdminClaim = tokenResult.claims.admin === true;
          setIsAdmin(hasAdminClaim);
        } catch (error) {
          console.error("Error getting user token claims:", error);
          setIsAdmin(false); // Default to not admin on error
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
