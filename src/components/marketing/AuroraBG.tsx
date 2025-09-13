"use client";
export default function AuroraBG() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="vintra-aurora vintra-aurora--blue -top-24 left-1/2 h-[38rem] w-[60rem] -translate-x-1/2" />
      <div className="vintra-aurora vintra-aurora--pink -bottom-32 -left-20 h-[26rem] w-[30rem]" style={{ animationDelay: "2s" }} />
      <div className="vintra-aurora vintra-aurora--emerald -bottom-40 -right-24 h-[22rem] w-[26rem]" style={{ animationDelay: "4s" }} />
    </div>
  );
}
