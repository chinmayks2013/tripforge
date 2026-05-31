import { AgentId, CostLineItem, ParsedRequest, TravelStyle, CostAuditReport } from "../types";
import { getDestinationData } from "../parser";
import { AgentResult } from "../agents";

export type CostConfidence = "high" | "medium" | "low";

export interface CategoryFloor {
  category: string;
  floor: number;
  source: string;
}

const STYLE_COST_MULT: Record<TravelStyle, number> = {
  budget: 0.82,
  balanced: 1.0,
  luxury: 1.65,
};

/** Max savings % per line item — prevents inflated "fake deal" numbers. */
const MAX_SAVINGS_RATIO = 0.42;

function destCostIndex(destination: string): number {
  const dest = getDestinationData(destination);
  return dest.baseCost / 2500;
}

export function computeTripCostFloors(
  request: ParsedRequest,
  style: TravelStyle
): {
  floors: Record<string, number>;
  minTotal: number;
  confidence: CostConfidence;
} {
  const days = request.duration ?? 5;
  const nights = Math.max(1, days - 1);
  const travelers = request.groupSize;
  const distanceMi = request.scrapedData?.distanceMiles ?? 800;
  const index = destCostIndex(request.destination);
  const mult = STYLE_COST_MULT[style];
  const hasScrapedDistance = request.scrapedData?.distanceMiles != null;

  const flightFloor = Math.round((110 + distanceMi * 0.11) * travelers * mult);
  const lodgingFloor = Math.round(
    (38 + 22 * index) * nights * Math.ceil(travelers / 2) * mult
  );
  const transportFloor = Math.round(
    (12 + 8 * index) * days * travelers * mult + (request.hasCar ? 85 * days : 0)
  );
  const attractionsFloor = Math.round((18 + 12 * index) * days * travelers * mult * 0.55);
  const foodFloor = Math.round((22 + 10 * index) * days * travelers * mult * 0.7);

  const floors: Record<string, number> = {
    Flights: flightFloor,
    Lodging: lodgingFloor,
    Transport: transportFloor,
    Parking: request.hasCar ? Math.round(8 * days) : 0,
    Attractions: attractionsFloor,
    "Activities & Events": attractionsFloor,
    "Local Passes": Math.round(35 * travelers * mult * 0.5),
    Discounts: 0,
    "Membership Benefits": 0,
    "Group Savings": 0,
    Routing: 0,
    "Food & Dining": foodFloor,
  };

  const minTotal =
    flightFloor +
    lodgingFloor +
    transportFloor +
    (floors.Parking ?? 0) +
    attractionsFloor +
    foodFloor;

  const confidence: CostConfidence = hasScrapedDistance
    ? "high"
    : request.origin || request.userLocation
      ? "medium"
      : "low";

  return { floors, minTotal, confidence };
}

const SINGLETON_CATEGORIES = new Set([
  "Flights",
  "Lodging",
  "Transport",
  "Parking",
  "Food & Dining",
]);

/** Savings-only rows — subtract from core costs, never add to the trip total. */
const CREDIT_CATEGORIES = new Set([
  "Discounts",
  "Membership Benefits",
  "Group Savings",
  "Group",
]);

function creditAmount(item: CostLineItem): number {
  if (item.savings > 0) return item.savings;
  return Math.max(0, item.baseCost - item.optimizedCost);
}

/**
 * Core trip costs minus stacked savings credits, floored at the scraped minimum.
 * Agents emit separate "discount" line items that must not be summed as new spend.
 */
export function computeLowestVerifiedTotal(
  items: CostLineItem[],
  minTotal: number
): { total: number; coreTotal: number; creditsApplied: number } {
  let multiCategoryTotal = 0;
  const singletonBest = new Map<string, number>();

  for (const item of items) {
    if (item.category === "Cost Verification") continue;
    if (CREDIT_CATEGORIES.has(item.category)) continue;

    if (item.category === "Routing") continue;

    if (SINGLETON_CATEGORIES.has(item.category)) {
      const prev = singletonBest.get(item.category);
      singletonBest.set(
        item.category,
        prev == null ? item.optimizedCost : Math.min(prev, item.optimizedCost)
      );
    } else {
      multiCategoryTotal += item.optimizedCost;
    }
  }

  let coreTotal = multiCategoryTotal;
  Array.from(singletonBest.values()).forEach((cost) => {
    coreTotal += cost;
  });

  let creditsApplied = 0;
  for (const item of items) {
    if (CREDIT_CATEGORIES.has(item.category) || item.category === "Routing") {
      creditsApplied += creditAmount(item);
    }
  }

  const total = Math.max(minTotal, coreTotal - creditsApplied);
  return { total, coreTotal, creditsApplied };
}

function floorForItem(floors: Record<string, number>, item: CostLineItem): number {
  if (floors[item.category] != null) return floors[item.category];
  if (item.category.includes("Attraction") || item.category.includes("Activit")) {
    return floors.Attractions ?? 0;
  }
  return 0;
}

function recalibrateLineItem(
  item: CostLineItem,
  floor: number
): { item: CostLineItem; corrected: boolean; note?: string } {
  let { baseCost, optimizedCost } = item;

  if (baseCost <= 0 && optimizedCost <= 0) {
    return { item, corrected: false };
  }

  if (baseCost < optimizedCost) {
    baseCost = optimizedCost;
  }

  const maxSave = Math.round(baseCost * MAX_SAVINGS_RATIO);
  const currentSave = baseCost - optimizedCost;
  let corrected = false;
  let note: string | undefined;

  if (currentSave > maxSave) {
    optimizedCost = baseCost - maxSave;
    corrected = true;
    note = `Capped ${item.category} savings at ${Math.round(MAX_SAVINGS_RATIO * 100)}% max`;
  }

  if (floor > 0 && optimizedCost < floor) {
    optimizedCost = floor;
    corrected = true;
    note = note
      ? `${note}; raised to $${floor} floor`
      : `Raised ${item.category} to $${floor} realistic minimum`;
  }

  optimizedCost = Math.max(0, Math.round(optimizedCost));
  baseCost = Math.max(optimizedCost, Math.round(baseCost));

  return {
    item: {
      ...item,
      baseCost,
      optimizedCost,
      savings: baseCost - optimizedCost,
    },
    corrected,
    note,
  };
}

export function auditAndRecalibratePlan(
  request: ParsedRequest,
  style: TravelStyle,
  priorResults: Map<AgentId, AgentResult>
): {
  lineItems: CostLineItem[];
  audit: CostAuditReport;
} {
  const { floors, minTotal, confidence } = computeTripCostFloors(request, style);

  const rawItems = Array.from(priorResults.values())
    .filter((r) => r.agentId !== "efficiency")
    .flatMap((r) => r.lineItems);

  const flags: string[] = [];
  let correctionsApplied = 0;
  const verifiedLineItems: CostLineItem[] = [];

  for (const item of rawItems) {
    const floor = floorForItem(floors, item);
    const { item: fixed, corrected, note } = recalibrateLineItem(item, floor);
    verifiedLineItems.push({
      ...fixed,
      description: note ? `${fixed.description} (verified)` : fixed.description,
    });
    if (corrected) {
      correctionsApplied++;
      if (note) flags.push(note);
    }
  }

  const originalTotal = rawItems.reduce((s, i) => s + i.optimizedCost, 0);
  const naiveTotal = verifiedLineItems.reduce((s, i) => s + i.optimizedCost, 0);
  const { total: consolidatedTotal, coreTotal, creditsApplied } =
    computeLowestVerifiedTotal(verifiedLineItems, minTotal);

  let verifiedTotal = consolidatedTotal;

  if (consolidatedTotal < minTotal) {
    const gap = minTotal - consolidatedTotal;
    verifiedLineItems.push({
      category: "Cost Verification",
      description: "Adjustment to meet distance + destination minimum",
      baseCost: gap,
      optimizedCost: gap,
      savings: 0,
      agentId: "efficiency",
    });
    verifiedTotal = minTotal;
    flags.push(
      `Total raised by $${gap} to meet scraped distance + destination cost floor`
    );
    correctionsApplied++;
  } else if (creditsApplied > 0 && naiveTotal > consolidatedTotal) {
    flags.push(
      `Applied $${creditsApplied.toLocaleString()} in stacked savings — lowest verified price $${consolidatedTotal.toLocaleString()} (was $${naiveTotal.toLocaleString()} before credits)`
    );
    correctionsApplied++;
  }

  let feasible = true;
  let budgetGap: number | undefined;
  let message = `Lowest verified price $${verifiedTotal.toLocaleString()} at ${confidence} confidence`;

  if (verifiedTotal <= minTotal + Math.round(minTotal * 0.05)) {
    message = `Optimized to the realistic minimum for this route — $${verifiedTotal.toLocaleString()}`;
  }

  if (request.budget != null && minTotal > request.budget) {
    feasible = false;
    budgetGap = minTotal - request.budget;
    message = `Budget $${request.budget.toLocaleString()} is below realistic minimum $${minTotal.toLocaleString()} (short by $${budgetGap.toLocaleString()})`;
    flags.push(message);
  } else if (correctionsApplied > 0) {
    message = `Recalibrated ${correctionsApplied} estimate(s) for accuracy — total $${verifiedTotal.toLocaleString()}`;
  }

  const categoryFloors: CategoryFloor[] = Object.entries(floors)
    .filter(([, v]) => v > 0)
    .map(([category, floor]) => ({
      category,
      floor,
      source: request.scrapedData?.distanceMiles
        ? `${request.scrapedData.distanceMiles} mi route + destination index`
        : "destination cost index",
    }));

  const audit: CostAuditReport = {
    feasible,
    minRealisticTotal: minTotal,
    verifiedTotal,
    originalTotal,
    correctionsApplied,
    confidence,
    budgetGap,
    creditsApplied: creditsApplied > 0 ? creditsApplied : undefined,
    message,
    categoryFloors,
    flags,
  };

  return { lineItems: verifiedLineItems, audit };
}
