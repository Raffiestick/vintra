"use client";

import React, { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import placeholderImages from "@/lib/placeholder-images.json";

/** Client-only tilt */
const TiltCard = dynamic(
  () => import("@/components/ui/tilt-card").then((m: any) => m.TiltCard ?? m.default),
  { ssr: false }
) as any;

/** Client-only dialog; we’ll only mount locally if there’s no global one */
const AuthDialogDynamic = dynamic(
  () => import("@/components/auth/AuthDialog").then((m: any) => m.AuthDialog ?? m.default),
  { ssr: false }
) as any;

/* ------------------------------ Small UI bits ------------------------------ */

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] uppercase tracking-wider text-white/80">
      {children}
    </span>
  );
}

function GlowCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] shadow-lg ${className || ""}`}
    >
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

/* moving grid */
function GridLines() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-20">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)] animate-[vintra-grid_20s_linear_infinite]" />
    </div>
  );
}

/* glow background */
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

/* --------------------------------- Page ----------------------------------- */

type AuthTab = "sign-in" | "create-account";
type AuthEventDetail = {
  action?: "open" | "close" | "open-login" | "open-register";
  tab?: AuthTab;
  mode?: "sign-in" | "create-account" | "login" | "register";
  __origin?: "landing" | "global";
};

export default function LandingPage(): JSX.Element {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [hasGlobalDialog, setHasGlobalDialog] = useState(false);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<AuthTab>("sign-in");

  // re-entrancy guard to avoid loops if events bounce
  const isReDispatching = useRef(false);

  // cursor spotlight
  useEffect(() => {
    const onMove = (e: MouseEvent) => setMousePosition({ x: e.clientX, y: e.clientY });
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  // Detect if a global AuthDialog exists; convention: any element with [data-auth-global-root]
  useEffect(() => {
    const check = () =>
      Boolean(document.querySelector("[data-auth-global-root], #auth-dialog-root-global"));
    setHasGlobalDialog(check());
  }, []);

  // Only attach a listener if we are the owner of the dialog.
  useEffect(() => {
    if (hasGlobalDialog) return; // global header/layout owns the dialog; we don't listen

    const onAuth = (e: Event) => {
      const detail = ((e as CustomEvent).detail ?? {}) as AuthEventDetail;

      if (detail.__origin === "landing") return; // ignore our own redispatches (paranoia)
      if (detail.action === "close") {
        setOpen(false);
        return;
      }

      const raw =
        detail.tab ??
        (detail.mode === "register" ? "create-account"
          : detail.mode === "login" ? "sign-in"
          : (detail.mode as AuthTab | undefined)) ??
        (detail.action === "open-register" ? "create-account"
          : detail.action === "open-login" ? "sign-in"
          : undefined);

      if (detail.action === "open" || raw) {
        const normalized: AuthTab = raw === "create-account" ? "create-account" : "sign-in";
        setTab(normalized);
        setOpen(true);
      }
    };

    window.addEventListener("vintra:auth", onAuth as EventListener);
    return () => window.removeEventListener("vintra:auth", onAuth as EventListener);
  }, [hasGlobalDialog]);

  // CTA helper: if there’s a global dialog, dispatch for it; else open our own
  const triggerAuth = (which: AuthTab) => {
    if (hasGlobalDialog) {
      if (isReDispatching.current) return;
      isReDispatching.current = true;
      window.dispatchEvent(
        new CustomEvent("vintra:auth", {
          detail: { action: "open", tab: which, __origin: "landing" } satisfies AuthEventDetail,
        })
      );
      // release the guard on next tick
      queueMicrotask(() => {
        isReDispatching.current = false;
      });
    } else {
      setTab(which);
      setOpen(true);
    }
  };

  return (
    <div
      className="relative min-h-dvh overflow-x-hidden bg-zinc-950 font-sans text-white"
      style={{ ["--mouse-x" as any]: `${mousePosition.x}px`, ["--mouse-y" as any]: `${mousePosition.y}px` }}
    >
      {/* NO header here (prevents double-header). Global header stays in layout. */}

      {/* Local AuthDialog only if there’s no global one */}
      {!hasGlobalDialog && (
        <div id="auth-dialog-root-local" data-auth-global-root={false}>
          <AuthDialogDynamic open={open} onOpenChange={setOpen} defaultTab={tab} />
        </div>
      )}

      {/* spotlight follows cursor */}
      <div
        className="pointer-events-none fixed inset-0 z-30 transition duration-300"
        style={{
          background: `radial-gradient(600px at var(--mouse-x) var(--mouse-y), rgba(29, 78, 216, 0.1), transparent 80%)`,
        }}
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
              The All-in-One Platform for <span className="text-white/80">Powersports Dealers</span>
            </h1>

            <p className="mt-6 mx-auto max-w-2xl text-lg text-white/80">
              Vintra is your unfair advantage. We eliminate paperwork headaches, give you exclusive access to wholesale
              powersports inventory, and provide the marketing tools you need to sell faster. Spend less time on admin and more time moving units.
            </p>

            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <button
                onClick={() => triggerAuth("create-account")}
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

            <div className="mt-8 text-xs text-white/60">
              Streamline Operations · Source Inventory · Sell Faster
            </div>

            {/* Tilted dashboard shot */}
            <div className="relative mt-16">
              <div className="absolute -inset-12 top-1/2 -translate-y-1/2 z-0">
                <div className="h-full w-full rounded-full bg-[radial-gradient(closest-side,rgba(99,102,241,0.25),transparent)] blur-3xl animate-[vintra-pulse_6s_ease-in-out_infinite]" />
              </div>
              <div className="relative mx-auto max-w-4xl">
                <div className="pointer-events-none absolute -inset-2.5 rounded-xl bg-indigo-500/15 blur-xl z-0" />
                <TiltCard className="relative z-10">
                  <Image
                    src={placeholderImages.dashboard.src}
                    alt={placeholderImages.dashboard.alt}
                    width={placeholderImages.dashboard.width}
                    height={placeholderImages.dashboard.height}
                    className="w-full h-auto rounded-lg"
                    data-ai-hint="dashboard analytics"
                    priority
                  />
                </TiltCard>
              </div>
              <p className="mt-4 text-center text-xs text-white/60">
                A clean, intuitive dashboard to manage all your jackets.
              </p>
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
                  Access a curated selection of pre-owned powersports at wholesale prices. Find the Marine, Motorcycle, RV, Trailer, or eBike inventory your customers want.
                </p>
              </div>
            </TiltCard>
            <TiltCard>
              <div className="p-6">
                <div className="text-sm opacity-80">Pro Marketing Tools</div>
                <h3 className="mt-1 font-manrope text-lg font-semibold">Sell Faster, Smarter</h3>
                <p className="mt-2 text-sm text-white/80">
                  Leverage our world-class marketing tools and services with precision data to reach more buyers. We help you market your inventory effectively and close deals quicker.
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
                <li className="flex items-start gap-2"><span>•</span><span>Reliable, crash-free document processing.</span></li>
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

        {/* CTA */}
        <section className="relative my-24 py-20">
          <div className="pointer-events-none absolute inset-0 -z-20 bg-[radial-gradient(circle_at_50%_120%,rgba(99,102,241,0.4),transparent_40%)]" />
          <div
            className="pointer-events-none absolute inset-0 -z-10 bg-zinc-950/50 backdrop-blur-sm"
            style={{ maskImage: "linear-gradient(to bottom, transparent, black 20%, black 80%, transparent)" }}
          />
          <div className="relative mx-auto max-w-4xl px-4 text-center">
            <h2 className="font-manrope text-4xl font-bold tracking-tight md:text-5xl">Ready to Supercharge Your Dealership?</h2>
            <p className="mt-4 text-lg text-white/80">
              Join the dealers who use Vintra to save time, source inventory, and sell more units. No credit card required.
            </p>
            <div className="mt-8 flex justify-center gap-4">
              <button
                onClick={() => triggerAuth("create-account")}
                className="rounded-md bg-white px-5 py-3 text-base font-semibold text-black hover:bg-zinc-200 transition-all duration-300 transform hover:scale-105"
              >
                Become An Authorized Dealer
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* Centered footer */}
      <footer className="mx-auto max-w-7xl px-4 pb-8">
        <div className="border-t border-white/10 pt-6 text-center text-sm text-white/70">
          © {new Date().getFullYear()} Vintra ·{" "}
          <a className="underline underline-offset-4 hover:text-white" href="/privacy">Privacy</a> ·{" "}
          <a className="underline underline-offset-4 hover:text-white" href="/terms">Terms</a> ·{" "}
          <a className="underline underline-offset-4 hover:text-white" href="/about">About</a>
        </div>
      </footer>

      {/* Page keyframes only */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
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
