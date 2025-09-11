"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Power, Car } from "lucide-react";

export default function DealerLayout({
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
    }
  };

  const navItems = [
    { href: "/dealer", label: "My Jackets", icon: Car },
  ];

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="w-64 flex-shrink-0 bg-sidebar text-sidebar-foreground p-4 flex flex-col border-r border-sidebar-border">
        <div className="p-4 mb-4">
          <Link href="/dealer">
            <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
              RizeUp Dealer
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
                    "flex items-center w-full text-left px-4 py-2 rounded-md transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    pathname === item.href &&
                      "bg-primary text-primary-foreground"
                  )}
                >
                  <item.icon className="mr-2 h-4 w-4" />
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="mt-auto">
          <Button variant="ghost" className="w-full justify-start" onClick={handleLogout}>
            <Power className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </aside>
      <main className="flex-1 p-8 overflow-auto">{children}</main>
    </div>
  );
}