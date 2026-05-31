import {
  STYLE_LABELS,
  STYLE_MULTIPLIERS,
  TravelPlan,
  TravelStyle,
} from "../types";

/** Build budget/luxury variants from the balanced plan without re-running agents. */
export function deriveStyledPlan(base: TravelPlan, style: TravelStyle): TravelPlan {
  if (style === "balanced") return base;

  const ratio = STYLE_MULTIPLIERS[style] / STYLE_MULTIPLIERS.balanced;

  const lineItems = base.lineItems.map((item) => ({
    ...item,
    baseCost: Math.round(item.baseCost * ratio),
    optimizedCost: Math.round(item.optimizedCost * ratio),
    savings: Math.round(item.savings * ratio),
  }));

  const totalBaseCost = lineItems.reduce((s, i) => s + i.baseCost, 0);
  const totalOptimizedCost = lineItems.reduce((s, i) => s + i.optimizedCost, 0);
  const totalSavings = totalBaseCost - totalOptimizedCost;

  return {
    ...base,
    id: `${style}-${Date.now()}`,
    style,
    title: STYLE_LABELS[style],
    totalBaseCost,
    totalOptimizedCost,
    totalSavings,
    savingsPercent:
      totalBaseCost > 0 ? Math.round((totalSavings / totalBaseCost) * 100) : 0,
    lineItems,
    opportunities: base.opportunities.map((o) => ({
      ...o,
      savings: Math.round(o.savings * ratio),
    })),
    summary: `${STYLE_LABELS[style]} plan for ${base.summary.split(" for ")[1] ?? "your trip"}`,
    highlights: base.highlights,
    costAudit: base.costAudit
      ? {
          ...base.costAudit,
          verifiedTotal: Math.round(base.costAudit.verifiedTotal * ratio),
          minRealisticTotal: Math.round(base.costAudit.minRealisticTotal * ratio),
          originalTotal: Math.round(base.costAudit.originalTotal * ratio),
        }
      : undefined,
  };
}
