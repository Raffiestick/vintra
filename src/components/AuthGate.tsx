"use client";

import { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";

export function AuthGate({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  const [user, setUser] = useState<any>(undefined);
  useEffect(() => onAuthStateChanged(getAuth(), setUser), []);
  if (user === undefined) return fallback ?? <div className="p-4 text-sm">Loading…</div>;
  if (!user) return <div className="p-4 text-sm">Please sign in.</div>;
  return <>{children}</>;
}
