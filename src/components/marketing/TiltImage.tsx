"use client";
import { useRef } from "react";

export default function TiltImage({ src, alt }: { src: string; alt: string }) {
  const ref = useRef<HTMLDivElement>(null);

  function onMove(e: React.MouseEvent) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    el.style.transform = `rotateX(${(-py * 6).toFixed(2)}deg) rotateY(${(px * 6).toFixed(2)}deg) translateZ(0)`;
  }
  function onLeave() {
    const el = ref.current;
    if (!el) return;
    el.style.transform = `rotateX(0deg) rotateY(0deg) translateZ(0)`;
  }

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className="relative rounded-lg border border-white/10 bg-black/30 p-2 shadow-2xl ring-1 ring-white/10 transition-transform duration-150 [perspective:1000px] animate-[vintra-float_8s_ease-in-out_infinite]"
      style={{ transformStyle: "preserve-3d" }}
    >
      <img src={src} alt={alt} className="w-full rounded-md" />
      <div className="pointer-events-none absolute inset-0 -z-10 rounded-xl bg-[radial-gradient(closest-side,rgba(255,255,255,0.06),transparent)] blur-2xl" />
    </div>
  );
}
