"use client";

import React from "react";

export default function SiteHeader() {
  const openAuth = (tab: "sign-in" | "create-account") =>
    window.dispatchEvent(new CustomEvent("vintra:auth", { detail: { action: "open", tab } }));

  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-white/10 bg-[hsl(var(--background))]/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        {/* Brand mark */}
        <div className="relative select-none">
          {/* main wordmark */}
          <span className="text-[20px] font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-indigo-300 to-violet-400">
            VINTRA
          </span>
          {/* subtle glow, NOT rainbow */}
          <span
            aria-hidden
            className="pointer-events-none absolute -inset-2 -z-10 blur-md opacity-40"
            style={{
              background:
                "radial-gradient(closest-side, rgba(99,102,241,0.35), transparent 70%)",
            }}
          />
        </div>

        <nav className="flex items-center gap-2">
          <button
            onClick={() => openAuth("sign-in")}
            className="rounded-md border border-white/15 px-3.5 py-2 text-sm font-medium hover:bg-white/10 transition"
          >
            Log in
          </button>
          <button
            onClick={() => openAuth("create-account")}
            className="rounded-md bg-white px-3.5 py-2 text-sm font-semibold text-black hover:bg-zinc-200 transition"
          >
            Sign Up
          </button>
        </nav>
      </div>
    </header>
  );
}
