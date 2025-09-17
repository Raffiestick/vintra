import SiteHeader from "./_components/SiteHeader";
import Footer from "./_components/Footer";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-[#0B0F1A] text-white">
      <SiteHeader />
      <main>{children}</main>
      <Footer />
    </div>
  );
}
