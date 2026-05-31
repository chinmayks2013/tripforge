"use client";

import clsx from "clsx";

interface BrandLogoProps {
  size?: "sm" | "md" | "lg";
  showTagline?: boolean;
  className?: string;
}

export default function BrandLogo({
  size = "md",
  showTagline = true,
  className,
}: BrandLogoProps) {
  const iconSize = size === "sm" ? 32 : size === "lg" ? 48 : 40;
  const titleClass =
    size === "sm"
      ? "text-base"
      : size === "lg"
        ? "text-2xl"
        : "text-lg";

  return (
    <div className={clsx("flex items-center gap-3", className)}>
      <div
        className="relative shrink-0 rounded-xl bg-gradient-to-br from-rook-500/20 to-rook-600/5 border border-rook-400/25 flex items-center justify-center shadow-rook"
        style={{ width: iconSize, height: iconSize }}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="text-rook-400"
          style={{ width: iconSize * 0.55, height: iconSize * 0.55 }}
          aria-hidden
        >
          <path
            d="M7 20h10M9 20v-2h6v2M12 6V4M10 8h4M8 10h8l-1 8H9l-1-8z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M9 4h6l1 2H8l1-2z"
            fill="currentColor"
            opacity="0.9"
          />
        </svg>
      </div>
      <div className="text-left">
        <div className={clsx("font-display font-semibold tracking-tight", titleClass)}>
          <span className="text-white">Travel</span>
          <span className="text-rook-400">Rooks</span>
        </div>
        {showTagline && (
          <p className="text-[10px] text-white/45 tracking-[0.18em] uppercase font-medium">
            Intelligent Trip Planning
          </p>
        )}
      </div>
    </div>
  );
}
