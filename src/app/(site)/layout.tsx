
"use client";

import React, { useState, useEffect } from "react";
import SiteHeader from "./_components/SiteHeader";
import Footer from "./_components/Footer";
import { AuthDialog } from "@/components/auth/AuthDialog";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalDefaultTab, setAuthModalDefaultTab] = useState<"sign-in" | "create-account">("sign-in");

  useEffect(() => {
    const handleAuthRequest = (event: Event) => {
      const customEvent = event as CustomEvent<{ mode: "sign-in" | "create-account" }>;
      setAuthModalDefaultTab(customEvent.detail.mode);
      setIsAuthModalOpen(true);
    };

    window.addEventListener("vintra:auth", handleAuthRequest);
    return () => {
      window.removeEventListener("vintra:auth", handleAuthRequest);
    };
  }, []);
  
  const handleAuthClick = (mode: "sign-in" | "create-account") => {
    setAuthModalDefaultTab(mode);
    setIsAuthModalOpen(true);
  };

  return (
    <div className="min-h-dvh bg-[#0B0F1A] text-white" data-site-layout>
      <AuthDialog
        open={isAuthModalOpen}
        onOpenChange={setIsAuthModalOpen}
        defaultTab={authModalDefaultTab}
      />
      <SiteHeader onAuthClick={handleAuthClick} />
      <main>{children}</main>
      <Footer />
    </div>
  );
}
