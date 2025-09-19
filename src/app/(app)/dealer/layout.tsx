
"use client";
import { RequireRole } from "@/lib/auth/requireRole";
export default function DealerSection({ children }:{ children: React.ReactNode }) {
  return <RequireRole role="dealer">{children}</RequireRole>;
}
