
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
        // Dev Bypass: Check for the hardcoded admin UID first.
        if (currentUser.uid === DEV_ADMIN_UID) {
          setIsAdmin(true);
        } else {
          // Fallback to claims-based check for other users.
          try {
            const tokenResult = await currentUser.getIdTokenResult(true);
            setIsAdmin(tokenResult.claims.admin === true);
          } catch (error) {
            console.error("Error getting user token claims:", error);
            setIsAdmin(false);
          }
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
