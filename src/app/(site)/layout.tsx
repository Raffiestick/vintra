
import SiteHeader from "./_components/SiteHeader";
import Footer from "./_components/Footer";

// This is now a simple Server Component layout.
// It does not manage any state.
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-[#0B0F1A] text-white" data-site-layout>
      <SiteHeader />
      <main>{children}</main>
      <Footer />
    </div>
  );
}
