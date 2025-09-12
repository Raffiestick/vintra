
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Power, UserCheck, UserCog, FilePlus, FileText, UploadCloud } from "lucide-react";

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
    { href: "/admin/dealer-management", label: "Dealer Management", icon: UserCog },
    { href: "/admin/approved-dealers", label: "Approved Dealers", icon: UserCheck },
    { href: "/admin/jackets", label: "All Jackets", icon: FileText },
    { href: "/admin/jackets/new", label: "New Jacket", icon: FilePlus },
    { href: "/admin/staging/invoices", label: "Staging", icon: UploadCloud },
  ];

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="w-64 flex-shrink-0 bg-sidebar text-sidebar-foreground p-4 flex flex-col border-r border-sidebar-border">
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
                    "flex items-center w-full text-left px-4 py-2 rounded-md transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    pathname.startsWith(item.href) && !pathname.includes('new') ?
                      "bg-primary text-primary-foreground" : "",
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
