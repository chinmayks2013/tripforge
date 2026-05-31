"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { TravelPlan, TravelStyle, STYLE_LABELS } from "@/lib/types";
import clsx from "clsx";
import CostBreakdown from "./CostBreakdown";
import OpportunitiesPanel from "./OpportunitiesPanel";

interface PlanComparisonProps {
  plans: TravelPlan[];
}

const STYLE_CONFIG: Record<
  TravelStyle,
  { gradient: string; badge: string; icon: string }
> = {
  budget: {
    gradient: "from-emerald-600/20 to-teal-600/10",
    badge: "bg-emerald-500/20 text-emerald-300",
    icon: "🎒",
  },
  balanced: {
    gradient: "from-brand-600/20 to-cyan-600/10",
    badge: "bg-brand-500/20 text-brand-300",
    icon: "⚖️",
  },
  luxury: {
    gradient: "from-amber-600/20 to-orange-600/10",
    badge: "bg-amber-500/20 text-amber-300",
    icon: "✨",
  },
};

export default function PlanComparison({ plans }: PlanComparisonProps) {
  const [selectedStyle, setSelectedStyle] = useState<TravelStyle>("balanced");
  const selectedPlan = plans.find((p) => p.style === selectedStyle) ?? plans[0];

  if (!selectedPlan) return null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {plans.map((plan) => {
          const config = STYLE_CONFIG[plan.style];
          const isSelected = plan.style === selectedStyle;

          return (
            <motion.button
              key={plan.id}
              onClick={() => setSelectedStyle(plan.style)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={clsx(
                "relative text-left rounded-2xl p-5 border transition-all duration-300",
                isSelected
                  ? "border-brand-500/50 bg-gradient-to-br " + config.gradient + " agent-glow"
                  : "border-white/10 glass hover:border-white/20"
              )}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-2xl">{config.icon}</span>
                <span className={clsx("text-xs px-2 py-0.5 rounded-full font-medium", config.badge)}>
                  {STYLE_LABELS[plan.style]}
                </span>
              </div>

              <div className="space-y-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-white">
                    ${plan.totalOptimizedCost.toLocaleString()}
                  </span>
                  {plan.totalSavings > 0 && (
                    <span className="text-sm text-white/40 line-through">
                      ${plan.totalBaseCost.toLocaleString()}
                    </span>
                  )}
                </div>
                {plan.totalSavings > 0 && (
                  <div className="text-sm text-emerald-400 font-medium">
                    Save ${plan.totalSavings.toLocaleString()} ({plan.savingsPercent}%)
                  </div>
                )}
              </div>

              <ul className="mt-3 space-y-1">
                {plan.highlights.slice(0, 3).map((h) => (
                  <li key={h} className="text-xs text-white/50 flex items-center gap-1.5">
                    <span className="text-emerald-400">✓</span> {h}
                  </li>
                ))}
              </ul>
            </motion.button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CostBreakdown plan={selectedPlan} />
        <OpportunitiesPanel opportunities={selectedPlan.opportunities} />
      </div>
    </div>
  );
}
