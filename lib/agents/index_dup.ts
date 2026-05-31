import {
  AgentId,
  AgentStatus,
  CostLineItem,
  HiddenOpportunity,
  ParsedRequest,
  TravelStyle,
} from "../types";
import { getDestinationData } from "../parser";

export interface AgentResult {
  agentId: AgentId;
  lineItems: CostLineItem[];
  opportunities: HiddenOpportunity[];
  savings: number;
  message: string;
}

export type ProgressCallback = (
  agentId: AgentId,
  progress: number,
  message: string,
  savings?: number
) => void;

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function randomBetween(min: number, max: number) {
  return Math.floor(min + Math.random() * (max - min));
}

function appliedTitles(opportunities: HiddenOpportunity[]) {
  return opportunities
    .filter((o) => o.applied)
    .map((o) => o.title)
    .join(", ");
}

function mergedAgentResult(agentId: AgentId, mergedInto: AgentId): AgentResult {
  return {
    agentId,
    lineItems: [],
    opportunities: [],
    savings: 0,
    message: `${agentId} merged into ${mergedInto} agent`,
  };
}

export async function runFlightAgent(
  request: ParsedRequest,
  style: TravelStyle,
  onProgress: ProgressCallback
): Promise<AgentResult> {
  const dest = getDestinationData(request.destination);
  const perPerson = request.groupSize;
  const styleMult = style === "budget" ? 0.7 : style === "luxury" ? 2.2 : 1.0;

  onProgress(
    "flight",
    10,
    request.scrapedData?.distanceMiles
      ? `Scraped ${request.scrapedData.distanceMiles} mi route — scanning fares…`
      : "Scanning flight combinations..."
  );
  await delay(randomBetween(400, 800));

  onProgress("flight", 45, "Checking alternate airports, fare classes, and weekday departures...");
  await delay(randomBetween(300, 600));

  const distanceMi = request.scrapedData?.distanceMiles ?? 800;
  const baseCost = Math.round((150 + distanceMi * 0.14) * perPerson * styleMult);
  let optimizedCost = baseCost;
  const opportunities: HiddenOpportunity[] = [];

  const tuesdaySave = Math.round(baseCost * 0.12);
  opportunities.push({
    id: "flight-tuesday",
    title: "Tuesday Departure Discount",
    description: "Flying Tuesday instead of Friday saves about 12% on this route",
    savings: tuesdaySave,
    category: "Flights",
    agentId: "flight",
    applied: style !== "luxury",
  });
  if (style !== "luxury") optimizedCost -= tuesdaySave;

  const hiddenCitySave = style === "budget" ? Math.round(baseCost * 0.08) : 0;
  if (hiddenCitySave > 0) {
    opportunities.push({
      id: "flight-hidden-city",
      title: "Hidden-City Ticketing",
      description: "Book through a connection city to unlock a lower fare class",
      savings: hiddenCitySave,
      category: "Flights",
      agentId: "flight",
      applied: true,
    });
    optimizedCost -= hiddenCitySave;
  }

  onProgress("flight", 90, `Found ${opportunities.length} flight optimizations`, baseCost - optimizedCost);
  await delay(200);

  return {
    agentId: "flight",
    lineItems: [
      {
        category: "Flights",
        description: `${request.origin ?? request.scrapedData?.originCity ?? "Home"} → ${dest.airport} (${perPerson} traveler${perPerson > 1 ? "s" : ""}, ${distanceMi} mi)`,
        baseCost,
        optimizedCost,
        savings: baseCost - optimizedCost,
        savingsSource: appliedTitles(opportunities),
        agentId: "flight",
      },
    ],
    opportunities,
    savings: baseCost - optimizedCost,
    message: `Optimized flights: saved $${baseCost - optimizedCost}`,
  };
}

export async function runLodgingAgent(
  request: ParsedRequest,
  style: TravelStyle,
  onProgress: ProgressCallback
): Promise<AgentResult> {
  const dest = getDestinationData(request.destination);
  const nights = Math.max((request.duration ?? 5) - 1, 1);
  const styleMult = style === "budget" ? 0.55 : style === "luxury" ? 2.5 : 1.0;

  onProgress("lodging", 15, "Comparing hotels, hostels, and home stays...");
  await delay(randomBetween(400, 700));

  onProgress("lodging", 50, "Checking extended-stay, weekday, and shared-stay savings...");
  await delay(randomBetween(300, 600));

  const nightlyRate = Math.round(dest.baseCost * 0.08 * styleMult);
  const rooms = Math.ceil(request.groupSize / 2);
  const baseCost = nightlyRate * nights * rooms;
  let optimizedCost = baseCost;
  const opportunities: HiddenOpportunity[] = [];

  const extendedStaySave = nights >= 5 ? Math.round(baseCost * 0.1) : 0;
  if (extendedStaySave > 0) {
    opportunities.push({
      id: "lodging-extended",
      title: "Extended Stay Discount",
      description: "Longer stays qualify for discounted nightly rates",
      savings: extendedStaySave,
      category: "Lodging",
      agentId: "lodging",
      applied: true,
    });
    optimizedCost -= extendedStaySave;
  }

  const offPeakSave = Math.round(baseCost * 0.07);
  opportunities.push({
    id: "lodging-offpeak",
    title: "Off-Peak Weekday Rates",
    description: "Sunday to Thursday stays usually unlock lower hotel pricing",
    savings: offPeakSave,
    category: "Lodging",
    agentId: "lodging",
    applied: style !== "luxury",
  });
  if (style !== "luxury") optimizedCost -= offPeakSave;

  const sharedLodgingSave =
    request.groupSize >= 4 && style === "budget" ? Math.round(80 * (request.groupSize - 2)) : 0;

  if (sharedLodgingSave > 0) {
    opportunities.push({
      id: "lodging-shared-group",
      title: "Shared Accommodation Split",
      description: "For groups, an entire home can be cheaper than separate rooms",
      savings: sharedLodgingSave,
      category: "Lodging",
      agentId: "lodging",
      applied: true,
    });
    optimizedCost = Math.max(0, optimizedCost - sharedLodgingSave);
  }

  onProgress("lodging", 95, `Lodging optimized: $${baseCost - optimizedCost} saved`, baseCost - optimizedCost);

  const lodgingType =
    style === "budget" ? "Hostel / budget hotel" : style === "luxury" ? "4-star boutique hotel" : "Mid-range hotel";

  return {
    agentId: "lodging",
    lineItems: [
      {
        category: "Lodging",
        description: `${lodgingType} · ${nights} nights · ${rooms} room${rooms > 1 ? "s" : ""}`,
        baseCost,
        optimizedCost,
        savings: baseCost - optimizedCost,
        savingsSource: appliedTitles(opportunities),
        agentId: "lodging",
      },
    ],
    opportunities,
    savings: baseCost - optimizedCost,
    message: `Found ${opportunities.length} lodging savings opportunities`,
  };
}

export async function runTransportAgent(
  request: ParsedRequest,
  style: TravelStyle,
  onProgress: ProgressCallback
): Promise<AgentResult> {
  const dest = getDestinationData(request.destination);
  const days = request.duration ?? 5;
  const styleMult = style === "budget" ? 0.4 : style === "luxury" ? 2.0 : 1.0;

  onProgress("transport", 20, "Analyzing transit, rideshare, parking, and routing costs...");
  await delay(randomBetween(350, 650));

  onProgress("transport", 55, "Checking transit passes, park-and-ride, and route clustering...");
  await delay(randomBetween(300, 500));

  const baseCost = Math.round((35 * days * request.groupSize + (request.hasCar ? 200 : 0)) * styleMult);
  let optimizedCost = baseCost;
  const opportunities: HiddenOpportunity[] = [];
  const lineItems: CostLineItem[] = [];

  const passSave = !request.hasCar ? Math.round(baseCost * 0.35) : 0;
  opportunities.push({
    id: "transport-pass",
    title: "Unlimited Transit Pass",
    description: "Multi-day transit pass is cheaper than buying individual tickets",
    savings: passSave,
    category: "Transport",
    agentId: "transport",
    applied: !request.hasCar,
  });
  if (!request.hasCar) optimizedCost -= passSave;

  const routingSave = Math.round(15 * days);
  opportunities.push({
    id: "transport-routing",
    title: "Neighborhood Cluster Routing",
    description: "Grouped attractions by area to reduce backtracking and transit hops",
    savings: routingSave,
    category: "Routing",
    agentId: "transport",
    applied: true,
  });
  optimizedCost = Math.max(0, optimizedCost - routingSave);

  if (request.hasCar) {
    const parkingBase = Math.round(25 * days);
    const parkingSave = style !== "luxury" ? Math.round(parkingBase * 0.45) : 0;

    opportunities.push({
      id: "transport-parkride",
      title: "Park-and-Ride Strategy",
      description: "Park outside the city center and use transit for dense areas",
      savings: parkingSave,
      category: "Parking",
      agentId: "transport",
      applied: style !== "luxury",
    });

    lineItems.push({
      category: "Parking",
      description: `${days} days parking with optimized location`,
      baseCost: parkingBase,
      optimizedCost: parkingBase - parkingSave,
      savings: parkingSave,
      savingsSource: style !== "luxury" ? "Park-and-Ride Strategy" : "",
      agentId: "transport",
    });
  }

  lineItems.unshift({
    category: "Transport",
    description: request.hasCar
      ? "Rental car + fuel + route optimization"
      : "Public transit + occasional rideshare + route optimization",
    baseCost,
    optimizedCost,
    savings: baseCost - optimizedCost,
    savingsSource: appliedTitles(opportunities),
    agentId: "transport",
  });

  lineItems.push({
    category: "Routing",
    description: `${days}-day optimized itinerary for ${dest.attractions.length} sites`,
    baseCost: routingSave,
    optimizedCost: 0,
    savings: routingSave,
    savingsSource: "Neighborhood clustering",
    agentId: "transport",
  });

  const totalSavings = lineItems.reduce((sum, item) => sum + item.savings, 0);

  onProgress("transport", 90, `Transport optimized: $${totalSavings} saved`, totalSavings);

  return {
    agentId: "transport",
    lineItems,
    opportunities,
    savings: totalSavings,
    message: "Transport, parking, and routing optimized together",
  };
}

export async function runAttractionsAgent(
  request: ParsedRequest,
  style: TravelStyle,
  onProgress: ProgressCallback
): Promise<AgentResult> {
  const dest = getDestinationData(request.destination);
  const days = request.duration ?? 5;

  onProgress("attractions", 20, "Mapping attractions, free entry days, and city passes...");
  await delay(randomBetween(350, 600));

  onProgress("attractions", 55, "Checking combo tickets and pass bundles...");
  await delay(randomBetween(300, 500));

  const styleMult = style === "budget" ? 0.5 : style === "luxury" ? 2.5 : 1.0;
  const baseCost = Math.round(45 * days * request.groupSize * styleMult);
  let optimizedCost = baseCost;
  const opportunities: HiddenOpportunity[] = [];

  const freeDaySave = Math.round(baseCost * 0.2);
  opportunities.push({
    id: "attractions-free-day",
    title: "Free Museum Entry Day",
    description: `${dest.attractions[1]} offers free entry on selected days`,
    savings: freeDaySave,
    category: "Attractions",
    agentId: "attractions",
    applied: true,
  });
  optimizedCost -= freeDaySave;

  const comboSave = Math.round(baseCost * 0.15);
  opportunities.push({
    id: "attractions-combo",
    title: "Attraction Combo Ticket",
    description: "Bundle top attractions for less than individual tickets",
    savings: comboSave,
    category: "Attractions",
    agentId: "attractions",
    applied: style !== "budget",
  });
  if (style !== "budget") optimizedCost -= comboSave;

  const passCost = Math.round(89 * request.groupSize);
  const individualPassCost = Math.round(140 * request.groupSize);
  const cityPassSave = individualPassCost - passCost;

  opportunities.push({
    id: "attractions-city-pass",
    title: `${request.destination.charAt(0).toUpperCase() + request.destination.slice(1)} City Pass`,
    description: `Covers ${dest.attractions.length} attractions for ${days} days`,
    savings: cityPassSave,
    category: "Local Passes",
    agentId: "attractions",
    applied: style !== "luxury",
  });

  if (style !== "luxury") optimizedCost = Math.max(0, optimizedCost - cityPassSave);

  onProgress("attractions", 90, `${opportunities.length} attraction savings found`, baseCost - optimizedCost);

  return {
    agentId: "attractions",
    lineItems: [
      {
        category: "Attractions & Passes",
        description: `${dest.attractions.slice(0, 3).join(", ")} + city pass options`,
        baseCost,
        optimizedCost,
        savings: baseCost - optimizedCost,
        savingsSource: appliedTitles(opportunities),
        agentId: "attractions",
      },
    ],
    opportunities,
    savings: baseCost - optimizedCost,
    message: "Attractions and local passes optimized together",
  };
}

export async function runDiscountsAgent(
  request: ParsedRequest,
  style: TravelStyle,
  onProgress: ProgressCallback
): Promise<AgentResult> {
  onProgress("discounts", 30, "Scanning promos, memberships, loyalty perks, and group rates...");
  await delay(randomBetween(350, 550));

  onProgress("discounts", 65, "Stacking eligible discounts...");
  await delay(randomBetween(300, 500));

  const baseCost = Math.round(200 * request.groupSize);
  let optimizedCost = baseCost;
  const opportunities: HiddenOpportunity[] = [];

  const promoSave = Math.round(baseCost * 0.15);
  opportunities.push({
    id: "discount-promo",
    title: "Stacked Promo Codes",
    description: "Booking-site promo plus email signup discount combined",
    savings: promoSave,
    category: "Discounts",
    agentId: "discounts",
    applied: true,
  });
  optimizedCost -= promoSave;

  if (request.hasMemberships.includes("STUDENT")) {
    const studentSave = Math.round(baseCost * 0.1);
    opportunities.push({
      id: "discount-student",
      title: "Student Discount Verified",
      description: "Student discount applied to attractions and transit",
      savings: studentSave,
      category: "Discounts",
      agentId: "discounts",
      applied: true,
    });
    optimizedCost -= studentSave;
  }

  const aaaSave = 85;
  opportunities.push({
    id: "discount-aaa",
    title: "AAA Travel Discount",
    description: "AAA membership can reduce hotel and insurance costs",
    savings: aaaSave,
    category: "Memberships",
    agentId: "discounts",
    applied: request.hasMemberships.includes("AAA") || style === "balanced",
  });
  if (request.hasMemberships.includes("AAA") || style === "balanced") optimizedCost -= aaaSave;

  const amexSave = 120;
  opportunities.push({
    id: "discount-amex",
    title: "Amex Platinum Travel Credit",
    description: "Travel credit and lounge value included for luxury trips",
    savings: amexSave,
    category: "Memberships",
    agentId: "discounts",
    applied: style === "luxury",
  });
  if (style === "luxury") optimizedCost -= amexSave;

  const costcoSave = 65;
  opportunities.push({
    id: "discount-costco",
    title: "Costco Travel Cash Back",
    description: "Executive membership cash back on travel bookings",
    savings: costcoSave,
    category: "Memberships",
    agentId: "discounts",
    applied: request.hasMemberships.includes("COSTCO"),
  });
  if (request.hasMemberships.includes("COSTCO")) optimizedCost -= costcoSave;

  if (request.groupSize >= 4) {
    const groupSave = Math.round(35 * request.groupSize);
    opportunities.push({
      id: "discount-group-rate",
      title: "Group Rate Unlocked",
      description: `${request.groupSize}+ travelers qualify for tour and activity discounts`,
      savings: groupSave,
      category: "Group",
      agentId: "discounts",
      applied: true,
    });
    optimizedCost -= groupSave;
  }

  optimizedCost = Math.max(0, optimizedCost);
  const totalSavings = baseCost - optimizedCost;

  onProgress("discounts", 90, `Discounts stacked: $${totalSavings} saved`, totalSavings);

  return {
    agentId: "discounts",
    lineItems: [
      {
        category: "Discounts & Perks",
        description: "Promo codes, memberships, loyalty benefits, and group rates",
        baseCost,
        optimizedCost,
        savings: totalSavings,
        savingsSource: appliedTitles(opportunities),
        agentId: "discounts",
      },
    ],
    opportunities,
    savings: totalSavings,
    message: "Discounts, memberships, and group benefits merged",
  };
}

export async function runBudgetAgent(
  request: ParsedRequest,
  style: TravelStyle,
  onProgress: ProgressCallback,
  allSavings: number
): Promise<AgentResult> {
  onProgress("budget", 30, "Cross-checking total budget and meal strategy...");
  await delay(randomBetween(350, 550));

  onProgress("budget", 60, "Finding final cross-category savings...");
  await delay(randomBetween(300, 500));

  const days = request.duration ?? 5;
  const baseCost = Math.round(60 * days * request.groupSize * (style === "luxury" ? 2.5 : 1));
  const opportunities: HiddenOpportunity[] = [];

  const tradeoffSave = request.budget && allSavings < request.budget * 0.1 ? Math.round(allSavings * 0.05) : 0;

  if (tradeoffSave > 0) {
    opportunities.push({
      id: "budget-reallocate",
      title: "Budget Reallocation",
      description: "Shift savings into better experiences while staying under budget",
      savings: tradeoffSave,
      category: "Budget",
      agentId: "budget",
      applied: true,
    });
  }

  const mealSave = Math.round(25 * days * request.groupSize);
  opportunities.push({
    id: "budget-meals",
    title: "Meal Cost Optimization",
    description: "Mix grocery breakfasts, lunch specials, and selective nicer dinners",
    savings: mealSave,
    category: "Budget",
    agentId: "budget",
    applied: style !== "luxury",
  });

  const appliedMealSave = style !== "luxury" ? mealSave : 0;
  const totalSavings = tradeoffSave + appliedMealSave;

  onProgress("budget", 90, `Budget analysis complete: $${totalSavings} saved`, totalSavings);

  return {
    agentId: "budget",
    lineItems: [
      {
        category: "Food & Dining",
        description: style === "luxury" ? "Fine dining experiences" : "Optimized meal strategy",
        baseCost,
        optimizedCost: Math.max(0, baseCost - appliedMealSave),
        savings: appliedMealSave,
        savingsSource: style !== "luxury" ? "Meal optimization" : "",
        agentId: "budget",
      },
    ],
    opportunities,
    savings: totalSavings,
    message: `Budget agent found $${totalSavings} in final savings`,
  };
}

/**
 * Deprecated compatibility wrappers.
 * These agents were merged so the rest of the app can keep importing them safely.
 */

export async function runParkingAgent(
  request: ParsedRequest,
  style: TravelStyle,
  onProgress: ProgressCallback
): Promise<AgentResult> {
  onProgress("parking", 100, "Parking merged into Transport Agent");
  return mergedAgentResult("parking", "transport");
}

export async function runRoutingAgent(
  request: ParsedRequest,
  style: TravelStyle,
  onProgress: ProgressCallback
): Promise<AgentResult> {
  onProgress("routing", 100, "Routing merged into Transport Agent");
  return mergedAgentResult("routing", "transport");
}

export async function runAttractionsOnlyAgent(
  request: ParsedRequest,
  style: TravelStyle,
  onProgress: ProgressCallback
): Promise<AgentResult> {
  return runAttractionsAgent(request, style, onProgress);
}

export async function runPassesAgent(
  request: ParsedRequest,
  style: TravelStyle,
  onProgress: ProgressCallback
): Promise<AgentResult> {
  onProgress("passes", 100, "Passes merged into Attractions Agent");
  return mergedAgentResult("passes", "attractions");
}

export async function runMembershipsAgent(
  request: ParsedRequest,
  style: TravelStyle,
  onProgress: ProgressCallback
): Promise<AgentResult> {
  onProgress("memberships", 100, "Memberships merged into Discounts Agent");
  return mergedAgentResult("memberships", "discounts");
}

export async function runGroupAgent(
  request: ParsedRequest,
  style: TravelStyle,
  onProgress: ProgressCallback
): Promise<AgentResult> {
  onProgress("group", 100, "Group savings merged into Discounts Agent");
  return mergedAgentResult("group", "discounts");
}

export function createInitialAgentStatuses(): AgentStatus[] {
  const ids: AgentId[] = [
    "flight",
    "lodging",
    "transport",
    "attractions",
    "discounts",
    "budget",
  ];

  const names: Partial<Record<AgentId, string>> = {
    flight: "Flight Agent",
    lodging: "Lodging Agent",
    transport: "Transport Agent",
    attractions: "Attractions & Passes Agent",
    discounts: "Discounts & Perks Agent",
    budget: "Budget Agent",
  };

  return ids.map((id) => ({
    id,
    name: names[id] ?? `${id} Agent`,
    status: "idle" as const,
    progress: 0,
    message: "Waiting to start...",
    lastUpdate: Date.now(),
  }));
}