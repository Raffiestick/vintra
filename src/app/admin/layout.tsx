"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push("/");
    } catch (error) {
      console.error("Error signing out: ", error);
      // Optionally, show a toast notification on error
    }
  };

  const navItems = [
    { href: "/admin/dealer-management", label: "Dealer Management" },
    { href: "/admin/jackets/new", label: "New Jacket" },
  ];

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="w-64 flex-shrink-0 bg-card p-4 flex flex-col border-r">
        <div className="p-4 mb-4">
          <Link href="/admin/dealer-management">
            <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
              RizeUp Admin
            </h2>
          </Link>
        </div>
        <nav className="flex-grow">
          <ul>
            {navItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "block w-full text-left px-4 py-2 rounded-md transition-colors",
                    pathname === item.href
                      ? "bg-primary text-primary-foreground"
                      "hover:bg-muted"
                  )}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="mt-auto">
          <Button variant="outline" className="w-full" onClick={handleLogout}>
            Logout
          </Button>
        </div>
      </aside>
      <main className="flex-1 p-8 overflow-auto">
        {children}
      </main>
    </div>
  );
}
