"use client";

import Link from "next/link";
import AuroraBG from "@/components/marketing/AuroraBG";
import GridLines from "@/components/marketing/GridLines";
import ShimmerCard from "@/components/marketing/ShimmerCard";
import TiltImage from "@/components/marketing/TiltImage";
import { useState } from "react";

function Tag({ children }: any) {
  return (
    <span className="inline-flex items-center rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] uppercase tracking-wider text-white/80">
      {children}
    </span>
  );
}

export default function LandingPage() {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative min-h-dvh vintra-bg text-white">
      {/* animated ambience */}
      <AuroraBG />
      <GridLines />

      {/* HERO */}
      <section className="relative mx-auto max-w-7xl px-4 pt-16">
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-6 md:p-10">
          {/* additional glow only for hero */}
          <div className="pointer-events-none absolute -top-32 left-1/2 h-[36rem] w-[60rem] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(99,102,241,0.55),transparent)] blur-3xl" />

          <div className="grid gap-10 md:grid-cols-2 md:gap-8">
            <div className="flex flex-col justify-center">
              <Tag>Dealer Management · Built on Firebase</Tag>
              <h1 className="mt-4 font-manrope text-4xl leading-tight md:text-5xl">
                Your dealer <span className="text-white/90">back office</span>, on autopilot.
              </h1>
              <p className="mt-4 max-w-xl text-white/80">
                Vintra turns auction PDFs into production‑ready jackets. AI parses invoices; Vintra
                generates <strong>Invoices</strong>, <strong>Bills of Sale</strong>, and full <strong>Packets</strong> automatically—then gives dealers a clean read‑only portal.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <button onClick={() => setOpen(true)} className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-zinc-200">
                  Get started
                </button>
                <Link href="#features" className="rounded-md border border-white/15 px-4 py-2 text-sm font-medium hover:bg-white/10">
                  See features
                </Link>
              </div>
              <div className="mt-6 text-xs text-white/60">
                AI parsing (Gemini) · PDFs via puppeteer‑core + pdf‑lib · Gen2 Cloud Functions.
              </div>
            </div>

            <div className="relative">
              <ShimmerCard>
                <TiltImage src="/vintra/placeholder-dashboard.svg" alt="Vintra dashboard" />
              </ShimmerCard>
              <p className="mt-3 text-center text-xs text-white/60">
                Replace with a screenshot of <code>/admin/jackets</code>.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURE CARDS */}
      <section id="features" className="relative mx-auto mt-16 max-w-7xl px-4">
        <div className="grid gap-6 md:grid-cols-3">
          <ShimmerCard>
            <div className="p-5">
              <div className="text-sm opacity-80">AI invoice parsing</div>
              <h3 className="mt-1 font-manrope text-lg">Drop an auction PDF. Get units.</h3>
              <p className="mt-2 text-sm text-white/80">
                Upload once; we download from Storage, force a Node Buffer, parse text, and ask Gemini for strict JSON. No “ENOENT” crashes.
              </p>
            </div>
          </ShimmerCard>
          <ShimmerCard>
            <div className="p-5">
              <div className="text-sm opacity-80">One‑click PDFs</div>
              <h3 className="mt-1 font-manrope text-lg">Invoice, BOS, and full Packet</h3>
              <p className="mt-2 text-sm text-white/80">
                Server‑rendered with puppeteer‑core and merged with pdf‑lib. Packet = cover → invoice → BOS.
              </p>
            </div>
          </ShimmerCard>
          <ShimmerCard>
            <div className="p-5">
              <div className="text-sm opacity-80">Dealer‑ready jackets</div>
              <h3 className="mt-1 font-manrope text-lg">Clean read‑only dealer portal</h3>
              <p className="mt-2 text-sm text-white/80">
                Admin creates/assigns; dealer views their jackets and activity.
              </p>
            </div>
          </ShimmerCard>
        </div>
      </section>

      {/* SCREENSHOT DUO 1 */}
      <section className="relative mx-auto mt-20 max-w-7xl px-4">
        <div className="grid items-center gap-10 md:grid-cols-2">
          <div className="order-2 md:order-1">
            <ShimmerCard>
              <div className="p-2">
                <TiltImage src="/vintra/placeholder-ai-parse.svg" alt="AI Parse flow" />
              </div>
            </ShimmerCard>
            <p className="mt-3 text-xs text-white/60">
              “New Jacket → AI Parse” posts <code>gcsPath</code> to Gen2 parse function. 
            </p>
          </div>
          <div className="order-1 md:order-2">
            <h2 className="font-manrope text-2xl md:text-3xl">From PDF → Jacket in minutes</h2>
            <ul className="mt-4 space-y-2 text-sm text-white/80">
              <li>• Buffer‑safe parsing (no ENOENT fallbacks)</li>
              <li>• Strict JSON extraction; VIN uppercase; numeric coercion</li>
              <li>• Default management fee = 100 on units</li>
            </ul>
          </div>
        </div>
      </section>
      
       {/* SCREENSHOT DUO 2 */}
      <section className="relative mx-auto mt-20 max-w-7xl px-4">
        <div className="grid items-center gap-10 md:grid-cols-2">
          <div>
            <h2 className="font-manrope text-2xl md:text-3xl">A clean portal for every dealer</h2>
             <ul className="mt-4 space-y-2 text-sm text-white/80">
              <li>• Dealers see only jackets assigned to them</li>
              <li>• View financial status and download generated packets</li>
              <li>• Documents tab unlocks when balance is paid</li>
            </ul>
          </div>
          <div>
            <ShimmerCard>
              <div className="p-2">
                <TiltImage src="/vintra/placeholder-packet.svg" alt="Dealer Portal view" />
              </div>
            </ShimmerCard>
             <p className="mt-3 text-xs text-white/60">
              Read-only view at <code>/dealer/jackets/[vin]</code>
            </p>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="relative mt-24 py-12">
        <div className="relative text-center">
            <div className="pointer-events-none absolute -inset-12 -z-10 rounded-full bg-[radial-gradient(closest-side,rgba(59,130,246,0.45),transparent)] blur-3xl" />
            <h3 className="font-manrope text-3xl">Ready to stop wrestling PDFs?</h3>
            <p className="mt-3 text-white/80">Get your first jackets live in minutes.</p>
            <div className="mt-6 flex justify-center gap-3">
              <button onClick={() => setOpen(true)} className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-zinc-200">
                Get started
              </button>
              <Link href="/login" className="rounded-md border border-white/15 px-4 py-2 text-sm font-medium hover:bg-white/10">
                Sign in
              </Link>
            </div>
        </div>
      </section>

      {/* SIMPLE REGISTRATION MODAL WITH GLOW */}
      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <div className="relative z-10 w-[92%] max-w-md">
            <div className="pointer-events-none absolute -inset-8 -z-10 rounded-2xl bg-[radial-gradient(closest-side,rgba(99,102,241,0.35),transparent)] blur-2xl" />
            <ShimmerCard>
              <div className="rounded-xl p-6">
                <h4 className="font-manrope text-xl">Create your account</h4>
                <p className="mt-1 text-sm text-white/80">We’ll send you to the registration flow.</p>
                <div className="mt-4 flex gap-3">
                  <Link href="/register" className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-zinc-200">
                    Continue to register
                  </Link>
                  <button onClick={() => setOpen(false)} className="rounded-md border border-white/15 px-4 py-2 text-sm">
                    Cancel
                  </button>
                </div>
              </div>
            </ShimmerCard>
          </div>
        </div>
      )}
    </div>
  );
}
