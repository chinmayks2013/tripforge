"use client";

import Image from "next/image";
import clsx from "clsx";

interface BrandLogoProps {
  size?: "sm" | "md" | "lg";
  showTagline?: boolean;
  className?: string;
}

const SIZES = {
  sm: { height: 36, width: 120 },
  md: { height: 48, width: 160 },
  lg: { height: 72, width: 240 },
} as const;

export default function BrandLogo({
  size = "md",
  showTagline = true,
  className,
}: BrandLogoProps) {
  const dim = SIZES[size];

  return (
    <div className={clsx("flex flex-col gap-1", className)}>
      <Image
        src="/travelrooks-logo.png"
        alt="TravelRooks"
        width={dim.width}
        height={dim.height}
        className="object-contain object-left h-auto w-auto"
        style={{ maxHeight: dim.height, width: "auto" }}
        priority={size !== "lg"}
      />
      {showTagline && (
        <p className="text-[10px] text-white/40 tracking-wide pl-0.5">
          Trip cost optimization
        </p>
      )}
    </div>
  );
}
