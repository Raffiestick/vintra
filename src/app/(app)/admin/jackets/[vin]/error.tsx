"use client";

export default function Error({ error }: { error: Error & { digest?: string } }) {
  return (
    <div className="mx-auto max-w-xl p-6 text-sm text-white/80">
      <div className="mb-3 rounded border border-white/10 bg-white/5 p-4">Something broke on this jacket page.</div>
      <pre className="whitespace-pre-wrap opacity-70">{error.message}</pre>
    </div>
  );
}
