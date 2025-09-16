import { AppShell } from "@/components/shell/AppShell";
import { Toaster } from "@/components/ui/toaster";

export default function AuthenticatedAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <AppShell>{children}</AppShell>
      <Toaster />
    </>
  );
}
