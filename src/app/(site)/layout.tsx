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

  // React.cloneElement is used to pass the onAuthClick prop to child components like the landing page.
  const childrenWithProps = React.Children.map(children, (child) => {
    if (React.isValidElement(child)) {
      // @ts-ignore - It's safe to ignore here as we know we're adding a prop.
      return React.cloneElement(child, { onAuthClick: handleAuthClick });
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
      <SiteHeader onAuthClick={handleAuthClick} />
      <main>{childrenWithProps}</main>
      <Footer />
    </div>
  );
}
