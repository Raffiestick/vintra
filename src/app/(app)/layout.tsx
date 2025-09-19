
import React from "react";
import { AppShell } from "@/components/shell/AppShell";
import { AuthProvider } from "@/hooks/use-auth-provider";

/*
 * This is the root layout for all authenticated pages (e.g., /admin/* and /dealer/*).
 * It wraps every page within this group with the main AppShell component,
 * providing the consistent dashboard UI with a sidebar and header.
 * The AuthProvider is included here to give AppShell and all child pages
 * access to the authentication context (user, isAdmin, loading state).
*/
export default function AuthenticatedAppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AppShell>
        {children}
      </AppShell>
    </AuthProvider>
  );
}
