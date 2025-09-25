import React from "react";
import AppShell from "@/components/shell/AppShell";
import { AppBackground } from "@/components/shell/AppBackground";

/*
 * This is the root layout for all authenticated pages (e.g., /admin/* and /dealer/*).
 * It wraps every page within this group with the main AppShell component,
 * providing the consistent dashboard UI with a sidebar and header.
*/
export default function AuthenticatedAppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AppBackground />
      <AppShell>
        {children}
      </AppShell>
    </>
  );
}