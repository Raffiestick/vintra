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

export default function TermsOfServicePage() {
  return (
    <div className="bg-[#0B0F1A]">
      <SiteHeader />
      <div className="text-white min-h-screen py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <Card className="bg-zinc-900 border-zinc-800 text-white">
            <CardHeader>
              <CardTitle className="text-3xl font-manrope">Terms of Service</CardTitle>
              <CardDescription className="text-zinc-400">Last updated: {new Date().toLocaleDateString()}</CardDescription>
            </CardHeader>
            <CardContent className="prose prose-invert prose-zinc max-w-none">
              <p>
                Please read these Terms of Service ("Terms", "Terms of Service") carefully before using the RizeUp website (the "Service") operated by RizeUp Dealer Connect ("us", "we", or "our").
              </p>
              <p>
                Your access to and use of the Service is conditioned upon your acceptance of and compliance with these Terms. These Terms apply to all visitors, users, and others who wish to access or use the Service.
              </p>
              <p>
                By accessing or using the Service you agree to be bound by these Terms. If you disagree with any part of the terms then you do not have permission to access the Service.
              </p>

              <h2 className="font-manrope">Accounts</h2>
              <p>
                When you create an account with us, you guarantee that you are above the age of 18, and that the information you provide us is accurate, complete, and current at all times. Inaccurate, incomplete, or obsolete information may result in the immediate termination of your account on the Service.
              </p>
              <p>
                You are responsible for maintaining the confidentiality of your account and password, including but not limited to the restriction of access to your computer and/or account. You agree to accept responsibility for any and all activities or actions that occur under your account and/or password.
              </p>

              <h2 className="font-manrope">Intellectual Property</h2>
              <p>
                The Service and its original content, features and functionality are and will remain the exclusive property of RizeUp Dealer Connect and its licensors. The Service is protected by copyright, trademark, and other laws of both the United States and foreign countries.
              </p>

              <h2 className="font-manrope">Governing Law</h2>
              <p>
                These Terms shall be governed and construed in accordance with the laws of the State of Wyoming, United States, without regard to its conflict of law provisions.
              </p>

              <h2 className="font-manrope">Changes</h2>
              <p>
                We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision is material we will provide at least 30 days' notice prior to any new terms taking effect. What constitutes a material change will be determined at our sole discretion.
              </p>

              <h2 className="font-manrope">Contact Us</h2>
              <p>
                If you have any questions about these Terms, please contact us:
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
