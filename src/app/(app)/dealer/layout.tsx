
import React from "react";

// This layout is a simple pass-through.
// The main authenticated layout at src/app/(app)/layout.tsx handles the AppShell.
export default function DealerLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
