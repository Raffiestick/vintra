
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useMemo, useState } from "react";
import {
  LayoutDashboard,
  Users2,
  CheckCircle2,
  FolderOpen,
  Stamp,
  FileText,
  Settings,
  Menu,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

/** tiny classnames helper */
function cn(...xs: (string | undefined | null | false)[]) {
  return xs.filter(Boolean).join(" ");
}

/** Reusable nav link with active state + icon */
function NavItem({ href, label, icon: Icon }: { href: string; label: string; icon: any }) {
  const pathname = usePathname();
  const active =
    pathname === href ||
    (href !== "/" && pathname.startsWith(href + "/")) ||
    (href !== "/" && pathname === href);

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
        active
          ? "bg-white/10 text-foreground"
          : "text-muted-foreground hover:text-foreground hover:bg-white/5"
      )}
    >
      <Icon size={16} className="opacity-80" />
      <span>{label}</span>
    </Link>
  );
}

/** Sidebar for admin */
function AdminNav() {
  return (
    <nav className="flex flex-col gap-1">
      <div className="px-3 pb-1 pt-2 text-[11px] uppercase tracking-wider text-muted-foreground/80">Overview</div>
      <NavItem href="/admin" label="Dashboard" icon={LayoutDashboard} />

      <div className="px-3 pb-1 pt-3 text-[11px] uppercase tracking-wider text-muted-foreground/80">Dealers</div>
      <NavItem href="/admin/dealer-management" label="Dealer Management" icon={Users2} />
      <NavItem href="/admin/approved-dealers" label="Approved Dealers" icon={CheckCircle2} />

      <div className="px-3 pb-1 pt-3 text-[11px] uppercase tracking-wider text-muted-foreground/80">Jackets</div>
      <NavItem href="/admin/jackets" label="All Jackets" icon={FolderOpen} />
      <NavItem href="/admin/jackets/new" label="New Jacket" icon={Stamp} />
      <NavItem href="/admin/staging/invoices" label="Staging · Invoices" icon={FileText} />

      <div className="px-3 pb-1 pt-3 text-[11px] uppercase tracking-wider text-muted-foreground/80">Admin</div>
      <NavItem href="/reports" label="Reports" icon={FileText} />
      <NavItem href="/admin/settings" label="Settings" icon={Settings} />
    </nav>
  );
}

/** Sidebar for dealer */
function DealerNav() {
  return (
    <nav className="flex flex-col gap-1">
      <div className="px-3 pb-1 pt-2 text-[11px] uppercase tracking-wider text-muted-foreground/80">Overview</div>
      <NavItem href="/dealer" label="Overview" icon={LayoutDashboard} />

      <div className="px-3 pb-1 pt-3 text-[11px] uppercase tracking-wider text-muted-foreground/80">Jackets</div>
      <NavItem href="/dealer/jackets" label="My Jackets" icon={FolderOpen} />
      <NavItem href="/dealer/print" label="Print Jacket" icon={FileText} />

      <div className="px-3 pb-1 pt-3 text-[11px] uppercase tracking-wider text-muted-foreground/80">Account</div>
      <NavItem href="/upload-documents" label="Upload Documents" icon={FileText} />
      <NavItem href="/pending-review" label="Pending Review" icon={CheckCircle2} />
    </nav>
  );
}

/** Topbar with section title & mobile menu */
function Topbar() {
  const pathname = usePathname();
  const section = pathname.startsWith("/admin")
    ? "Admin"
    : pathname.startsWith("/dealer")
    ? "Dealer"
    : "App";

  const [open, setOpen] = useState(false);
  const MobileNav = pathname.startsWith("/admin") ? AdminNav : pathname.startsWith("/dealer") ? DealerNav : AdminNav;

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border/60 bg-background/80 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center gap-3">
        {/* Mobile menu */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <button className="md:hidden rounded-md border border-border/60 p-1.5 hover:bg-white/5" aria-label="Open navigation">
              <Menu size={18} />
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 bg-background/95 backdrop-blur">
            <SheetHeader>
              <SheetTitle className="bg-gradient-to-r from-indigo-400 via-fuchsia-400 to-amber-300 bg-clip-text text-transparent">
                Vintra
              </SheetTitle>
            </SheetHeader>
            <div className="mt-4">
              <MobileNav />
            </div>
          </SheetContent>
        </Sheet>
        <div className="font-medium">{section} Dashboard</div>
      </div>
      {/* right side: placeholder for user menu/logout if needed */}
      <div className="text-sm text-muted-foreground"></div>
    </header>
  );
}

/** Main shell that picks admin or dealer nav from pathname */
export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  const SidebarNav = useMemo(() => {
    if (pathname.startsWith("/admin")) return AdminNav;
    if (pathname.startsWith("/dealer")) return DealerNav;
    return AdminNav;
  }, [pathname]);

  return (
    <div className="min-h-dvh bg-background text-foreground">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-border/60 bg-background/80 px-3 py-4 backdrop-blur md:flex">
        <div className="mb-4 px-2 text-lg font-semibold tracking-wide bg-gradient-to-r from-indigo-400 via-fuchsia-400 to-amber-300 bg-clip-text text-transparent">
          Vintra
        </div>
        <SidebarNav />
        <div className="mt-auto px-2 text-xs text-muted-foreground">Navigation</div>
      </aside>

      {/* Main content area */}
      <div className="md:pl-64">
        <Topbar />
        <main className="px-4 py-6">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
