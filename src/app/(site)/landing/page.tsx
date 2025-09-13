// app/(site)/landing/page.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { Sparkles, FileText, FolderArchive, Shield, Zap, Users } from "lucide-react";

const Section = ({ id, className = "", children }: any) => (
  <section id={id} className={`relative mx-auto max-w-7xl px-4 ${className}`}>{children}</section>
);

const Tag = ({ children }: any) => (
  <span className="inline-flex items-center rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] uppercase tracking-wider text-white/80">
    {children}
  </span>
);

export default function LandingPage() {
  return (
    <>
      {/* HERO */}
      <Section className="pt-16">
        <div className="relative overflow-hidden rounded-xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02]">
          {/* Glows */}
          <div className="pointer-events-none absolute -top-32 left-1/2 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(99,102,241,0.65),transparent)] blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-[radial-gradient(closest-side,rgba(236,72,153,0.6),transparent)] blur-3xl" />
          <div className="pointer-events-none absolute -bottom-28 -right-20 h-72 w-72 rounded-full bg-[radial-gradient(closest-side,rgba(16,185,129,0.5),transparent)] blur-3xl" />

          <div className="relative grid gap-10 px-8 py-16 md:grid-cols-2 md:gap-6 md:px-14 md:py-20">
            <div className="flex flex-col justify-center">
              <Tag>Dealer Management · Built on Firebase</Tag>
              <h1 className="mt-4 font-manrope text-4xl leading-tight md:text-5xl">
                Your dealer <span className="text-white/90">back office</span>, on autopilot.
              </h1>
              <p className="mt-4 max-w-xl text-white/80">
                Vintra turns auction PDFs into production‑ready jackets. AI parses invoices, and Vintra
                generates <strong>Invoices</strong>, <strong>Bills of Sale</strong>, and full <strong>Packets</strong> automatically—
                then gives dealers a clean read‑only portal.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/register"
                  className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-zinc-200"
                >
                  Get started
                </Link>
                <Link
                  href="#features"
                  className="rounded-md border border-white/15 px-4 py-2 text-sm font-medium hover:bg-white/10"
                >
                  See features
                </Link>
              </div>
              <div className="mt-6 text-xs text-white/60">
                AI parsing powered by Gemini · PDFs via puppeteer‑core + pdf‑lib · Gen2 Cloud Functions.
              </div>
            </div>

            {/* Hero screenshot card */}
            <div className="relative">
              <div className="relative mx-auto max-w-lg rounded-xl border border-white/15 bg-black/20 p-2 shadow-2xl ring-1 ring-white/10">
                <img
                  src="/vintra/placeholder-dashboard.svg"
                  alt="Vintra dashboard"
                  className="w-full rounded-lg"
                />
                {/* soft backlight behind image */}
                <div className="pointer-events-none absolute inset-0 -z-10 rounded-xl bg-[radial-gradient(closest-side,rgba(99,102,241,0.35),transparent)] blur-2xl" />
              </div>
              <p className="mt-3 text-center text-xs text-white/60">
                Example dashboard view (replace with a screenshot of <code>/admin/jackets</code>).
              </p>
            </div>
          </div>
        </div>
      </Section>

      {/* Social proof / logos strip (optional placeholders) */}
      <Section className="mt-12">
        <div className="flex flex-wrap items-center justify-center gap-8 opacity-70">
          <span className="text-xs">Built on Firebase & Google Cloud</span>
          <span className="text-xs">Chromium (serverless) via @sparticuz</span>
          <span className="text-xs">pdf‑lib</span>
          <span className="text-xs">Gemini 1.5</span>
        </div>
      </Section>

      {/* FEATURES */}
      <Section id="features" className="mt-20">
        <div className="grid gap-6 md:grid-cols-3">
          <Feature
            icon={<Sparkles className="h-5 w-5" />}
            title="AI invoice parsing"
            body="Drop in an auction PDF. Vintra extracts units, coerces numbers, and builds staging records automatically."
            note="Backed by Gemini; strict JSON; VIN normalization." 
          />
          <Feature
            icon={<FileText className="h-5 w-5" />}
            title="One‑click PDFs"
            body="Generate branded Invoices, Bills of Sale, and a compiled Packet (cover → invoice → BOS)."
            note="Server‑rendered with puppeteer‑core + pdf‑lib." 
          />
          <Feature
            icon={<FolderArchive className="h-5 w-5" />}
            title="Dealer‑ready jackets"
            body="Every unit gets a clean jacket with pricing, flags, documents, and an activity timeline."
            note="Dealer sees read‑only; admin controls everything." 
          />
          <Feature
            icon={<Zap className="h-5 w-5" />}
            title="Fast by default"
            body="Gen2 Cloud Functions + CDN‑backed Hosting keep page loads snappy and batch PDF work efficient."
            note="Optimized for throughput & stability." 
          />
          <Feature
            icon={<Shield className="h-5 w-5" />}
            title="Private & compliant"
            body="Access‑controlled Storage paths and Firestore rules ensure only the right people see the right docs."
            note="Dealer assignment gates reads." 
          />
          <Feature
            icon={<Users className="h-5 w-5" />}
            title="Simple onboarding"
            body="Invite a dealer, assign units, and Vintra handles the rest. Your team focuses on deals—not docs."
            note="Minutes to value." 
          />
        </div>
      </Section>

      {/* SCREENSHOTS */}
      <Section className="mt-24">
        <div className="grid items-center gap-10 md:grid-cols-2">
          <div className="relative order-2 md:order-1">
            <div className="relative rounded-xl border border-white/15 bg-black/20 p-2 ring-1 ring-white/10">
              <img src="/vintra/placeholder-ai-parse.svg" alt="AI Parse" className="w-full rounded-lg" />
              <div className="pointer-events-none absolute inset-0 -z-10 rounded-xl bg-[radial-gradient(closest-side,rgba(236,72,153,0.3),transparent)] blur-2xl" />
            </div>
            <p className="mt-3 text-xs text-white/60">
              “New Jacket → AI Parse” upload/parse flow. Post body sends <code>gcsPath</code> to Gen2 function. 
            </p>
          </div>
          <div className="order-1 md:order-2">
            <h2 className="font-manrope text-2xl md:text-3xl">From PDF → Jacket in minutes</h2>
            <p className="mt-3 text-white/80">
              Upload an auction invoice; Vintra downloads from GCS, forces a Node Buffer, parses text, and writes a
              staging invoice + staged units. Then one click creates the jacket.
            </p>
            <ul className="mt-5 space-y-2 text-sm text-white/80">
              <li>• Buffer‑safe parsing (no ENOENT fallbacks)</li>
              <li>• Strict JSON extraction; VIN uppercase; numeric coercion</li>
              <li>• Default management fee = 100 on units</li>
            </ul>
          </div>
        </div>
      </Section>

      {/* HOW IT WORKS */}
      <Section id="how-it-works" className="mt-24">
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-8">
          <div className="grid gap-8 md:grid-cols-3">
            <Step n="1" title="Upload invoice">
              Upload the auction PDF to <code>incoming/invoices/&lt;uid&gt;/…</code>. The UI posts the storage path as <code>gcsPath</code>.
            </Step>
            <Step n="2" title="AI extracts units">
              Gen2 function reads bytes, parses text, and asks Gemini for strict JSON (units + meta).
            </Step>
            <Step n="3" title="Generate PDFs">
              Create Invoice (with PAID watermark when both paid), Bill of Sale, and a cover‑first Packet.
            </Step>
          </div>
        </div>
      </Section>

      {/* PRICING */}
      <Section id="pricing" className="mt-24">
        <h2 className="text-center font-manrope text-3xl">Pricing</h2>
        <p className="mt-3 text-center text-white/75">
          Choose the plan that fits your volume. Scale up any time.
        </p>

        <div className="mt-8 grid gap-6 md:grid-cols-3">
          <Plan
            name="CORE"
            price="Contact"
            bullets={["AI Parse", "Invoice + BOS", "Dealer portal (read‑only)"]}
          />
          <Plan
            name="PRIME"
            price="Contact"
            bullets={["Everything in CORE", "Packets & extras", "Priority support"]}
            highlight
          />
          <Plan
            name="IGNITE"
            price="Contact"
            bullets={["High‑volume parsing", "Custom branding", "SLA + training"]}
          />
        </div>
      </Section>

      {/* FAQ */}
      <Section id="faq" className="mt-24">
        <div className="grid gap-6 md:grid-cols-2">
          <Faq q="How do you parse invoices?">
            We download the file from Storage, create a Node Buffer, parse text, then ask Gemini for strict JSON. This avoids
            the common “ENOENT … 05‑versions‑space.pdf” crash path.
          </Faq>
          <Faq q="How are PDFs generated?">
            Server‑side via puppeteer‑core (Chromium) and merged with pdf‑lib for the packet.
          </Faq>
          <Faq q="What does a dealer see?">
            A clean, read‑only view of their jackets and activity timeline; admins manage assignments and generation.
          </Faq>
          <Faq q="Can I try it now?">
            Yes—click “Get started” to register. We’ll grant access and guide you.
          </Faq>
        </div>
      </Section>

      {/* FINAL CTA */}
      <Section className="mt-24 mb-24">
        <div className="relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] p-8 text-center">
          <div className="pointer-events-none absolute -left-10 -top-24 h-72 w-72 rounded-full bg-[radial-gradient(closest-side,rgba(59,130,246,0.35),transparent)] blur-2xl" />
          <h3 className="font-manrope text-3xl">Ready to stop wrestling PDFs?</h3>
          <p className="mt-3 text-white/80">Get your first jackets live in minutes.</p>
          <div className="mt-6 flex justify-center gap-3">
            <Link href="/register" className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-zinc-200">
              Get started
            </Link>
            <Link href="/login" className="rounded-md border border-white/15 px-4 py-2 text-sm font-medium hover:bg-white/10">
              Sign in
            </Link>
          </div>
        </div>
      </Section>
    </>
  );
}

function Feature({
  icon,
  title,
  body,
  note,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  note?: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] p-5 transition hover:bg-white/[0.06]">
      <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-md bg-white/10 ring-1 ring-white/15">
        {icon}
      </div>
      <h3 className="font-manrope text-lg">{title}</h3>
      <p className="mt-1 text-sm text-white/80">{body}</p>
      {note && <p className="mt-2 text-xs text-white/60">{note}</p>}
      <div className="pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full bg-[radial-gradient(closest-side,rgba(255,255,255,0.06),transparent)] blur-2xl" />
    </div>
  );
}

function Step({ n, title, children }: any) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/20 p-5">
      <div className="text-xs text-white/60">Step {n}</div>
      <div className="mt-1 font-manrope text-lg">{title}</div>
      <div className="mt-2 text-sm text-white/80">{children}</div>
    </div>
  );
}

function Plan({ name, price, bullets, highlight = false }: any) {
  return (
    <div
      className={`rounded-xl border p-6 ${
        highlight ? "border-white/20 bg-white/[0.06]" : "border-white/10 bg-white/[0.03]"
      }`}
    >
      <div className="font-manrope text-xl">{name}</div>
      <div className="mt-1 text-3xl">{price}</div>
      <ul className="mt-4 space-y-2 text-sm text-white/80">
        {bullets.map((b: string, i: number) => <li key={i}>• {b}</li>)}
      </ul>
      <Link href="/register" className="mt-6 inline-block rounded-md bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-zinc-200">
        Get started
      </Link>
    </div>
  );
}

function Faq({ q, children }: any) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
      <div className="font-medium">{q}</div>
      <div className="mt-2 text-sm text-white/80">{children}</div>
    </div>
  );
}
