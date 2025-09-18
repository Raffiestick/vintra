
"use client";

import React, { useState } from "react";
import SiteHeader from "./_components/SiteHeader";
import Footer from "./_components/Footer";
import { AuthDialog } from "@/components/auth/AuthDialog";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalDefaultTab, setAuthModalDefaultTab] = useState<"sign-in" | "create-account">("sign-in");

  const handleAuthClick = (mode: "sign-in" | "create-account") => {
    setAuthModalDefaultTab(mode);
    setIsAuthModalOpen(true);
  };

  // We need to pass the handler down to the children so the landing page can use it.
  // React.cloneElement is a good way to do this without prop-drilling through many layers.
  const childrenWithProps = React.Children.map(children, (child) => {
    if (React.isValidElement(child)) {
      // @ts-ignore
      return React.cloneElement(child, { onAuthClick: handleAuthClick });
    }
    return child;
  });

  return (
    <div className="min-h-dvh bg-[#0B0F1A] text-white" data-site-layout>
      <AuthDialog
        open={isAuthModalOpen}
        onOpenChange={setIsAuthModalOpen}
        defaultTab={authModalDefaultTab}
      />
      <SiteHeader onAuthClick={handleAuthClick} />
      <main>{childrenWithProps}</main>
      <Footer />
    </div>
  );
}
