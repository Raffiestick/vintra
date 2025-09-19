
"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export function RequireRole({ role, children }:{ role: "admin"|"dealer", children: React.ReactNode }) {
  const router = useRouter();
  const { initializing, user, claims } = useAuth();

  useEffect(() => {
    if (!initializing && !user) {
      window.dispatchEvent(new CustomEvent("vintra:auth", { detail: { action: "open", tab: "sign-in" }}));
    }
  }, [initializing, user]);

  if (initializing) {
    return <div className="grid place-items-center h-[50vh] text-white/70"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  }
  if (!user) return <div className="grid place-items-center h-[50vh] text-white/70">Sign in to continue…</div>;

  const isAdmin = claims?.admin === true;
  if (role === "admin" && !isAdmin) { router.replace("/dealer"); return null; }
  if (role === "dealer" && isAdmin) { router.replace("/admin"); return null; }

  return <>{children}</>;
}
