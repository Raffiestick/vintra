"use client";
export default function Error({ error }: { error: Error }) {
  return <div className="p-6 text-sm text-white/80">New jacket form error. <pre className="opacity-70">{error.message}</pre></div>;
}
