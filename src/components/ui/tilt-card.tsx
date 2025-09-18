
"use client";

import React, { useState, useRef, useEffect } from "react";

// A copy of the GlowCard from the landing page, so this component is self-contained.
function GlowCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] shadow-lg ${className || ""}`}>
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(40%_120%_at_50%_0%,#fff2,transparent)]" />
      <div
        className="absolute -top-1/2 left-0 -z-10 h-[200%] w-full animate-[vintra-shimmer_5s_infinite]"
        style={{
          background:
            "linear-gradient(110deg, transparent 20%, transparent 40%, #ffffff30 50%, transparent 60%, transparent 80%)",
        }}
      />
      {children}
    </div>
  );
}


export function TiltCard({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [rotate, setRotate] = useState({ x: 0, y: 0 });

  // This `useEffect` hook ensures the mouse event listeners are only added
  // on the client-side, after the component has mounted. This prevents
  // hydration errors caused by trying to access browser-only APIs on the server.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onMouseMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      const xPct = (e.clientX - r.left) / r.width - 0.5;
      const yPct = (e.clientY - r.top) / r.height - 0.5;
      setRotate({ x: yPct * -12, y: xPct * 12 });
    };

    const onMouseLeave = () => {
      setRotate({ x: 0, y: 0 });
    };

    el.addEventListener("mousemove", onMouseMove);
    el.addEventListener("mouseleave", onMouseLeave);

    return () => {
      el.removeEventListener("mousemove", onMouseMove);
      el.removeEventListener("mouseleave", onMouseLeave);
    };
  }, []); // The empty dependency array ensures this runs only once on mount.

  return (
    <div
      ref={ref}
      className={`transition-transform duration-300 ease-out will-change-transform ${className || ""}`}
      style={{ transform: `perspective(1000px) rotateX(${rotate.x}deg) rotateY(${rotate.y}deg) scale(1.05)` }}
    >
      <GlowCard className="w-full h-full">
        <div style={{ transform: "translateZ(20px)", transformStyle: "preserve-3d" }}>
          {children}
        </div>
      </GlowCard>
    </div>
  );
}
