
"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  FileText,
  LayoutDashboard,
  LogOut,
  PanelLeft,
  Search,
  UserCheck,
  UserCog,
  UploadCloud,
  FilePlus2,
} from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import Image from "next/image";

const AdminNav = () => (
  <>
    <NavItem href="/admin/dealer-management" icon={UserCog}>
      Dealer Management
    </NavItem>
    <NavItem href="/admin/approved-dealers" icon={UserCheck}>
      Approved Dealers
    </NavItem>
    <NavItem href="/admin/jackets" icon={FileText}>
      All Jackets
    </NavItem>
    <NavItem href="/admin/jackets/new" icon={FilePlus2}>
      New Jacket
    </NavItem>
    <NavItem href="/admin/staging/invoices" icon={UploadCloud}>
      Staging
    </NavItem>
  </>
);

const DealerNav = () => (
  <>
    <NavItem href="/dealer/jackets" icon={LayoutDashboard}>
      My Jackets
    </NavItem>
  </>
);

const NavItem = ({ href, icon: Icon, children }: { href: string; icon: React.ElementType; children: React.ReactNode }) => {
  const pathname = usePathname();
  const isActive = pathname.startsWith(href);
  return (
      <Link
        href={href}
        className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
            isActive && "bg-muted text-primary"
        )}
      >
        <Icon className="h-4 w-4" />
        {children}
      </Link>
  );
};

function AppShellSkeleton() {
    return (
        <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
            <div className="hidden border-r bg-muted/40 md:block">
                <div className="flex h-full max-h-screen flex-col gap-2">
                    <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
                        <Skeleton className="h-6 w-32" />
                    </div>
                    <div className="flex-1">
                        <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
                            <Skeleton className="h-8 my-1" />
                            <Skeleton className="h-8 my-1" />
                            <Skeleton className="h-8 my-1" />
                        </nav>
                    </div>
                </div>
            </div>
            <div className="flex flex-col">
                <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6">
                    <Skeleton className="h-8 w-8 rounded-md md:hidden" />
                    <div className="w-full flex-1">
                         <Skeleton className="h-8 w-full max-w-sm" />
                    </div>
                    <Skeleton className="h-10 w-10 rounded-full" />
                </header>
                <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
                     <Skeleton className="h-32 w-full" />
                     <Skeleton className="h-64 w-full" />
                </main>
            </div>
        </div>
    );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { isAdmin, user, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast({ title: "Signed Out", description: "You have been successfully signed out." });
      router.replace("/");
    } catch (error: any) {
      toast({ title: "Sign Out Error", description: error.message, variant: "destructive" });
    }
  };

  if (loading) {
      return <AppShellSkeleton />;
  }

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
      <div className="hidden border-r bg-muted/40 md:block">
        <div className="flex h-full max-h-screen flex-col gap-2">
          <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <Image src="/vintra/logomark-white.svg" alt="Vintra Logo" width={24} height={24} />
              <span className="">Vintra</span>
            </Link>
          </div>
          <div className="flex-1">
            <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
              {isAdmin ? <AdminNav /> : <DealerNav />}
            </nav>
          </div>
        </div>
      </div>
      <div className="flex flex-col">
        <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6">
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="shrink-0 md:hidden"
              >
                <PanelLeft className="h-5 w-5" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex flex-col">
              <nav className="grid gap-2 text-lg font-medium">
                <Link
                  href="/"
                  className="flex items-center gap-2 text-lg font-semibold mb-4"
                >
                  <Image src="/vintra/logomark-white.svg" alt="Vintra" width={24} height={24} />
                  <span className="sr-only">Vintra</span>
                </Link>
                {isAdmin ? <AdminNav /> : <DealerNav />}
              </nav>
            </SheetContent>
          </Sheet>
          <div className="w-full flex-1">
            <form>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search..."
                  className="w-full appearance-none bg-background pl-8 shadow-none md:w-2/3 lg:w-1/3"
                />
              </div>
            </form>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="icon" className="rounded-full">
                 { user?.photoURL ? <Image src={user.photoURL} alt="User Avatar" width={36} height={36} className="rounded-full" /> : <UserCog className="h-5 w-5" /> }
                <span className="sr-only">Toggle user menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{user?.email || 'My Account'}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled>Settings</DropdownMenuItem>
              <DropdownMenuItem disabled>Support</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>Logout</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
            {children}
        </main>
      </div>
    </div>
  );
}
