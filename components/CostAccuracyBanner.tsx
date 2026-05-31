"use client";

import { CostAuditReport } from "@/lib/types";
import { ShieldCheck, AlertTriangle, Info } from "lucide-react";
import clsx from "clsx";

interface CostAccuracyBannerProps {
  audit: CostAuditReport;
  className?: string;
}

const CONFIDENCE_LABEL = {
  high: "High — live route distance used",
  medium: "Medium — origin estimated",
  low: "Low — using destination averages",
};

export default function CostAccuracyBanner({ audit, className }: CostAccuracyBannerProps) {
  const isWarning = !audit.feasible || audit.correctionsApplied > 0;

  return (
    <div
      className={clsx(
        "rounded-xl border p-4 text-sm",
        audit.feasible
          ? isWarning
            ? "border-amber-500/30 bg-amber-500/5"
            : "border-emerald-500/30 bg-emerald-500/5"
          : "border-red-500/30 bg-red-500/5",
        className
      )}
    >
      <div className="flex items-start gap-3">
        {audit.feasible ? (
          isWarning ? (
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          ) : (
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          )
        ) : (
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
        )}
        <div className="flex-1 min-w-0 space-y-2">
          <div>
            <div className="font-medium text-white/90 flex items-center gap-2 flex-wrap">
              Cost Efficiency Agent
              <span
                className={clsx(
                  "text-[10px] px-2 py-0.5 rounded-full",
                  audit.confidence === "high"
                    ? "bg-emerald-500/20 text-emerald-300"
                    : audit.confidence === "medium"
                      ? "bg-amber-500/20 text-amber-300"
                      : "bg-white/10 text-white/50"
                )}
              >
                {CONFIDENCE_LABEL[audit.confidence]}
              </span>
            </div>
            <p className="text-xs text-white/55 mt-1">{audit.message}</p>
          </div>

          <div className="flex flex-wrap gap-3 text-xs text-white/45">
            <span>
              Best verified price:{" "}
              <strong className="text-emerald-300">
                ${audit.verifiedTotal.toLocaleString()}
              </strong>
            </span>
            <span>
              Absolute floor (can&apos;t go lower):{" "}
              <strong className="text-white/80">
                ${audit.minRealisticTotal.toLocaleString()}
              </strong>
            </span>
            {audit.creditsApplied != null && audit.creditsApplied > 0 && (
              <span>
                ${audit.creditsApplied.toLocaleString()} in stacked savings applied
              </span>
            )}
            {audit.correctionsApplied > 0 && (
              <span>
                {audit.correctionsApplied} estimate(s) recalibrated
              </span>
            )}
          </div>

          {!audit.feasible && audit.budgetGap != null && (
            <p className="text-xs text-red-300/90">
              Increase budget by ${audit.budgetGap.toLocaleString()}, shorten the
              trip, or switch to a closer destination.
            </p>
          )}

          {audit.flags.length > 0 && (
            <ul className="text-[11px] text-white/40 space-y-0.5">
              {audit.flags.slice(0, 3).map((flag) => (
                <li key={flag} className="flex items-start gap-1.5">
                  <Info className="w-3 h-3 shrink-0 mt-0.5" />
                  {flag}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
