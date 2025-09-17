"use client";

import Link from "next/link";

interface SiteHeaderProps {
  setAuthModalOpen: (isOpen: boolean) => void;
  setAuthModalDefaultTab: (tab: "sign-in" | "create-account") => void;
}

export default function SiteHeader({ setAuthModalOpen, setAuthModalDefaultTab }: SiteHeaderProps) {

  const openModal = (tab: "sign-in" | "create-account") => {
    setAuthModalDefaultTab(tab);
    setAuthModalOpen(true);
  };

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-black/30 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <Link href="/landing" className="group flex items-center gap-3">
          <h1 className="font-manrope text-2xl font-bold">RizeUp</h1>
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
  );
}
