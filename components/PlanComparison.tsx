"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { TravelPlan, TravelStyle, STYLE_LABELS } from "@/lib/types";
import clsx from "clsx";
import { Backpack, Scale, Gem, Check } from "lucide-react";
import CostBreakdown from "./CostBreakdown";
import OpportunitiesPanel from "./OpportunitiesPanel";
import CostAccuracyBanner from "./CostAccuracyBanner";

interface PlanComparisonProps {
  plans: TravelPlan[];
}

const STYLE_CONFIG: Record<
  TravelStyle,
  { gradient: string; badge: string; Icon: typeof Backpack }
> = {
  budget: {
    gradient: "from-emerald-600/15 to-teal-600/5",
    badge: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20",
    Icon: Backpack,
  },
  balanced: {
    gradient: "from-brand-600/15 to-cyan-600/5",
    badge: "bg-brand-500/15 text-brand-300 border border-brand-500/20",
    Icon: Scale,
  },
  luxury: {
    gradient: "from-amber-600/15 to-orange-600/5",
    badge: "bg-amber-500/15 text-amber-300 border border-amber-500/20",
    Icon: Gem,
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
          const { Icon } = config;
          const isSelected = plan.style === selectedStyle;

          return (
            <motion.button
              key={plan.id}
              onClick={() => setSelectedStyle(plan.style)}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.99 }}
              className={clsx(
                "relative text-left rounded-xl p-5 border transition-all duration-200",
                isSelected
                  ? "border-rook-400/35 bg-gradient-to-br " + config.gradient + " shadow-rook"
                  : "border-white/[0.08] bg-white/[0.02] hover:border-white/15"
              )}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-9 h-9 rounded-lg bg-white/[0.04] border border-white/10 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-white/60" strokeWidth={1.75} />
                </div>
                <span className={clsx("text-[11px] px-2 py-0.5 rounded-md font-medium", config.badge)}>
                  {STYLE_LABELS[plan.style]}
                </span>
              </div>

              <div className="space-y-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-semibold text-white tracking-tight">
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

              <ul className="mt-3 space-y-1.5">
                {plan.highlights.slice(0, 3).map((h) => (
                  <li key={h} className="text-xs text-white/50 flex items-start gap-2">
                    <Check className="w-3 h-3 text-emerald-400 shrink-0 mt-0.5" strokeWidth={2.5} />
                    {h}
                  </li>
                ))}
              </ul>
            </motion.button>
          );
        })}
      </div>

      {selectedPlan.costAudit && (
        <CostAccuracyBanner audit={selectedPlan.costAudit} />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CostBreakdown plan={selectedPlan} />
        <OpportunitiesPanel opportunities={selectedPlan.opportunities} />
      </div>
    </div>
  );
}
