import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function TermsOfServicePage() {
  return (
    <div className="py-16 px-4">
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
  );
}