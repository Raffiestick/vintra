"use client";

export default function AdminHome() {
  return (
    <section className="grid gap-4 md:grid-cols-3">
      <div className="rounded-lg border border-border/60 p-4">
        <div className="text-sm text-muted-foreground">Pending Dealers</div>
        <div className="mt-2 text-2xl font-semibold">—</div>
      </div>
      <div className="rounded-lg border border-border/60 p-4">
        <div className="text-sm text-muted-foreground">Open Jackets</div>
        <div className="mt-2 text-2xl font-semibold">—</div>
      </div>
      <div className="rounded-lg border border-border/60 p-4">
        <div className="text-sm text-muted-foreground">Invoices Awaiting Review</div>
        <div className="mt-2 text-2xl font-semibold">—</div>
      </div>
    </section>
  );
}
