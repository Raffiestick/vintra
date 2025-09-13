
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AboutPage() {
  return (
    <div className="bg-zinc-950 text-white min-h-screen py-16 px-4">
      <div className="max-w-4xl mx-auto">
        <Card className="bg-zinc-900 border-zinc-800 text-white">
          <CardHeader>
            <CardTitle className="text-3xl font-manrope">About Vintra</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-invert prose-zinc max-w-none">
            <h2 className="font-manrope">Who We Are</h2>
            <p>
              Vintra is the all-in-one platform built for independent powersports dealers and entrepreneurs who want to win big in the wholesale game. We come from decades in the dealer, title, and finance world, and we know the headaches, endless paperwork, inconsistent processes, and missed opportunities. Vintra was created to cut through the noise and give small dealers the same leverage that the big players enjoy.
            </p>

            <h2 className="font-manrope">Our Mission</h2>
            <p>
              To empower independent dealers with the tools, data, and inventory access they need to buy smarter, sell faster, and grow stronger. We believe wholesale powersports should be profitable, streamlined, and accessible to anyone willing to put in the work.
            </p>

            <h2 className="font-manrope">What We Do</h2>
            <ul>
              <li><strong>Simplify the Back Office</strong> → Automated dealer jackets, invoices, and compliance docs mean you spend less time buried in paperwork.</li>
              <li><strong>Unlock Exclusive Wholesale Inventory</strong> → Direct access to powersports units that would otherwise be out of reach.</li>
              <li><strong>Fuel Dealer Growth</strong> → Integrated marketing tools help you move units quickly and keep your cashflow strong.</li>
              <li><strong>Support Every Step</strong> → From auction to resale, we give you the structure and automation that keep your business moving forward.</li>
            </ul>

            <h2 className="font-manrope">Why Dealers Choose Vintra</h2>
            <p>
              Because we’re more than software. We’re your partner in building a dealership that runs lean, sells fast, and scales on your terms. With Vintra, you’re not just another dealer, you’re part of a movement that puts control back in your hands.
            </p>

            <h2 className="font-manrope">Our Promise</h2>
            <p>
              We’ll keep innovating so you can keep growing. Vintra isn’t just a platform, it’s your unfair advantage in the powersports wholesale market.
            </p>

          </CardContent>
        </Card>
      </div>
    </div>
  );
}
