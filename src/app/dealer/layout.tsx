
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut, getAuth } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Power, Car } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function DealerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      await signOut(getAuth());
      router.replace("/");
      toast({ title: "Signed Out", description: "You have been successfully signed out." });
    } catch (error: any) {
      console.error("Error signing out: ", error);
      toast({ title: "Sign Out Error", description: error.message, variant: "destructive" });
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
                    pathname.startsWith(item.href) && item.href !== '/dealer' ? "bg-primary text-primary-foreground" : "",
                    pathname === item.href && "bg-primary text-primary-foreground"
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
