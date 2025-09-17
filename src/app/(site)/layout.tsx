"use client";

import React, { useState } from "react";
import SiteHeader from "./_components/SiteHeader";
import Footer from "./_components/Footer";
import { AuthDialog } from "@/components/auth/AuthDialog";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalDefaultTab, setAuthModalDefaultTab] = useState<"sign-in" | "create-account">("sign-in");

  // This function clones the children (the page component) and injects the modal control props into it.
  const childrenWithProps = React.Children.map(children, child => {
    if (React.isValidElement(child)) {
      return React.cloneElement(child as React.ReactElement<any>, { 
        setAuthModalOpen: setIsAuthModalOpen,
        setAuthModalDefaultTab: setAuthModalDefaultTab
      });
    }
    return child;
  });

  return (
    <div className="min-h-dvh bg-[#0B0F1A] text-white">
      <AuthDialog
        open={isAuthModalOpen}
        onOpenChange={setIsAuthModalOpen}
        defaultTab={authModalDefaultTab}
      />
      <SiteHeader 
        setAuthModalOpen={setIsAuthModalOpen}
        setAuthModalDefaultTab={setAuthModalDefaultTab}
      />
      <main>{childrenWithProps}</main>
      <Footer />
    </div>
  );
}
