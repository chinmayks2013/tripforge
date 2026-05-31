"use client";

import { motion } from "framer-motion";
import clsx from "clsx";
import { Search, Globe, Cpu, MapPinned } from "lucide-react";

type Phase = "idle" | "optimizing" | "results";

interface PhaseStepperProps {
  phase: Phase;
  isScraping?: boolean;
  savingsTotal?: number;
}

const STEPS = [
  { id: "plan", label: "Describe", icon: Search },
  { id: "research", label: "Research", icon: Globe },
  { id: "optimize", label: "Optimize", icon: Cpu },
  { id: "results", label: "Results", icon: MapPinned },
] as const;

function activeIndex(phase: Phase, isScraping: boolean): number {
  if (phase === "idle") return 0;
  if (phase === "results") return 3;
  return isScraping ? 1 : 2;
}

export default function PhaseStepper({
  phase,
  isScraping = false,
  savingsTotal = 0,
}: PhaseStepperProps) {
  const current = activeIndex(phase, isScraping);

  return (
    <div className="w-full max-w-xl mx-auto section-shell px-6 py-5">
      <div className="flex items-center justify-between relative">
        <div className="absolute top-[18px] left-6 right-6 h-px bg-white/[0.06]" />
        <motion.div
          className="absolute top-[18px] left-6 h-px bg-rook-400/60 origin-left"
          initial={false}
          animate={{
            width: `${(current / (STEPS.length - 1)) * 100}%`,
            maxWidth: "calc(100% - 3rem)",
          }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        />

        {STEPS.map((step, i) => {
          const Icon = step.icon;
          const done = i < current;
          const active = i === current;

          return (
            <div key={step.id} className="flex flex-col items-center gap-2 z-10 flex-1">
              <div
                className={clsx(
                  "w-9 h-9 rounded-full flex items-center justify-center border transition-colors",
                  done && "bg-rook-500/15 border-rook-400/40 text-rook-300",
                  active && "bg-rook-500/20 border-rook-400/60 text-white",
                  !done && !active && "bg-white/[0.02] border-white/10 text-white/30"
                )}
              >
                <Icon className="w-3.5 h-3.5" strokeWidth={1.75} />
              </div>
              <span
                className={clsx(
                  "text-[10px] font-medium tracking-wide",
                  active ? "text-rook-300" : done ? "text-white/50" : "text-white/25"
                )}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      {phase !== "idle" && savingsTotal > 0 && (
        <p className="text-center text-xs text-emerald-400/85 mt-4 pt-4 border-t border-white/[0.06]">
          ${savingsTotal.toLocaleString()} in savings identified
        </p>
      )}
    </div>
  );
}
