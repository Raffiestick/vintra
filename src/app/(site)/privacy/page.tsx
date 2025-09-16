import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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

export default function PrivacyPolicyPage() {
  return (
    <div className="bg-[#0B0F1A]">
    <SiteHeader />
    <div className="text-white min-h-screen py-16 px-4">
      <div className="max-w-4xl mx-auto">
        <Card className="bg-zinc-900 border-zinc-800 text-white">
          <CardHeader>
            <CardTitle className="text-3xl font-manrope">Privacy Policy</CardTitle>
            <CardDescription className="text-zinc-400">Last updated: {new Date().toLocaleDateString()}</CardDescription>
          </CardHeader>
          <CardContent className="prose prose-invert prose-zinc max-w-none">
            <p>
              RizeUp Dealer Connect ("us", "we", or "our") operates the RizeUp website (the "Service"). This page informs you of our policies regarding the collection, use, and disclosure of personal data when you use our Service and the choices you have associated with that data.
            </p>

            <h2 className="font-manrope">Information Collection and Use</h2>
            <p>
              We collect several different types of information for various purposes to provide and improve our Service to you.
            </p>
            <h3>Types of Data Collected</h3>
            <h4>Personal Data</h4>
            <p>
              While using our Service, we may ask you to provide us with certain personally identifiable information that can be used to contact or identify you ("Personal Data"). Personally identifiable information may include, but is not limited to:
            </p>
            <ul>
              <li>Email address</li>
              <li>First name and last name</li>
              <li>Phone number</li>
              <li>Address, State, Province, ZIP/Postal code, City</li>
              <li>Business Information (Company Name, Resale Certificate, etc.)</li>
              <li>Cookies and Usage Data</li>
            </ul>

            <h2 className="font-manrope">Use of Data</h2>
            <p>
              RizeUp Dealer Connect uses the collected data for various purposes:
            </p>
            <ul>
              <li>To provide and maintain our Service</li>
              <li>To notify you about changes to our Service</li>
              <li>To allow you to participate in interactive features of our Service when you choose to do so</li>
              <li>To provide customer support</li>
              <li>To gather analysis or valuable information so that we can improve our Service</li>
              <li>To monitor the usage of our Service</li>
              <li>To detect, prevent and address technical issues</li>
            </ul>

            <h2 className="font-manrope">Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy, please contact us:
            </p>
            <ul>
              <li>By email: admin@rizeupventures.com</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
    <Footer />
    </div>
  );
}
