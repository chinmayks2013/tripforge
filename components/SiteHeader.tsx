"use client";

import BrandLogo from "./BrandLogo";
import WandbTraceLink from "./WandbTraceLink";
import clsx from "clsx";

interface SiteHeaderProps {
  phase: "idle" | "optimizing" | "results";
  showNav?: boolean;
}

export default function SiteHeader({ phase, showNav }: SiteHeaderProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[hsl(222_28%_4%/0.82)] backdrop-blur-xl supports-[backdrop-filter]:bg-[hsl(222_28%_4%/0.72)]">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        <BrandLogo size="sm" showTagline={false} />

        {showNav && (
          <nav className="hidden md:flex items-center gap-1">
            {[
              { href: "#assumptions-section", label: "Assumptions" },
              { href: "#plans-section", label: "Plans" },
              { href: "#journey-section", label: "Itinerary" },
            ].map((link) => (
              <a key={link.href} href={link.href} className="btn-secondary text-xs py-1.5">
                {link.label}
              </a>
            ))}
          </nav>
        )}

        <div className="flex items-center gap-3">
          <span
            className={clsx(
              "hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium border",
              phase === "optimizing" && "border-rook-400/25 bg-rook-500/10 text-rook-300",
              phase === "results" && "border-emerald-500/25 bg-emerald-500/10 text-emerald-300",
              phase === "idle" && "border-white/10 text-white/40"
            )}
          >
            <span
              className={clsx(
                "w-1.5 h-1.5 rounded-full",
                phase === "optimizing" && "bg-rook-400 animate-pulse",
                phase === "results" && "bg-emerald-400",
                phase === "idle" && "bg-white/25"
              )}
            />
            {phase === "idle" ? "Ready" : phase === "optimizing" ? "Processing" : "Complete"}
          </span>
          <WandbTraceLink />
        </div>
      </div>
    </header>
  );
}
