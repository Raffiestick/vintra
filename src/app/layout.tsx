import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "@/components/ui/toaster"; // <-- Import Toaster
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "RizeUp Dealer Connect",
  description: "Wholesale vehicle transactions for RizeUp Ventures.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        {children}
        <Toaster /> {/* <-- Add Toaster component here */}
      </body>
    </html>
  );
}