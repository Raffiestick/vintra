
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AboutPage() {
  return (
    <div className="bg-zinc-950 text-white min-h-screen py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <Card className="bg-zinc-900/50 border-white/10 text-white shadow-2xl shadow-indigo-500/10">
          <CardHeader className="text-center">
            <CardTitle className="text-4xl font-manrope font-bold tracking-tight">
              About Vintra
            </CardTitle>
            <p className="text-lg text-white/70 pt-2">
              The unfair advantage for independent powersports dealers.
            </p>
          </CardHeader>
          <CardContent className="prose prose-invert prose-lg max-w-none text-white/80 space-y-6">
            <div>
              <h2 className="font-manrope text-2xl font-semibold">Who We Are</h2>
              <p>
                Vintra is the all-in-one platform built for independent powersports dealers and entrepreneurs who want to win big in the wholesale game. We come from decades in the dealer, title, and finance world, and we know the headaches, endless paperwork, inconsistent processes, and missed opportunities. Vintra was created to cut through the noise and give small dealers the same leverage that the big players enjoy.
              </p>
            </div>

            <div>
              <h2 className="font-manrope text-2xl font-semibold">Our Mission</h2>
              <p>
                To empower independent dealers with the tools, data, and inventory access they need to buy smarter, sell faster, and grow stronger. We believe wholesale powersports should be profitable, streamlined, and accessible to anyone willing to put in the work.
              </p>
            </div>

            <div>
              <h2 className="font-manrope text-2xl font-semibold">What We Do</h2>
              <ul className="list-disc list-outside pl-5 space-y-2">
                <li><strong>Simplify the Back Office</strong> → Automated dealer jackets, invoices, and compliance docs mean you spend less time buried in paperwork.</li>
                <li><strong>Unlock Exclusive Wholesale Inventory</strong> → Direct access to powersports units that would otherwise be out of reach.</li>
                <li><strong>Fuel Dealer Growth</strong> → Integrated marketing tools help you move units quickly and keep your cashflow strong.</li>
                <li><strong>Support Every Step</strong> → From auction to resale, we give you the structure and automation that keep your business moving forward.</li>
              </ul>
            </div>

            <div>
                <h2 className="font-manrope text-2xl font-semibold">Our Promise</h2>
                <p>
                We’ll keep innovating so you can keep growing. Vintra isn’t just a platform, it’s your unfair advantage in the powersports wholesale market. With Vintra, you’re not just another dealer, you’re part of a movement that puts control back in your hands.
                </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
