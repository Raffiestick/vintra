// This layout file is now much simpler.
// The main AppShell in the parent (app) layout handles the sidebar and header.
// This file just ensures the children are rendered.

export default function DealerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
