
"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { AuthDialog } from "@/components/auth/AuthDialog";
import { TiltCard } from "@/components/ui/tilt-card"; // Import the new component

/* ---------- small UI bits ---------- */

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] uppercase tracking-wider text-white/80">
      {children}
    </span>
  );
}

/* Visual card with glow/shimmer — NOTE: no ref, no onMouse* props here */
function GlowCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] shadow-lg ${className || ""}`}>
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(40%_120%_at_50%_0%,#fff2,transparent)]" />
      <div
        className="absolute -top-1/2 left-0 -z-10 h-[200%] w-full animate-[vintra-shimmer_5s_infinite]"
        style={{
          background:
            "linear-gradient(110deg, transparent 20%, transparent 40%, #ffffff30 50%, transparent 60%, transparent 80%)",
        }}
      />
      {children}
    </div>
  );
}

function AnimatedBorderCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`relative rounded-xl p-[0.2px] bg-transparent ${className || ""}`}>
      <div className="absolute inset-[-0.2px] rounded-xl -z-10 bg-[linear-gradient(90deg,transparent_45%,#e2e8f0_50%,transparent_55%)] bg-[length:300%_100%] animate-[vintra-border-shimmer_3s_linear_infinite]" />
      <GlowCard className="w-full h-full !rounded-lg !border-none">{children}</GlowCard>
    </div>
  );
}


/* Moving grid */
function GridLines() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-20">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)] animate-[vintra-grid_20s_linear_infinite]" />
    </div>
  );
}

/* Glow background */
function AuroraBG() {
  return (
    <div
      className="pointer-events-none fixed top-0 left-0 h-full w-full -z-50 opacity-20 blur-[100px]"
      style={{
        background:
          "radial-gradient(at 20% 20%, #6366f1 0px, transparent 50%), radial-gradient(at 80% 20%, #4f46e5 0px, transparent 50%), radial-gradient(at 20% 80%, #a78bfa 0px, transparent 50%), radial-gradient(at 80% 80%, #c4b5fd 0px, transparent 50%)",
      }}
    />
  );
}

/* ---------- Page ---------- */

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
      className="relative min-h-dvh overflow-x-hidden bg-zinc-950 font-sans text-white"
      style={{ ["--mouse-x" as any]: `${mousePosition.x}px`, ["--mouse-y" as any]: `${mousePosition.y}px` }}
    >
      <AuthDialog open={isModalOpen} onOpenChange={setIsModalOpen} defaultTab={defaultTab} />

      {/* spotlight follows cursor */}
      <div
        className="pointer-events-none fixed inset-0 z-30 transition duration-300"
        style={{ background: `radial-gradient(600px at var(--mouse-x) var(--mouse-y), rgba(29, 78, 216, 0.1), transparent 80%)` }}
      />

      <AuroraBG />
      <GridLines />

      <main>
        {/* HERO */}
        <section className="relative mx-auto max-w-7xl px-4 pt-32 md:pt-40">
          <div className="pointer-events-none absolute -top-40 left-1/2 h-[40rem] w-[70rem] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(99,102,241,0.6),transparent)] blur-3xl" />
          <div className="relative text-center">
            <Tag>For Independent, Specialty, & Wholesale Dealers</Tag>
            <h1 className="mt-4 font-manrope text-4xl font-bold tracking-tight md:text-6xl">
              The All‑in‑One Platform for <span className="text-white/80">Powersports Dealers</span>
            </h1>
            <p className="mt-6 mx-auto max-w-2xl text-lg text-white/80">
              Vintra is your unfair advantage. We eliminate paperwork headaches, give you exclusive access to wholesale
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
                <div className="h-full w-full rounded-full bg-[radial-gradient(closest-side,rgba(99,102,241,0.25),transparent)] blur-3xl animate-[vintra-pulse_6s_ease-in-out_infinite]" />
              </div>
              <div className="relative mx-auto max-w-4xl">
                <div className="pointer-events-none absolute -inset-2.5 rounded-xl bg-indigo-500/15 blur-xl z-0" />
                <TiltCard className="relative z-10">
                  <img
                    src="https://placehold.co/1024x576/000000/FFFFFF?text=Vintra+Dashboard"
                    alt="Vintra dashboard"
                    className="w-full h-auto rounded-lg"
                  />
                </TiltCard>
              </div>
              <p className="mt-4 text-center text-xs text-white/60">A clean, intuitive dashboard to manage all your jackets.</p>
            </div>
          </div>
        </section>

        {/* FEATURES */}
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
                  Leverage our world‑class marketing tools and services with percision data to reach more buyers. We help you market your inventory effectively and close deals quicker.
                </p>
              </div>
            </TiltCard>
          </div>
        </section>

        {/* SCREENSHOT + COPY */}
        <section className="relative mx-auto mt-24 max-w-7xl px-4">
          <div className="grid items-center gap-12 md:grid-cols-2">
            <div className="order-2 md:order-1">
              <div className="relative">
                <div className="pointer-events-none absolute -inset-2.5 rounded-xl bg-indigo-500/15 blur-xl z-0" />
                <AnimatedBorderCard className="relative z-10">
                  <div className="p-2">
                    <img
                      src="https://placehold.co/800x600/000000/FFFFFF?text=AI+Parse+Flow"
                      alt="AI Parse flow"
                      className="w-full h-auto rounded-lg"
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

        {/* PORTAL */}
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
                <div className="pointer-events-none absolute -inset-2.5 rounded-xl bg-indigo-500/15 blur-xl z-0" />
                <AnimatedBorderCard className="relative z-10">
                  <div className="p-2">
                    <img
                      src="https://placehold.co/800x600/000000/FFFFFF?text=Dealer+Portal"
                      alt="Dealer Portal view"
                      className="w-full h-auto rounded-lg"
                    />
                  </div>
                </AnimatedBorderCard>
              </div>
              <p className="mt-3 text-xs text-white/60">Give your wholesale dealers a clean, professional experience.</p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="relative my-24 py-20">
          <div className="pointer-events-none absolute inset-0 -z-20 bg-[radial-gradient(circle_at_50%_120%,rgba(99,102,241,0.4),transparent_40%)]" />
          <div
            className="pointer-events-none absolute inset-0 -z-10 bg-zinc-950/50 backdrop-blur-sm"
            style={{ maskImage: "linear-gradient(to bottom, transparent, black 20%, black 80%, transparent)" }}
          />
          <div className="relative mx-auto max-w-4xl px-4 text-center">
            <h2 className="font-manrope text-4xl font-bold tracking-tight md:text-5xl">Ready to Supercharge Your Dealership?</h2>
            <p className="mt-4 text-lg text-white/80">Join the dealers who use Vintra to save time, source inventory, and sell more units. No credit card required.</p>
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

      {/* inline keyframes for this page (safe) */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700;800&family=Inter:wght@400;500&display=swap');
        body { font-family: 'Inter', sans-serif; }
        .font-manrope { font-family: 'Manrope', sans-serif; }
        @keyframes vintra-shimmer {
          0% { transform: translateX(-100%) skewX(-15deg); }
          100% { transform: translateX(200%) skewX(-15deg); }
        }
        @keyframes vintra-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.05); }
        }
        @keyframes vintra-grid {
          0% { background-position: 0% 0%; }
          100% { background-position: -48px -48px; }
        }
        @keyframes vintra-border-shimmer {
          0% { background-position: 0% 50%; }
          100% { background-position: 150% 50%; }
        }
      `,
        }}
      />
    </div>
  );
}
