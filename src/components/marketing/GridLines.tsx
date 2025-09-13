"use client";
export default function GridLines() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 vintra-grid-mask">
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1200 800" preserveAspectRatio="none">
        {/* horizontal lines */}
        {Array.from({ length: 20 }).map((_, i) => (
          <line
            key={"h"+i}
            x1="0" x2="1200" y1={i * 40} y2={i * 40}
            stroke="rgba(255,255,255,0.07)" strokeWidth="1"
            strokeDasharray="4 12"
            style={{ animation: "vintra-dash 40s linear infinite", animationDelay: `${i*0.2}s` }}
          />
        ))}
        {/* vertical lines */}
        {Array.from({ length: 24 }).map((_, i) => (
          <line
            key={"v"+i}
            x1={i * 50} x2={i * 50} y1="0" y2="800"
            stroke="rgba(255,255,255,0.04)" strokeWidth="1"
            strokeDasharray="4 12"
            style={{ animation: "vintra-dash 60s linear infinite", animationDelay: `${i*0.15}s` }}
          />
        ))}
      </svg>
    </div>
  );
}