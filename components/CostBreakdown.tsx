"use client";

import { TravelPlan, AGENT_META, AgentId } from "@/lib/types";

interface CostBreakdownProps {
  plan: TravelPlan;
}

export default function CostBreakdown({ plan }: CostBreakdownProps) {
  const maxCost = Math.max(...plan.lineItems.map((i) => i.baseCost), 1);

  return (
    <div className="glass rounded-2xl p-5">
      <h3 className="text-sm font-semibold text-white/90 mb-1">
        Cost Breakdown
      </h3>
      <p className="text-xs text-white/40 mb-4">
        Transparent view of every dollar — base vs optimized
      </p>

      <div className="space-y-3">
        {plan.lineItems.map((item, idx) => {
          const meta = AGENT_META[item.agentId as AgentId];
          const barWidth = (item.baseCost / maxCost) * 100;
          const optimizedWidth = (item.optimizedCost / maxCost) * 100;

          return (
            <div key={idx} className="group">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm">{meta?.icon}</span>
                  <div>
                    <div className="text-xs font-medium text-white/80">
                      {item.category}
                    </div>
                    <div className="text-[10px] text-white/40">
                      {item.description}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-white">
                    ${item.optimizedCost.toLocaleString()}
                  </div>
                  {item.savings > 0 && (
                    <div className="text-[10px] text-emerald-400">
                      −${item.savings.toLocaleString()}
                    </div>
                  )}
                </div>
              </div>

              <div className="relative h-2 rounded-full bg-white/5 overflow-hidden">
                <div
                  className="absolute h-full rounded-full bg-white/10"
                  style={{ width: `${barWidth}%` }}
                />
                <div
                  className="absolute h-full rounded-full bg-gradient-to-r from-brand-600 to-brand-400 transition-all duration-700"
                  style={{ width: `${optimizedWidth}%` }}
                />
              </div>

              {item.savingsSource && (
                <div className="text-[10px] text-white/30 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  Savings via: {item.savingsSource}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center">
        <span className="text-sm text-white/60">Total optimized cost</span>
        <div className="text-right">
          <span className="text-xl font-bold text-white">
            ${plan.totalOptimizedCost.toLocaleString()}
          </span>
          {plan.totalSavings > 0 && (
            <div className="text-xs text-emerald-400">
              ${plan.totalBaseCost.toLocaleString()} → saved ${plan.totalSavings.toLocaleString()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
