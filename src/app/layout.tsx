import "./globals.css";
import { Inter } from "next/font/google";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata = {
  title: "RizeUp Dealer Connect",
  description: "The All-in-One Platform for Powersports Dealers.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-dvh bg-background text-foreground font-sans antialiased dark">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
