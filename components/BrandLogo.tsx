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
  const box = size === "sm" ? "w-8 h-8" : size === "lg" ? "w-12 h-12" : "w-9 h-9";
  const iconSize = size === "sm" ? "w-4 h-4" : size === "lg" ? "w-5 h-5" : "w-4 h-4";
  const titleClass =
    size === "sm" ? "text-[15px]" : size === "lg" ? "text-2xl" : "text-lg";

  return (
    <div className={clsx("flex items-center gap-2.5", className)}>
      <div
        className={clsx(
          "shrink-0 rounded-xl flex items-center justify-center relative overflow-hidden",
          box
        )}
        style={{
          background: "linear-gradient(135deg, rgba(201,162,77,0.18) 0%, rgba(150,118,46,0.08) 100%)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.1), 0 2px 12px rgba(201,162,77,0.15)",
          border: "1px solid rgba(212,168,83,0.25)",
        }}
      >
        <svg viewBox="0 0 24 24" fill="none" className={clsx(iconSize, "text-rook-300")} aria-hidden>
          <path
            d="M7 20h10M9 20v-2h6v2M12 6V4M10 8h4M8 10h8l-1 8H9l-1-8z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M9 4h6l1 2H8l1-2z" fill="currentColor" opacity="0.85" />
        </svg>
      </div>
      <div>
        <div className={clsx("font-display font-semibold tracking-tight text-white", titleClass)}>
          Travel<span className="text-rook-400">Rooks</span>
        </div>
        {showTagline && (
          <p className="text-[10px] text-white/40 tracking-wide">
            Trip intelligence platform
          </p>
        )}
      </div>
    </div>
  );
}
