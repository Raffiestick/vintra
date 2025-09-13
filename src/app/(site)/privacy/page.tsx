
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function PrivacyPolicyPage() {
  return (
    <div className="bg-zinc-950 text-white min-h-screen py-16 px-4">
      <div className="max-w-4xl mx-auto">
        <Card className="bg-zinc-900 border-zinc-800 text-white">
          <CardHeader>
            <CardTitle className="text-3xl font-manrope">Privacy Policy</CardTitle>
            <CardDescription className="text-zinc-400">Last updated: {new Date().toLocaleDateString()}</CardDescription>
          </CardHeader>
          <CardContent className="prose prose-invert prose-zinc max-w-none">
            <p>
              RizeUp Ventures, LLC ("us", "we", or "our") operates the Vintra website (the "Service"). This page informs you of our policies regarding the collection, use, and disclosure of personal data when you use our Service and the choices you have associated with that data.
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
              RizeUp Ventures, LLC uses the collected data for various purposes:
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
              <li>By mail:</li>
            </ul>
            <address className="not-italic border-l-2 border-zinc-700 pl-4">
              RizeUp Ventures, LLC<br />
              30 N. Gould St.<br />
              STE R<br />
              Sheridan, WY 82801
            </address>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
