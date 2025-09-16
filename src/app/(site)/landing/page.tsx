"use client";

import React, { useState, useEffect } from "react";
import { AuthDialog } from "@/components/auth/AuthDialog";
import { TiltCard } from "@/components/ui/tilt-card";
import Image from "next/image";
import placeholderImages from '@/lib/placeholder-images.json';
import SiteHeader from "@/components/auth/SiteHeader";
import Link from "next/link";

function Footer() {
  return (
    <footer className="border-t border-white/10 py-16">
        <div className="mx-auto max-w-7xl px-4 text-sm text-white/80">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4 lg:grid-cols-5">
            <div className="col-span-2 md:col-span-4 lg:col-span-1">
              <Link href="/landing" className="group mb-4 flex items-center gap-3">
                <h3 className="text-xl font-bold">RizeUp</h3>
              </Link>
              <p className="text-white/60">Automated dealer back-office.</p>
            </div>
            <div>
              <h4 className="mb-3 font-semibold text-white">
                Product
              </h4>
              <ul className="space-y-2 text-white/70">
                <li>
                  <Link href="/landing#features" className="hover:text-white">
                    Features
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="mb-3 font-semibold text-white">
                Company
              </h4>
              <ul className="space-y-2 text-white/70">
                <li>
                  <Link href="/about" className="hover:text-white">
                    About
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="mb-3 font-semibold text-white">
                Legal
              </h4>
              <ul className="space-y-2 text-white/70">
                <li>
                  <Link href="/privacy" className="hover:text-white">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="hover:text-white">
                    Terms of Service
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-16 flex items-center justify-between border-t border-white/10 pt-8 text-white/60">
            <p>© 2024 RizeUp Dealer Connect. All rights reserved.</p>
          </div>
        </div>
      </footer>
  )
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] uppercase tracking-wider text-white/80">
      {children}
    </span>
  );
}

function AnimatedBorderCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`relative rounded-xl p-[1px] bg-transparent ${className || ""}`}>
      <div className="absolute inset-[-1px] rounded-xl -z-10 bg-[linear-gradient(90deg,transparent_45%,#e2e8f0_50%,transparent_55%)] bg-[length:300%_100%] animate-[vintra-border-shimmer_3s_linear_infinite]" />
      <div className="w-full h-full rounded-lg bg-[#0B0F1A]">
        {children}
      </div>
    </div>
  );
}

function GridLines() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-20">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)] animate-[vintra-grid_20s_linear_infinite]" />
    </div>
  );
}

function AuroraBG() {
  return (
    <div
      className="pointer-events-none fixed top-0 left-0 h-full w-full -z-50 opacity-20 blur-[100px]"
      style={{
        background:
          "radial-gradient(at 20% 20%, #7957D6 0px, transparent 50%), radial-gradient(at 80% 20%, #BE1DE5 0px, transparent 50%), radial-gradient(at 20% 80%, #7957D6 0px, transparent 50%), radial-gradient(at 80% 80%, #BE1DE5 0px, transparent 50%)",
      }}
    />
  );
}

export default function LandingPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [defaultTab, setDefaultTab] = useState<"sign-in" | "create-account">("sign-in");
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const onMove = (e: MouseEvent) => setMousePosition({ x: e.clientX, y: e.clientY });
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  const openModal = (tab: "sign-in" | "create-account") => {
    setDefaultTab(tab);
    setIsModalOpen(true);
  };

  return (
    <div
      className="relative min-h-dvh overflow-x-hidden bg-[#0B0F1A] font-sans text-white"
      style={{ ["--mouse-x" as any]: `${mousePosition.x}px`, ["--mouse-y" as any]: `${mousePosition.y}px` }}
    >
      <SiteHeader />
      <AuthDialog open={isModalOpen} onOpenChange={setIsModalOpen} defaultTab={defaultTab} />

      <div
        className="pointer-events-none fixed inset-0 z-30 transition duration-300"
        style={{ background: `radial-gradient(600px at var(--mouse-x) var(--mouse-y), rgba(190, 29, 229, 0.1), transparent 80%)` }}
      />

      <AuroraBG />
      <GridLines />

      <main>
        <section className="relative mx-auto max-w-7xl px-4 pt-32 md:pt-40">
          <div className="pointer-events-none absolute -top-40 left-1/2 h-[40rem] w-[70rem] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(121,87,214,0.6),transparent)] blur-3xl" />
          <div className="relative text-center">
            <Tag>For Independent, Specialty, & Wholesale Dealers</Tag>
            <h1 className="mt-4 font-manrope text-4xl font-bold tracking-tight md:text-6xl">
              The All‑in‑One Platform for <span className="text-white/80">Powersports Dealers</span>
            </h1>
            <p className="mt-6 mx-auto max-w-2xl text-lg text-white/80">
              RizeUp is your unfair advantage. We eliminate paperwork headaches, give you exclusive access to wholesale
              powersports inventory, and provide the marketing tools you need to sell faster. Spend less time on admin and more time moving units.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <button
                onClick={() => openModal("create-account")}
                className="rounded-md bg-white px-5 py-3 text-base font-semibold text-black hover:bg-zinc-200 transition-all duration-300 transform hover:scale-105"
              >
                Become An Authorized Dealer
              </button>
              <a
                href="#features"
                className="rounded-md border border-white/15 px-5 py-3 text-base font-medium hover:bg-white/10 transition-all duration-300"
              >
                See features
              </a>
            </div>
            <div className="mt-8 text-xs text-white/60">Streamline Operations · Source Inventory · Sell Faster</div>

            <div className="relative mt-16">
              <div className="absolute -inset-12 top-1/2 -translate-y-1/2 z-0">
                <div className="h-full w-full rounded-full bg-[radial-gradient(closest-side,rgba(121,87,214,0.25),transparent)] blur-3xl animate-[vintra-pulse_6s_ease-in-out_infinite]" />
              </div>
              <div className="relative mx-auto max-w-4xl">
                <div className="pointer-events-none absolute -inset-2.5 rounded-xl bg-primary/15 blur-xl z-0" />
                <TiltCard className="relative z-10">
                  <Image
                    src={placeholderImages.dashboard.src}
                    alt={placeholderImages.dashboard.alt}
                    width={placeholderImages.dashboard.width}
                    height={placeholderImages.dashboard.height}
                    className="w-full h-auto rounded-lg"
                    data-ai-hint="dashboard analytics"
                  />
                </TiltCard>
              </div>
              <p className="mt-4 text-center text-xs text-white/60">A clean, intuitive dashboard to manage all your jackets.</p>
            </div>
          </div>
        </section>

        <section id="features" className="relative mx-auto mt-24 max-w-7xl px-4">
          <div className="grid gap-8 md:grid-cols-3">
            <TiltCard>
              <div className="p-6">
                <div className="text-sm opacity-80">Automate Your Paperwork</div>
                <h3 className="mt-1 font-manrope text-lg font-semibold">From Auction to Deal Jacket in Seconds</h3>
                <p className="mt-2 text-sm text-white/80">
                  Stop wasting hours on manual data entry. Our AI instantly processes auction sheets, invoices, and titles to create perfect deal jackets so you can focus on the sale.
                </p>
              </div>
            </TiltCard>
            <TiltCard>
              <div className="p-6">
                <div className="text-sm opacity-80">Exclusive Inventory Access</div>
                <h3 className="mt-1 font-manrope text-lg font-semibold">Tap into the Wholesale Marketplace</h3>
                <p className="mt-2 text-sm text-white/80">
                  Access a curated selection of pre‑owned powersports at wholesale prices. Find the Marine, Motorcycle, RV, Trailer, or eBike inventory your customers want.
                </p>
              </div>
            </TiltCard>
            <TiltCard>
              <div className="p-6">
                <div className="text-sm opacity-80">Pro Marketing Tools</div>
                <h3 className="mt-1 font-manrope text-lg font-semibold">Sell Faster, Smarter</h3>
                <p className="mt-2 text-sm text-white/80">
                  Leverage our AI-powered tools to generate compelling marketing copy and reach more buyers. We help you market your inventory effectively and close deals quicker.
                </p>
              </div>
            </TiltCard>
          </div>
        </section>

        <section className="relative mx-auto mt-24 max-w-7xl px-4">
          <div className="grid items-center gap-12 md:grid-cols-2">
            <div className="order-2 md:order-1">
              <div className="relative">
                <div className="pointer-events-none absolute -inset-2.5 rounded-xl bg-primary/15 blur-xl z-0" />
                <AnimatedBorderCard className="relative z-10">
                  <div className="p-2">
                     <Image
                        src={placeholderImages.aiFlow.src}
                        alt={placeholderImages.aiFlow.alt}
                        width={placeholderImages.aiFlow.width}
                        height={placeholderImages.aiFlow.height}
                        className="w-full h-auto rounded-lg"
                        data-ai-hint="data processing"
                      />
                  </div>
                </AnimatedBorderCard>
              </div>
              <p className="mt-3 text-xs text-white/60">Our AI instantly turns any document into actionable data.</p>
            </div>
            <div className="order-1 md:order-2">
              <h2 className="font-manrope text-3xl font-bold tracking-tight md:text-4xl">Streamline Your Operations</h2>
              <ul className="mt-4 space-y-3 text-base text-white/80">
                <li className="flex items-start gap-2"><span>•</span><span>Reliable, crash‑free document processing.</span></li>
                <li className="flex items-start gap-2"><span>•</span><span>Flawless data accuracy on every single vehicle.</span></li>
                <li className="flex items-start gap-2"><span>•</span><span>Automate your fee structures and calculations.</span></li>
              </ul>
            </div>
          </div>
        </section>

        <section className="relative mx-auto mt-24 max-w-7xl px-4">
          <div className="grid items-center gap-12 md:grid-cols-2">
            <div>
              <h2 className="font-manrope text-3xl font-bold tracking-tight md:text-4xl">A Professional Portal for Your Partners</h2>
              <ul className="mt-4 space-y-3 text-base text-white/80">
                <li className="flex items-start gap-2"><span>•</span><span>Wholesale partners see only the jackets assigned to them.</span></li>
                <li className="flex items-start gap-2"><span>•</span><span>Easily track financial status and download generated packets.</span></li>
                <li className="flex items-start gap-2"><span>•</span><span>Secure document access unlocks when the balance is paid.</span></li>
              </ul>
            </div>
            <div>
              <div className="relative">
                <div className="pointer-events-none absolute -inset-2.5 rounded-xl bg-primary/15 blur-xl z-0" />
                <AnimatedBorderCard className="relative z-10">
                  <div className="p-2">
                    <Image
                      src={placeholderImages.dealerPortal.src}
                      alt={placeholderImages.dealerPortal.alt}
                      width={placeholderImages.dealerPortal.width}
                      height={placeholderImages.dealerPortal.height}
                      className="w-full h-auto rounded-lg"
                      data-ai-hint="interface user"
                    />
                  </div>
                </AnimatedBorderCard>
              </div>
              <p className="mt-3 text-xs text-white/60">Give your wholesale dealers a clean, professional experience.</p>
            </div>
          </div>
        </section>

        <section className="relative my-24 py-20">
          <div className="pointer-events-none absolute inset-0 -z-20 bg-[radial-gradient(circle_at_50%_120%,rgba(121,87,214,0.4),transparent_40%)]" />
          <div
            className="pointer-events-none absolute inset-0 -z-10 bg-[#0B0F1A]/50 backdrop-blur-sm"
            style={{ maskImage: "linear-gradient(to bottom, transparent, black 20%, black 80%, transparent)" }}
          />
          <div className="relative mx-auto max-w-4xl px-4 text-center">
            <h2 className="font-manrope text-4xl font-bold tracking-tight md:text-5xl">Ready to Supercharge Your Dealership?</h2>
            <p className="mt-4 text-lg text-white/80">Join the dealers who use RizeUp to save time, source inventory, and sell more units. No credit card required.</p>
            <div className="mt-8 flex justify-center gap-4">
              <button
                onClick={() => openModal("create-account")}
                className="rounded-md bg-white px-5 py-3 text-base font-semibold text-black hover:bg-zinc-200 transition-all duration-300 transform hover:scale-105"
              >
                Become An Authorized Dealer
              </button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
