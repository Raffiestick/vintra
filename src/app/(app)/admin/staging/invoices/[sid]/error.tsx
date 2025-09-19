"use client";
export default function Error({ error }: { error: Error }) {
  return <div className="p-6 text-sm text-white/80">Invoice view error. Try refresh. <pre className="opacity-70">{error.message}</pre></div>;
}
