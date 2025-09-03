"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AuthModal } from "@/components/auth/AuthModal";

export default function Home() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background text-foreground">
      <div className="container mx-auto flex flex-col items-center justify-center text-center p-4">
        <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl mb-4 bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
          RizeUp Dealer Connect
        </h1>
        <p className="max-w-xl text-lg text-muted-foreground mb-8">
          The ultimate portal for our trusted dealers. Access exclusive resources, tools, and support to grow your business.
        </p>
        <Button onClick={() => setIsModalOpen(true)} size="lg" className="font-bold">
          Dealer Login
        </Button>
      </div>
      <AuthModal open={isModalOpen} onOpenChange={setIsModalOpen} />
    </main>
  );
}
