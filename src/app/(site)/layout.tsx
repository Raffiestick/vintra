
"use client";

// IMPORTANT: pull in globals here too so group routes always get Tailwind
import "../globals.css";

import React, { useEffect, useState } from "react";
import SiteHeader from "./_components/SiteHeader";
import SiteFooter from "./_components/Footer";
import dynamic from "next/dynamic";

const AuthDialog = dynamic(
  () => import("@/components/auth/AuthDialog").then((m: any) => m.AuthDialog ?? m.default),
  { ssr: false }
) as any;

type AuthTab = "sign-in" | "create-account";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<AuthTab>("sign-in");

  useEffect(() => {
    const onAuth = (e: Event) => {
      const detail: any = (e as CustomEvent).detail ?? {};
      if (detail.action === "close") { setOpen(false); return; }
      const raw = detail.tab ?? detail.mode;
      setTab(raw === "create-account" || raw === "register" ? "create-account" : "sign-in");
      setOpen(true);
    };
    window.addEventListener("vintra:auth", onAuth as EventListener);
    return () => window.removeEventListener("vintra:auth", onAuth as EventListener);
  }, []);

  return (
    <div className="min-h-dvh bg-[hsl(var(--background))] text-[hsl(var(--foreground))]">
      <SiteHeader />
      <main>{children}</main>
      <SiteFooter />
      <div id="auth-dialog-root-global" data-auth-global-root>
        <AuthDialog open={open} onOpenChange={setOpen} defaultTab={tab} />
      </div>
    </div>
  );
}
