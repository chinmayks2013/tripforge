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
  { id: "results", label: "Your Trip", icon: MapPinned },
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
    <div className="w-full max-w-2xl mx-auto">
      <div className="flex items-center justify-between relative">
        <div className="absolute top-5 left-8 right-8 h-px bg-white/10 -z-0" />
        <motion.div
          className="absolute top-5 left-8 h-px bg-gradient-to-r from-rook-500 to-brand-400 -z-0 origin-left"
          initial={false}
          animate={{ width: `${(current / (STEPS.length - 1)) * 100}%`, maxWidth: "calc(100% - 4rem)" }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />

        {STEPS.map((step, i) => {
          const Icon = step.icon;
          const done = i < current;
          const active = i === current;

          return (
            <div key={step.id} className="flex flex-col items-center gap-2 z-10 flex-1">
              <motion.div
                className={clsx(
                  "w-10 h-10 rounded-full flex items-center justify-center border transition-colors duration-300",
                  done && "bg-rook-500/20 border-rook-400/50 text-rook-300",
                  active && "bg-rook-500/30 border-rook-400 text-white shadow-rook",
                  !done && !active && "bg-surface-800 border-white/10 text-white/35"
                )}
                animate={active ? { scale: [1, 1.06, 1] } : { scale: 1 }}
                transition={active ? { duration: 2, repeat: Infinity } : {}}
              >
                <Icon className="w-4 h-4" />
              </motion.div>
              <span
                className={clsx(
                  "text-[10px] font-medium tracking-wide uppercase",
                  active ? "text-rook-300" : done ? "text-white/55" : "text-white/30"
                )}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      {phase !== "idle" && savingsTotal > 0 && (
        <motion.p
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center text-xs text-emerald-400/90 mt-4 font-medium"
        >
          ${savingsTotal.toLocaleString()} in savings discovered so far
        </motion.p>
      )}
    </div>
  );
}
