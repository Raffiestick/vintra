import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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


export default function AboutPage() {
  return (
    <div className="bg-[#0B0F1A]">
      <SiteHeader />
      <div className="text-white min-h-screen py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <Card className="bg-zinc-900/50 border-white/10 text-white shadow-2xl shadow-primary/10">
            <CardHeader className="text-center">
              <CardTitle className="text-4xl font-bold tracking-tight">
                About RizeUp
              </CardTitle>
              <p className="text-lg text-white/70 pt-2">
                The unfair advantage for independent powersports dealers.
              </p>
            </CardHeader>
            <CardContent className="prose prose-invert prose-lg max-w-none text-white/80 space-y-6">
              <div>
                <h2 className="text-2xl font-semibold">Who We Are</h2>
                <p>
                  RizeUp is the all-in-one platform built for independent powersports dealers and entrepreneurs who want to win big in the wholesale game. We come from decades in the dealer, title, and finance world, and we know the headaches, endless paperwork, inconsistent processes, and missed opportunities. RizeUp was created to cut through the noise and give small dealers the same leverage that the big players enjoy.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-semibold">Our Mission</h2>
                <p>
                  To empower independent dealers with the tools, data, and inventory access they need to buy smarter, sell faster, and grow stronger. We believe wholesale powersports should be profitable, streamlined, and accessible to anyone willing to put in the work.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-semibold">What We Do</h2>
                <ul className="list-disc list-outside pl-5 space-y-2">
                  <li><strong>Simplify the Back Office</strong> → Automated dealer jackets, invoices, and compliance docs mean you spend less time buried in paperwork.</li>
                  <li><strong>Unlock Exclusive Wholesale Inventory</strong> → Direct access to powersports units that would otherwise be out of reach.</li>
                  <li><strong>Fuel Dealer Growth</strong> → Integrated AI marketing tools help you move units quickly and keep your cashflow strong.</li>
                  <li><strong>Support Every Step</strong> → From auction to resale, we give you the structure and automation that keep your business moving forward.</li>
                </ul>
              </div>

              <div>
                  <h2 className="text-2xl font-semibold">Our Promise</h2>
                  <p>
                  We’ll keep innovating so you can keep growing. RizeUp isn’t just a platform, it’s your unfair advantage in the powersports wholesale market. With RizeUp, you’re not just another dealer, you’re part of a movement that puts control back in your hands.
                  </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      <Footer />
    </div>
  );
}
