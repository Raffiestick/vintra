"use client";

import React from "react";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import Link from "next/link";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, isAdmin } = useAuth();
  const email = user?.email ?? "";
  const initials = email ? email.slice(0, 2).toUpperCase() : "DE";

  return (
    <div className="min-h-dvh bg-[hsl(var(--background))] text-[hsl(var(--foreground))]">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[hsl(var(--background))]/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
          {/* Brand (same gradient as landing) */}
          <Link href={isAdmin ? "/admin" : "/dealer"} className="select-none">
            <span className="text-[18px] font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 via-indigo-400 to-violet-500">
              VINTRA
            </span>
          </Link>

          {/* Profile menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 rounded-xl hover:bg-white/10">
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="bg-white/10">{initials}</AvatarFallback>
                </Avatar>
                <span className="hidden sm:inline text-sm">{email || (isAdmin ? "Admin" : "Dealer")}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 bg-[hsl(var(--background))] border border-white/10 shadow-lg">
              <DropdownMenuLabel className="text-white/80">Account</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-white/10" />
              {isAdmin ? (
                <DropdownMenuItem asChild>
                  <Link href="/admin">Admin Dashboard</Link>
                </DropdownMenuItem>
              ) : (
                <>
                  <DropdownMenuItem asChild>
                    <Link href="/dealer/profile">Manage Profile</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/dealer/profile/tax-certificate">Tax Certificate</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/dealer/profile/change-password">Change Password</Link>
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem
                onClick={() => {
                  // simple sign out dispatch (your auth flow may differ)
                  window.dispatchEvent(new CustomEvent("vintra:auth", { detail: { action: "close" } }));
                  // optionally call firebase signOut in your auth provider context
                  location.href = "/landing";
                }}
              >
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto max-w-7xl px-4 py-6">
        <div className="grid gap-4">
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            {children}
          </div>
        </div>
      </main>

      {/* Footer (dynamic year) */}
      <footer className="mt-10 border-t border-white/10">
        <div className="mx-auto max-w-7xl px-4 py-6 text-sm text-white/70 flex items-center justify-between">
          <div className="relative select-none">
            <span className="text-[16px] font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 via-indigo-400 to-violet-500">
              VINTRA
            </span>
          </div>
          <div>© {new Date().getFullYear()} Vintra. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
}
