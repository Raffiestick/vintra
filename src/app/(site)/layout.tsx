
"use client";

import { useState } from "react";
import Link from "next/link";
import { AuthDialog } from "@/components/auth/AuthDialog";
import "../globals.css";


export default function MarketingLayout({ children }: { children: React.ReactNode }) {
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [defaultTab, setDefaultTab] = useState<'sign-in' | 'create-account'>('sign-in');

    const openModal = (tab: 'sign-in' | 'create-account') => {
        setDefaultTab(tab);
        setIsAuthModalOpen(true);
    }
  
  return (
    <>
        <AuthDialog open={isAuthModalOpen} onOpenChange={setIsAuthModalOpen} defaultTab={defaultTab} />
        <div className="min-h-dvh bg-zinc-950 text-white antialiased">
                <header className="sticky top-0 z-50 border-b border-white/10 bg-black/30 backdrop-blur">
                  <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
                      <Link href="/landing" className="group flex items-center gap-3">
                      <img src="/vintra/wordmark.svg" alt="Vintra" className="h-6 opacity-90 transition group-hover:opacity-100" />
                      </Link>
                      <nav className="hidden items-center gap-6 text-sm md:flex">
                      <Link href="/landing#features" className="opacity-80 hover:opacity-100">Features</Link>
                      </nav>
                      <div className="flex items-center gap-3">
                      <button
                          onClick={() => openModal('sign-in')}
                          className="rounded-md px-3.5 py-2 text-sm font-semibold text-white/80 transition hover:text-white hover:bg-white/10"
                      >
                          Login
                      </button>
                      <button
                          onClick={() => openModal('create-account')}
                          className="rounded-md bg-white px-3.5 py-2 text-sm font-semibold text-black transition hover:bg-zinc-200"
                      >
                          Sign Up
                      </button>
                      </div>
                  </div>
                </header>

                <main>{children}</main>

                <footer className="bg-black py-16">
                  <div className="mx-auto max-w-7xl px-4 text-sm text-white/80">
                    <div className="grid grid-cols-2 gap-8 md:grid-cols-4 lg:grid-cols-5">
                      <div className="col-span-2 md:col-span-4 lg:col-span-1">
                         <Link href="/landing" className="group mb-4 flex items-center gap-3">
                            <img src="/vintra/wordmark.svg" alt="Vintra" className="h-7 opacity-90 transition group-hover:opacity-100" />
                         </Link>
                         <p className="text-white/60">Automated dealer back-office.</p>
                      </div>
                      <div>
                        <h4 className="mb-3 font-manrope font-semibold text-white">Product</h4>
                        <ul className="space-y-2 text-white/70">
                          <li><Link href="/landing#features" className="hover:text-white">Features</Link></li>
                          <li><Link href="/landing#integrations" className="hover:text-white">Integrations</Link></li>
                          <li><Link href="/landing#faq" className="hovertext-white">FAQ</Link></li>
                        </ul>
                      </div>
                      <div>
                        <h4 className="mb-3 font-manrope font-semibold text-white">Company</h4>
                         <ul className="space-y-2 text-white/70">
                          <li><Link href="/about" className="hover:text-white">About</Link></li>
                          <li><Link href="/landing#contact" className="hover:text-white">Contact</Link></li>
                        </ul>
                      </div>
                      <div>
                        <h4 className="mb-3 font-manrope font-semibold text-white">Legal</h4>
                         <ul className="space-y-2 text-white/70">
                          <li><Link href="/privacy" className="hover:text-white">Privacy Policy</Link></li>
                          <li><Link href="/terms" className="hover:text-white">Terms of Service</Link></li>
                        </ul>
                      </div>
                    </div>
                    <div className="mt-16 flex items-center justify-between border-t border-white/10 pt-8 text-white/60">
                      <p>© 2025 Vintra. All rights reserved.</p>
                    </div>
                  </div>
                </footer>
            </div>
    </>
  );
}
