"use client";
import { ReactNode } from "react";

export default function ShimmerCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`relative vintra-shimmer-border ${className}`}>
      {/* runner lines */}
      <span className="vintra-runner-x" />
      <span className="vintra-runner-x vintra-runner-bottom" />
      <span className="vintra-runner-y" />
      <span className="vintra-runner-y vintra-runner-right" />
      <div className="vintra-shimmer-inner">{children}</div>
    </div>
  );
}
