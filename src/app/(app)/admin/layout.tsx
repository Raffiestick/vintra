
"use client";
import { RequireRole } from "@/lib/auth/requireRole";
export default function AdminSection({ children }:{ children: React.ReactNode }) {
  return <RequireRole role="admin">{children}</RequireRole>;
}
