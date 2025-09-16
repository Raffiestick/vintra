
"use client";

import { useState } from "react";
import Link from "next/link";
import { AuthDialog } from "@/components/auth/AuthDialog";

export default function SiteHeader() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [defaultTab, setDefaultTab] = useState<"sign-in" | "create-account">(
    "sign-in"
  );

  const openModal = (tab: "sign-in" | "create-account") => {
    setDefaultTab(tab);
    setIsAuthModalOpen(true);
  };

  return (
    <>
      <AuthDialog
        open={isAuthModalOpen}
        onOpenChange={setIsAuthModalOpen}
        defaultTab={defaultTab}
      />
      <header className="sticky top-0 z-50 border-b border-white/10 bg-black/30 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <Link href="/landing" className="group flex items-center gap-3">
            <img
              src="/vintra/wordmark.svg"
              alt="Vintra"
              className="h-6 opacity-90 transition group-hover:opacity-100"
            />
          </Link>
          <nav className="hidden items-center gap-6 text-sm md:flex">
            <Link
              href="/landing#features"
              className="opacity-80 hover:opacity-100"
            >
              Features
            </Link>
          </nav>
          <div className="flex items-center gap-3">
            <button
              onClick={() => openModal("sign-in")}
              className="rounded-md px-3.5 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/10 hover:text-white"
            >
              Login
            </button>
            <button
              onClick={() => openModal("create-account")}
              className="rounded-md bg-white px-3.5 py-2 text-sm font-semibold text-black transition hover:bg-zinc-200"
            >
              Sign Up
            </button>
          </div>
        </div>
      </header>
    </>
  );
}
