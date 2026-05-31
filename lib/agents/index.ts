import {
  AgentId,
  AgentStatus,
  CostAuditReport,
  CostLineItem,
  HiddenOpportunity,
  ParsedRequest,
  TravelStyle,
} from "../types";
import { getDestinationData } from "../parser";
import { auditAndRecalibratePlan } from "../cost/accuracy";

export interface AgentResult {
  agentId: AgentId;
  lineItems: CostLineItem[];
  opportunities: HiddenOpportunity[];
  savings: number;
  message: string;
  costAudit?: CostAuditReport;
  verifiedLineItems?: CostLineItem[];
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

function agentPause() {
  return delay(40);
}

function markDone(
  onProgress: ProgressCallback,
  agentId: AgentId,
  message: string,
  savings?: number
) {
  onProgress(agentId, 100, message, savings);
}

export async function runFlightAgent(
  request: ParsedRequest,
  style: TravelStyle,
  onProgress: ProgressCallback
): Promise<AgentResult> {
  const dest = getDestinationData(request.destination);
  const perPerson = request.groupSize;
  const styleMult = style === "budget" ? 0.7 : style === "luxury" ? 2.2 : 1.0;
  const scrapedData = request.scrapedData;

  onProgress(
    "flight",
    20,
    scrapedData?.distanceMiles
      ? `Using ${scrapedData.distanceMiles} mi scraped route — analyzing fares…`
      : "Applying rule-based fare tables…"
  );
  await agentPause();

  onProgress("flight", 55, "Checking departure-day and fare-class savings…");
  await agentPause();

  const distanceMi = scrapedData?.distanceMiles ?? 800;
  const baseCost = Math.round((150 + distanceMi * 0.14) * perPerson * styleMult);
  let optimizedCost = baseCost;
  const opportunities: HiddenOpportunity[] = [];

  const tuesdaySave = Math.round(baseCost * 0.12);
  opportunities.push({
    id: "flight-tuesday",
    title: "Tuesday Departure Discount",
    description: "Flying Tuesday instead of Friday saves ~12% on average for this route",
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
      description: "Book through connection city — same destination, lower fare class",
      savings: hiddenCitySave,
      category: "Flights",
      agentId: "flight",
      applied: true,
    });
    optimizedCost -= hiddenCitySave;
  }

  const savings = baseCost - optimizedCost;
  markDone(
    onProgress,
    "flight",
    `Flight pricing complete — saved $${savings}`,
    savings
  );

  return {
    agentId: "flight",
    lineItems: [
      {
        category: "Flights",
        description: `${request.origin ?? scrapedData?.originCity ?? "Home"} → ${dest.airport} (${perPerson} traveler${perPerson > 1 ? "s" : ""}, ${distanceMi} mi)`,
        baseCost,
        optimizedCost,
        savings,
        savingsSource: opportunities.filter((o) => o.applied).map((o) => o.title).join(", "),
        agentId: "flight",
      },
    ],
    opportunities,
    savings,
    message: `Rule-based fare analysis: saved $${savings}`,
  };
}

export async function runLodgingAgent(
  request: ParsedRequest,
  style: TravelStyle,
  onProgress: ProgressCallback
): Promise<AgentResult> {
  const dest = getDestinationData(request.destination);
  const nights = (request.duration ?? 5) - 1;
  const styleMult = style === "budget" ? 0.55 : style === "luxury" ? 2.5 : 1.0;

  const nightlyRate = Math.round((dest.baseCost * 0.08) * styleMult);
  const rooms = Math.ceil(request.groupSize / 2);
  const baseCost = nightlyRate * nights * rooms;
  let optimizedCost = baseCost;
  const opportunities: HiddenOpportunity[] = [];

  const extendedStaySave = nights >= 5 ? Math.round(baseCost * 0.1) : 0;
  if (extendedStaySave > 0) {
    opportunities.push({
      id: "lodging-extended",
      title: "Extended Stay Discount",
      description: "7+ night stays qualify for 10% off at partner hotels",
      savings: extendedStaySave,
      category: "Lodging",
      agentId: "lodging",
      applied: nights >= 5,
    });
    if (nights >= 5) optimizedCost -= extendedStaySave;
  }

  const offPeakSave = Math.round(baseCost * 0.07);
  opportunities.push({
    id: "lodging-offpeak",
    title: "Off-Peak Weekday Rates",
    description: "Check-in Sunday, check-out Thursday for lowest rates",
    savings: offPeakSave,
    category: "Lodging",
    agentId: "lodging",
    applied: style === "budget" || style === "balanced",
  });
  if (style !== "luxury") optimizedCost -= offPeakSave;

  const lodgingSavings = baseCost - optimizedCost;
  markDone(onProgress, "lodging", `Rule-based lodging estimate — $${lodgingSavings} savings`, lodgingSavings);

  const lodgingType = style === "budget" ? "Hostel/ budget hotel" : style === "luxury" ? "4-star boutique hotel" : "Mid-range hotel";

  return {
    agentId: "lodging",
    lineItems: [
      {
        category: "Lodging",
        description: `${lodgingType} · ${nights} nights · ${rooms} room${rooms > 1 ? "s" : ""}`,
        baseCost,
        optimizedCost,
        savings: baseCost - optimizedCost,
        savingsSource: opportunities.filter((o) => o.applied).map((o) => o.title).join(", "),
        agentId: "lodging",
      },
    ],
    opportunities,
    savings: baseCost - optimizedCost,
    message: `Lodging calculated from destination pricing tables`,
  };
}

export async function runTransportAgent(
  request: ParsedRequest,
  style: TravelStyle,
  onProgress: ProgressCallback
): Promise<AgentResult> {
  const days = request.duration ?? 5;
  const dest = getDestinationData(request.destination);

  const styleMult = style === "budget" ? 0.4 : style === "luxury" ? 2.0 : 1.0;
  let baseCost = Math.round((35 * days * request.groupSize + (request.hasCar ? 200 : 0)) * styleMult);
  let optimizedCost = baseCost;
  const opportunities: HiddenOpportunity[] = [];
  const lineItems: CostLineItem[] = [];

  const passSave = Math.round(baseCost * 0.35);
  opportunities.push({
    id: "transport-pass",
    title: "7-Day Unlimited Transit Pass",
    description: "City transit pass covers unlimited rides — cheaper than individual tickets",
    savings: passSave,
    category: "Transport",
    agentId: "transport",
    applied: !request.hasCar,
  });
  if (!request.hasCar) optimizedCost -= passSave;

  // Absorbed: local passes (transit portion)
  const cityPassTransitSave = Math.round(18 * days * request.groupSize);
  opportunities.push({
    id: "transport-city-pass-transit",
    title: `${request.destination.charAt(0).toUpperCase() + request.destination.slice(1)} City Pass — Transit Included`,
    description: "City card bundles unlimited transit with attraction entry",
    savings: cityPassTransitSave,
    category: "Local Passes",
    agentId: "transport",
    applied: !request.hasCar && style !== "luxury",
  });
  if (!request.hasCar && style !== "luxury") optimizedCost -= cityPassTransitSave;

  lineItems.push({
    category: "Transport",
    description: request.hasCar ? "Rental car + fuel + transit pass" : "Public transit + city pass transit",
    baseCost,
    optimizedCost,
    savings: baseCost - optimizedCost,
    savingsSource: "Transit & city pass bundle",
    agentId: "transport",
  });

  // Absorbed: parking (ground transport domain)
  if (request.hasCar) {
    const parkingBase = Math.round(25 * days);
    let parkingOpt = parkingBase;
    const parkRideSave = Math.round(parkingBase * 0.45);
    opportunities.push({
      id: "transport-parkride",
      title: "Park-and-Ride Strategy",
      description: "Park at suburban lot ($5/day) + transit into city center",
      savings: parkRideSave,
      category: "Parking",
      agentId: "transport",
      applied: style !== "luxury",
    });
    if (style !== "luxury") parkingOpt -= parkRideSave;

    baseCost += parkingBase;
    optimizedCost += parkingOpt;
    lineItems.push({
      category: "Parking",
      description: `${days} days parking (park-and-ride optimized)`,
      baseCost: parkingBase,
      optimizedCost: parkingOpt,
      savings: parkingBase - parkingOpt,
      savingsSource: "Park-and-Ride",
      agentId: "transport",
    });
  }

  const transportSavings = baseCost - optimizedCost;
  markDone(onProgress, "transport", `Transport rules applied — $${transportSavings} savings`, transportSavings);

  return {
    agentId: "transport",
    lineItems,
    opportunities,
    savings: baseCost - optimizedCost,
    message: "Transport cost from transit and parking rules",
  };
}

export async function runAttractionsAgent(
  request: ParsedRequest,
  style: TravelStyle,
  onProgress: ProgressCallback
): Promise<AgentResult> {
  const dest = getDestinationData(request.destination);
  const days = request.duration ?? 5;

  const styleMult = style === "budget" ? 0.5 : style === "luxury" ? 2.5 : 1.0;
  let baseCost = Math.round(45 * days * request.groupSize * styleMult);
  let optimizedCost = baseCost;
  const opportunities: HiddenOpportunity[] = [];
  const lineItems: CostLineItem[] = [];

  const freeDaySave = Math.round(baseCost * 0.2);
  opportunities.push({
    id: "attractions-free-day",
    title: "Free Museum Entry Day",
    description: `${dest.attractions[1]} offers free entry on first Sunday of each month`,
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
    description: "Bundle 3 top attractions for 15% less than individual tickets",
    savings: comboSave,
    category: "Attractions",
    agentId: "attractions",
    applied: style !== "budget",
  });
  if (style !== "budget") optimizedCost -= comboSave;

  // Absorbed: local passes (attraction entry portion)
  const passCost = Math.round(89 * request.groupSize);
  const individualCost = Math.round(140 * request.groupSize);
  const passEntrySave = individualCost - passCost;
  if (style !== "luxury") {
    opportunities.push({
      id: "attractions-city-pass",
      title: `${request.destination.charAt(0).toUpperCase() + request.destination.slice(1)} City Pass — Attractions`,
      description: `Covers ${dest.attractions.length} attractions for ${days} days`,
      savings: passEntrySave,
      category: "Local Passes",
      agentId: "attractions",
      applied: true,
    });
    optimizedCost -= passEntrySave;
    lineItems.push({
      category: "Local Passes",
      description: `City Pass entry (${days}-day, ${request.groupSize} travelers)`,
      baseCost: individualCost,
      optimizedCost: passCost,
      savings: passEntrySave,
      savingsSource: "City Pass Bundle",
      agentId: "attractions",
    });
  }

  // Absorbed: party / event planning
  if (request.isPartyTrip) {
    const partySave = Math.round(120 * request.groupSize * (style === "budget" ? 0.5 : 1));
    opportunities.push({
      id: "attractions-party-bundle",
      title: `${request.partyType ?? "Celebration"} Activity Bundle`,
      description: "Group venue booking + nightlife package cheaper than booking separately",
      savings: partySave,
      category: "Events",
      agentId: "attractions",
      applied: true,
    });
    optimizedCost -= partySave;

    if (request.interests.includes("nightlife") || request.partyType?.includes("nightlife")) {
      const nightlifeSave = Math.round(40 * request.groupSize);
      opportunities.push({
        id: "attractions-nightlife",
        title: "Nightlife Pass",
        description: "Cover charge waivers + drink specials at partner venues",
        savings: nightlifeSave,
        category: "Nightlife",
        agentId: "attractions",
        applied: true,
      });
      optimizedCost -= nightlifeSave;
    }
  }

  lineItems.unshift({
    category: request.isPartyTrip ? "Activities & Events" : "Attractions",
    description: request.isPartyTrip
      ? `${request.partyType ?? "Celebration"} · ${dest.attractions.slice(0, 2).join(", ")} + more`
      : `${dest.attractions.slice(0, 3).join(", ")} + more`,
    baseCost,
    optimizedCost,
    savings: baseCost - optimizedCost,
    savingsSource: opportunities.filter((o) => o.applied).map((o) => o.title).join(", "),
    agentId: "attractions",
  });

  const attractionSavings = lineItems.reduce((s, i) => s + i.savings, 0);
  markDone(onProgress, "attractions", "Activity costs from destination rules", attractionSavings);

  return {
    agentId: "attractions",
    lineItems,
    opportunities,
    savings: attractionSavings,
    message: "Activity pricing from rule-based tables",
  };
}

export async function runSavingsAgent(
  request: ParsedRequest,
  style: TravelStyle,
  onProgress: ProgressCallback
): Promise<AgentResult> {
  const opportunities: HiddenOpportunity[] = [];
  const lineItems: CostLineItem[] = [];
  let totalSavings = 0;

  // Former discounts agent
  const promoBase = Math.round(200 * request.groupSize);
  let promoOpt = promoBase;
  const promoSave = Math.round(promoBase * 0.15);
  opportunities.push({
    id: "savings-promo",
    title: "Stacked Promo Codes",
    description: "Hotel booking site promo + email signup discount combined",
    savings: promoSave,
    category: "Discounts",
    agentId: "savings",
    applied: true,
  });
  promoOpt -= promoSave;

  if (request.hasMemberships.includes("STUDENT")) {
    const studentSave = Math.round(promoBase * 0.1);
    opportunities.push({
      id: "savings-student",
      title: "Student Discount Verified",
      description: "ISIC card unlocks 10% off attractions and transit",
      savings: studentSave,
      category: "Discounts",
      agentId: "savings",
      applied: true,
    });
    promoOpt -= studentSave;
  }

  if (promoBase - promoOpt > 0) {
    lineItems.push({
      category: "Discounts",
      description: "Applied promo codes & seasonal deals",
      baseCost: promoBase,
      optimizedCost: promoOpt,
      savings: promoBase - promoOpt,
      savingsSource: "Stacked promos",
      agentId: "savings",
    });
    totalSavings += promoBase - promoOpt;
  }

  // Former memberships agent
  const aaaSave = 85;
  opportunities.push({
    id: "savings-aaa",
    title: "AAA Travel Discount",
    description: "AAA membership: 10% off hotels + free travel insurance",
    savings: aaaSave,
    category: "Memberships",
    agentId: "savings",
    applied: request.hasMemberships.includes("AAA") || style === "balanced",
  });
  if (request.hasMemberships.includes("AAA") || style === "balanced") totalSavings += aaaSave;

  const amexSave = 120;
  opportunities.push({
    id: "savings-amex",
    title: "Amex Platinum Travel Credit",
    description: "$200 annual travel credit + lounge access included",
    savings: amexSave,
    category: "Memberships",
    agentId: "savings",
    applied: style === "luxury",
  });
  if (style === "luxury") totalSavings += amexSave;

  const costcoSave = 65;
  opportunities.push({
    id: "savings-costco",
    title: "Costco Travel Cash Back",
    description: "Executive membership: 2% cash back on travel bookings",
    savings: costcoSave,
    category: "Memberships",
    agentId: "savings",
    applied: request.hasMemberships.includes("COSTCO"),
  });
  if (request.hasMemberships.includes("COSTCO")) totalSavings += costcoSave;

  const membershipApplied = opportunities.filter(
    (o) => o.category === "Memberships" && o.applied
  );
  if (membershipApplied.length > 0) {
    const memTotal = membershipApplied.reduce((s, o) => s + o.savings, 0);
    lineItems.push({
      category: "Membership Benefits",
      description: "Applied membership & loyalty pricing credentials",
      baseCost: memTotal,
      optimizedCost: 0,
      savings: memTotal,
      savingsSource: membershipApplied.map((o) => o.title).join(", "),
      agentId: "savings",
    });
  }

  markDone(onProgress, "savings", `$${totalSavings} in membership and promo rules`, totalSavings);

  return {
    agentId: "savings",
    lineItems,
    opportunities,
    savings: totalSavings,
    message: "Discount rules applied from membership tables",
  };
}

export async function runGroupAgent(
  request: ParsedRequest,
  style: TravelStyle,
  onProgress: ProgressCallback
): Promise<AgentResult> {
  if (request.groupSize < 4) {
    markDone(onProgress, "group", "Group too small for bulk rates");
    return {
      agentId: "group",
      lineItems: [],
      opportunities: [],
      savings: 0,
      message: "No group discounts available (< 4 travelers)",
    };
  }

  const groupSave = Math.round(35 * request.groupSize);
  const opportunities: HiddenOpportunity[] = [
    {
      id: "group-rate",
      title: "Group Rate Unlocked",
      description: `${request.groupSize}+ travelers qualify for 8% group discount on tours`,
      savings: groupSave,
      category: "Group",
      agentId: "group",
      applied: true,
    },
  ];

  const sharedLodgingSave = Math.round(80 * (request.groupSize - 2));
  opportunities.push({
    id: "group-lodging",
    title: "Shared Accommodation Split",
    description: "Airbnb entire home splits to less per person than individual rooms",
    savings: sharedLodgingSave,
    category: "Group",
    agentId: "group",
    applied: style === "budget",
  });

  const totalSavings = groupSave + (style === "budget" ? sharedLodgingSave : 0);
  markDone(onProgress, "group", `Group rules: $${totalSavings} savings`, totalSavings);

  return {
    agentId: "group",
    lineItems: [
      {
        category: "Group Savings",
        description: `Group of ${request.groupSize} optimized rates`,
        baseCost: totalSavings,
        optimizedCost: 0,
        savings: totalSavings,
        savingsSource: "Group rates + shared lodging",
        agentId: "group",
      },
    ],
    opportunities,
    savings: totalSavings,
    message: `Group of ${request.groupSize}: $${totalSavings} in group savings`,
  };
}

export async function runRoutingAgent(
  request: ParsedRequest,
  style: TravelStyle,
  onProgress: ProgressCallback
): Promise<AgentResult> {
  const dest = getDestinationData(request.destination);
  const days = request.duration ?? 5;

  const transitSave = Math.round(15 * days);
  const opportunities: HiddenOpportunity[] = [
    {
      id: "routing-cluster",
      title: "Neighborhood Cluster Routing",
      description: "Grouped attractions by area — saves 2+ transit rides per day",
      savings: transitSave,
      category: "Routing",
      agentId: "routing",
      applied: true,
    },
  ];

  markDone(onProgress, "routing", "Route order from neighborhood rules", transitSave);

  return {
    agentId: "routing",
    lineItems: [
      {
        category: "Routing",
        description: `${days}-day optimized itinerary for ${dest.attractions.length} sites`,
        baseCost: transitSave,
        optimizedCost: 0,
        savings: transitSave,
        savingsSource: "Neighborhood clustering",
        agentId: "routing",
      },
    ],
    opportunities,
    savings: transitSave,
    message: `${days}-day route optimized to minimize transit`,
  };
}

export async function runBudgetAgent(
  request: ParsedRequest,
  style: TravelStyle,
  onProgress: ProgressCallback,
  allSavings: number
): Promise<AgentResult> {
  const tradeoffSave = Math.round(allSavings * 0.05);
  const opportunities: HiddenOpportunity[] = [];

  if (request.budget && allSavings < request.budget * 0.1) {
    opportunities.push({
      id: "budget-reallocate",
      title: "Budget Reallocation",
      description: "Shift lodging savings to upgrade experiences while staying under budget",
      savings: tradeoffSave,
      category: "Budget",
      agentId: "budget",
      applied: true,
    });
  }

  opportunities.push({
    id: "budget-meals",
    title: "Meal Cost Optimization",
    description: "Mix grocery breakfast + lunch specials + one nice dinner per day",
    savings: Math.round(25 * (request.duration ?? 5) * request.groupSize),
    category: "Budget",
    agentId: "budget",
    applied: style !== "luxury",
  });

  const mealSave = opportunities[opportunities.length - 1].savings;
  const totalSavings = tradeoffSave + (style !== "luxury" ? mealSave : 0);

  markDone(onProgress, "budget", `Budget rules: $${totalSavings} additional savings`, totalSavings);

  return {
    agentId: "budget",
    lineItems: [
      {
        category: "Food & Dining",
        description: style === "luxury" ? "Fine dining experiences" : "Optimized meal strategy",
        baseCost: Math.round(60 * (request.duration ?? 5) * request.groupSize * (style === "luxury" ? 2.5 : 1)),
        optimizedCost: Math.round(60 * (request.duration ?? 5) * request.groupSize * (style === "luxury" ? 2.5 : 1)) - (style !== "luxury" ? mealSave : 0),
        savings: style !== "luxury" ? mealSave : 0,
        savingsSource: "Meal optimization",
        agentId: "budget",
      },
    ],
    opportunities,
    savings: totalSavings,
    message: `Budget agent found $${totalSavings} in cross-category savings`,
  };
}

export async function runEfficiencyAgent(
  request: ParsedRequest,
  style: TravelStyle,
  onProgress: ProgressCallback,
  priorResults: Map<AgentId, AgentResult>
): Promise<AgentResult> {
  const { lineItems, audit } = auditAndRecalibratePlan(
    request,
    style,
    priorResults
  );

  markDone(
    onProgress,
    "efficiency",
    audit.feasible
      ? `Verified total $${audit.verifiedTotal.toLocaleString()} (${audit.confidence} confidence)`
      : `Budget infeasible — minimum $${audit.minRealisticTotal.toLocaleString()}`
  );

  const opportunities: HiddenOpportunity[] = [];

  if (audit.correctionsApplied > 0) {
    opportunities.push({
      id: "efficiency-recalibration",
      title: "Cost Recalibration Applied",
      description: audit.message,
      savings: 0,
      category: "Verification",
      agentId: "efficiency",
      applied: true,
    });
  }

  if (!audit.feasible && audit.budgetGap) {
    opportunities.push({
      id: "efficiency-budget-gap",
      title: "Budget Below Realistic Minimum",
      description: `Trip realistically costs at least $${audit.minRealisticTotal.toLocaleString()} — increase budget by $${audit.budgetGap.toLocaleString()} or shorten the trip`,
      savings: 0,
      category: "Verification",
      agentId: "efficiency",
      applied: false,
    });
  }

  if (request.scrapedData?.distanceMiles) {
    opportunities.push({
      id: "efficiency-distance-verified",
      title: "Distance-Verified Pricing",
      description: `Flight and transport floors based on ${request.scrapedData.distanceMiles} mi scraped route`,
      savings: 0,
      category: "Verification",
      agentId: "efficiency",
      applied: true,
    });
  }

  onProgress(
    "efficiency",
    95,
    `${audit.correctionsApplied} correction(s) · ${audit.confidence} confidence`,
    Math.max(0, audit.originalTotal - audit.verifiedTotal)
  );

  return {
    agentId: "efficiency",
    lineItems: audit.correctionsApplied > 0 || !audit.feasible
      ? [
          {
            category: "Cost Verification",
            description: audit.message,
            baseCost: audit.originalTotal,
            optimizedCost: audit.verifiedTotal,
            savings: Math.max(0, audit.originalTotal - audit.verifiedTotal),
            savingsSource: `${audit.confidence} confidence audit`,
            agentId: "efficiency",
          },
        ]
      : [],
    opportunities,
    savings: 0,
    message: audit.message,
    costAudit: audit,
    verifiedLineItems: lineItems,
  };
}

export function createInitialAgentStatuses(): AgentStatus[] {
  const ids: AgentId[] = [
    "flight", "lodging", "transport", "attractions",
    "savings", "group", "routing", "budget", "efficiency",
  ];
  const names: Record<AgentId, string> = {
    flight: "Flight Agent",
    lodging: "Lodging Agent",
    transport: "Transport Agent",
    attractions: "Attractions Agent",
    savings: "Savings Agent",
    group: "Group Agent",
    routing: "Routing Agent",
    budget: "Budget Agent",
    efficiency: "Cost Efficiency Agent",
  };
  return ids.map((id) => ({
    id,
    name: names[id],
    status: "idle" as const,
    progress: 0,
    message: "Waiting…",
    lastUpdate: Date.now(),
  }));
}
