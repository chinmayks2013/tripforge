"use client";

import BrandLogo from "./BrandLogo";
import WandbTraceLink from "./WandbTraceLink";
import { AGENT_META } from "@/lib/types";
import clsx from "clsx";

interface SiteHeaderProps {
  phase: "idle" | "optimizing" | "results";
  showNav?: boolean;
}

export default function SiteHeader({ phase, showNav }: SiteHeaderProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[hsl(var(--background))]/80 backdrop-blur-xl">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        <BrandLogo size="sm" />

        {showNav && (
          <nav className="hidden md:flex items-center gap-1 text-xs">
            {[
              { href: "#assumptions-section", label: "Assumptions" },
              { href: "#plans-section", label: "Plans" },
              { href: "#journey-section", label: "Journey" },
            ].map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="px-3 py-1.5 rounded-lg text-white/50 hover:text-white/90 hover:bg-white/5 transition-colors"
              >
                {link.label}
              </a>
            ))}
          </nav>
        )}

        <div className="flex items-center gap-3">
          <div
            className={clsx(
              "hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium border",
              phase === "optimizing"
                ? "border-rook-400/30 bg-rook-500/10 text-rook-300"
                : phase === "results"
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                  : "border-white/10 bg-white/5 text-white/45"
            )}
          >
            <span
              className={clsx(
                "w-1.5 h-1.5 rounded-full",
                phase === "optimizing" && "bg-rook-400 animate-pulse",
                phase === "results" && "bg-emerald-400",
                phase === "idle" && "bg-white/30"
              )}
            />
            {phase === "idle" ? "Ready" : phase === "optimizing" ? "Working" : "Complete"}
          </div>

          <div className="hidden lg:flex items-center gap-0.5 opacity-60" title="9 AI agents">
            {Object.values(AGENT_META).slice(0, 6).map((a) => (
              <span key={a.name} className="text-sm" title={a.name}>
                {a.icon}
              </span>
            ))}
          </div>

          <WandbTraceLink />
        </div>
      </div>
    </header>
  );
}
