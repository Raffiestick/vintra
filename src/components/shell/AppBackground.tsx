"use client";

import React from "react"; // <-- This line was missing
import { useMousePosition } from "@/hooks/use-mouse-position";

function GridLines() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-20">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)] animate-[vintra-grid_20s_linear_infinite]" />
    </div>
  );
}

function AuroraBG() {
  return (
    <div
      className="pointer-events-none fixed top-0 left-0 h-full w-full -z-50 opacity-20 blur-[100px]"
      style={{
        background:
          "radial-gradient(at 20% 20%, #6366f1 0px, transparent 50%), radial-gradient(at 80% 20%, #4f46e5 0px, transparent 50%), radial-gradient(at 20% 80%, #a78bfa 0px, transparent 50%), radial-gradient(at 80% 80%, #c4b5fd 0px, transparent 50%)",
      }}
    />
  );
}

export function AppBackground() {
  const mousePosition = useMousePosition();

  return (
    <div className="fixed inset-0 -z-50">
      {/* Spotlight follows cursor */}
      <div
        className="pointer-events-none fixed inset-0 z-30 transition duration-300"
        style={{
          background: `radial-gradient(600px at ${mousePosition.x}px ${mousePosition.y}px, rgba(29, 78, 216, 0.1), transparent 80%)`,
        }}
      />
      <AuroraBG />
      <GridLines />
    </div>
  );
}