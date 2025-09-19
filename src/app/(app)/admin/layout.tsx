
import React from "react";
import AppShell from "@/components/shell/AppShell";
import { AuthProvider } from "@/hooks/use-auth-provider";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AppShell>
        {children}
      </AppShell>
    </AuthProvider>
  );
}
