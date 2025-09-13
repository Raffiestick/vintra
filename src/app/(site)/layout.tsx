// app/(site)/layout.tsx
import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";
import Link from "next/link";
import "../globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope" });

export const metadata: Metadata = {
  title: "Vintra — Dealer Management Reimagined",
  description:
    "Turn auction PDFs into production-ready jackets. AI parses invoices; Vintra generates invoices, bills of sale, and packets automatically.",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${inter.variable} ${manrope.variable} font-body`}>
        <div className="min-h-dvh bg-[radial-gradient(1200px_600px_at_50%_-10%,rgba(99,102,241,0.25),transparent_60%),radial-gradient(1000px_400px_at_90%_20%,rgba(236,72,153,0.18),transparent_60%),#0b0f1a] text-white antialiased">
            {/* Top nav */}
            <header className="sticky top-0 z-50 backdrop-blur supports-[backdrop-filter]:bg-white/5 bg-white/0 border-b border-white/10">
            <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
                <Link href="/landing" className="flex items-center gap-3 group">
                <img src="/vintra/wordmark.svg" alt="Vintra" className="h-6 opacity-90 group-hover:opacity-100 transition" />
                </Link>
                <nav className="hidden md:flex items-center gap-6 text-sm">
                <Link href="#features" className="opacity-80 hover:opacity-100">Features</Link>
                <Link href="#how-it-works" className="opacity-80 hover:opacity-100">How it works</Link>
                <Link href="#pricing" className="opacity-80 hover:opacity-100">Pricing</Link>
                <Link href="#faq" className="opacity-80 hover:opacity-100">FAQ</Link>
                </nav>
                <div className="flex items-center gap-3">
                <Link
                    href="/login"
                    className="rounded-md px-3 py-2 text-sm font-medium border border-white/15 hover:bg-white/10 transition"
                >
                    Sign in
                </Link>
                <Link
                    href="/register"
                    className="rounded-md px-3.5 py-2 text-sm font-semibold bg-white text-black hover:bg-zinc-200 transition"
                >
                    Get started
                </Link>
                </div>
            </div>
            </header>

            <main>{children}</main>

            <footer className="mt-24 border-t border-white/10">
            <div className="mx-auto max-w-7xl px-4 py-10 text-sm text-white/70">
                <div className="flex items-center justify-between">
                <p>© 2024 Vintra. All rights reserved.</p>
                <div className="flex items-center gap-6">
                    <Link href="/terms" className="hover:text-white">Terms</Link>
                    <Link href="/privacy" className="hover:text-white">Privacy</Link>
                </div>
                </div>
            </div>
            </footer>
        </div>
    </div>
  );
}
