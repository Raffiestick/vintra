import "./globals.css";
import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";
import { Toaster } from "@/components/ui/toaster";


const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope" });

export const metadata: Metadata = {
  title: "RizeUp Dealer Connect",
  description: "The All-in-One Platform for Powersports Dealers.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${manrope.variable}`}>
      <body className="dark font-sans antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
