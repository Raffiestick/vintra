
"use client";
import "../globals.css";
import React, { useState, useEffect } from "react";
import SiteHeader from "./_components/SiteHeader";
import Footer from "./_components/Footer";
import { AuthDialog } from "@/components/auth/AuthDialog";
import { AuthProvider } from "@/hooks/use-auth-provider";

type AuthTab = "sign-in" | "create-account";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalDefaultTab, setAuthModalDefaultTab] = useState<AuthTab>("sign-in");
  
  useEffect(() => {
    const handleAuthEvent = (event: Event) => {
        const customEvent = event as CustomEvent;
        const { action, tab } = customEvent.detail || {};

        if (action === 'open' && (tab === 'sign-in' || tab === 'create-account')) {
            setAuthModalDefaultTab(tab);
            setIsAuthModalOpen(true);
        }
    };
    
    window.addEventListener('vintra:auth', handleAuthEvent);

    return () => {
        window.removeEventListener('vintra:auth', handleAuthEvent);
    };
  }, []);

  return (
    <AuthProvider>
      <div className="min-h-dvh bg-[#0B0F1A] text-white">
        <div id="auth-dialog-root-global" data-auth-global-root="true">
            <AuthDialog
              open={isAuthModalOpen}
              onOpenChange={setIsAuthModalOpen}
              defaultTab={authModalDefaultTab}
            />
        </div>
        <SiteHeader />
        <main>{children}</main>
        <Footer />
      </div>
    </AuthProvider>
  );
}
