// Server component (no hooks)
export default function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-28 border-t border-white/10 bg-[hsl(var(--background))]">
      <div className="mx-auto max-w-7xl px-4 py-12">
        {/* Top: brand + links */}
        <div className="grid gap-10 md:grid-cols-[1.6fr_1fr]">
          {/* Brand + blurb */}
          <div>
            <div className="relative select-none">
              <span className="text-[18px] font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 via-indigo-400 to-violet-500">
                VINTRA
              </span>
              <span
                aria-hidden
                className="pointer-events-none absolute -inset-2 -z-10 blur-md opacity-30"
                style={{
                  background:
                    "radial-gradient(closest-side, rgba(99,102,241,0.28), transparent 70%)",
                }}
              />
            </div>

            <p className="mt-3 max-w-md text-sm leading-relaxed text-white/75">
              Vintra is the all-in-one platform for powersports dealers—streamlining jackets,
              documents, inventory access, and data-driven marketing so you spend less time on
              admin and more time moving units.
            </p>
          </div>

          {/* Links (shifted left) */}
          <nav aria-label="Footer" className="md:justify-self-start md:pl-8">
            <ul className="mt-1 space-y-2 text-sm text-white/80">
              <li>
                <a className="hover:text-white underline-offset-4 hover:underline" href="/landing">
                  Home
                </a>
              </li>
              <li>
                <a className="hover:text-white underline-offset-4 hover:underline" href="/about">
                  Why Vintra
                </a>
              </li>
              <li>
                <a className="hover:text-white underline-offset-4 hover:underline" href="/dealer-faq">
                  Dealer FAQ’s
                </a>
              </li>
              <li>
                <a className="hover:text-white underline-offset-4 hover:underline" href="/contact">
                  Contact Us
                </a>
              </li>
            </ul>
          </nav>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 border-t border-white/10 pt-6 text-sm text-white/70">
          <div className="flex flex-col items-center justify-between gap-3 md:flex-row">
            <div>© {year} Vintra. All rights reserved.</div>
          </div>
        </div>
      </div>
    </footer>
  );
}
