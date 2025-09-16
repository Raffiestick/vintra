import SiteHeader from "@/components/auth/SiteHeader";
import Link from "next/link";

function Footer() {
  return (
    <footer className="border-t border-white/10 py-16">
        <div className="mx-auto max-w-7xl px-4 text-sm text-white/80">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4 lg:grid-cols-5">
            <div className="col-span-2 md:col-span-4 lg:col-span-1">
              <Link href="/landing" className="group mb-4 flex items-center gap-3">
                <h3 className="font-manrope text-xl font-bold">RizeUp</h3>
              </Link>
              <p className="text-white/60">Automated dealer back-office.</p>
            </div>
            <div>
              <h4 className="mb-3 font-manrope font-semibold text-white">
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
              <h4 className="mb-3 font-manrope font-semibold text-white">
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
              <h4 className="mb-3 font-manrope font-semibold text-white">
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

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-[#0B0F1A]">
        <SiteHeader />
        <main>{children}</main>
        <Footer />
    </div>
  );
}
