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

export async function runFlightAgent(
  request: ParsedRequest,
  style: TravelStyle,
  onProgress: ProgressCallback
): Promise<AgentResult> {
  const dest = getDestinationData(request.destination);
  const perPerson = request.groupSize;
  const styleMult = style === "budget" ? 0.7 : style === "luxury" ? 2.2 : 1.0;

  onProgress("flight", 10, request.scrapedData?.distanceMiles
    ? `Scraped ${request.scrapedData.distanceMiles} mi route — scanning fares…`
    : "Scanning 847 flight combinations...");
  await delay(randomBetween(400, 800));

  onProgress("flight", 35, "Checking hidden-city and multi-city routes...");
  await delay(randomBetween(300, 600));

  onProgress("flight", 60, "Analyzing Tuesday/Wednesday departure savings...");
  await delay(randomBetween(300, 500));

  const distanceMi = request.scrapedData?.distanceMiles ?? 800;
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
        savingsSource: opportunities.filter((o) => o.applied).map((o) => o.title).join(", "),
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
  const nights = (request.duration ?? 5) - 1;
  const styleMult = style === "budget" ? 0.55 : style === "luxury" ? 2.5 : 1.0;

  onProgress("lodging", 15, "Comparing 2,400+ accommodations...");
  await delay(randomBetween(400, 700));

  onProgress("lodging", 45, "Checking Airbnb vs hotel bundle deals...");
  await delay(randomBetween(300, 600));

  onProgress("lodging", 70, "Scanning last-minute and extended-stay discounts...");
  await delay(randomBetween(300, 500));

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

  onProgress("lodging", 95, `Lodging optimized: $${baseCost - optimizedCost} saved`, baseCost - optimizedCost);

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
    message: `Found ${opportunities.length} lodging savings opportunities`,
  };
}

export async function runTransportAgent(
  request: ParsedRequest,
  style: TravelStyle,
  onProgress: ProgressCallback
): Promise<AgentResult> {
  const days = request.duration ?? 5;
  onProgress("transport", 20, "Analyzing transit vs rideshare costs...");
  await delay(randomBetween(350, 650));

  onProgress("transport", 55, "Checking multi-day transit pass bundles...");
  await delay(randomBetween(300, 500));

  const styleMult = style === "budget" ? 0.4 : style === "luxury" ? 2.0 : 1.0;
  const baseCost = Math.round((35 * days * request.groupSize + (request.hasCar ? 200 : 0)) * styleMult);
  let optimizedCost = baseCost;
  const opportunities: HiddenOpportunity[] = [];

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

  onProgress("transport", 90, "Transit bundle applied", passSave);

  return {
    agentId: "transport",
    lineItems: [
      {
        category: "Transport",
        description: request.hasCar ? "Rental car + fuel" : "Public transit + occasional rideshare",
        baseCost,
        optimizedCost,
        savings: baseCost - optimizedCost,
        savingsSource: "7-Day Transit Pass",
        agentId: "transport",
      },
    ],
    opportunities,
    savings: baseCost - optimizedCost,
    message: `Transport optimized with transit bundle`,
  };
}

export async function runParkingAgent(
  request: ParsedRequest,
  style: TravelStyle,
  onProgress: ProgressCallback
): Promise<AgentResult> {
  onProgress("parking", 25, "Scanning parking garages and street rules...");
  await delay(randomBetween(300, 500));

  if (!request.hasCar) {
    onProgress("parking", 100, "No car — parking not needed");
    return {
      agentId: "parking",
      lineItems: [],
      opportunities: [],
      savings: 0,
      message: "No parking needed (no car)",
    };
  }

  const days = request.duration ?? 5;
  const baseCost = Math.round(25 * days);
  let optimizedCost = baseCost;
  const opportunities: HiddenOpportunity[] = [];

  const parkRideSave = Math.round(baseCost * 0.45);
  opportunities.push({
    id: "parking-parkride",
    title: "Park-and-Ride Strategy",
    description: "Park at suburban lot ($5/day) + transit into city center",
    savings: parkRideSave,
    category: "Parking",
    agentId: "parking",
    applied: style !== "luxury",
  });
  if (style !== "luxury") optimizedCost -= parkRideSave;

  onProgress("parking", 90, "Park-and-ride option found", parkRideSave);

  return {
    agentId: "parking",
    lineItems: [
      {
        category: "Parking",
        description: `${days} days parking (optimized location)`,
        baseCost,
        optimizedCost,
        savings: baseCost - optimizedCost,
        savingsSource: "Park-and-Ride",
        agentId: "parking",
      },
    ],
    opportunities,
    savings: baseCost - optimizedCost,
    message: "Parking costs minimized via park-and-ride",
  };
}

export async function runAttractionsAgent(
  request: ParsedRequest,
  style: TravelStyle,
  onProgress: ProgressCallback
): Promise<AgentResult> {
  const dest = getDestinationData(request.destination);
  const days = request.duration ?? 5;

  onProgress("attractions", 20, "Mapping attractions and free entry days...");
  await delay(randomBetween(350, 600));

  onProgress("attractions", 55, "Checking combo tickets and off-peak pricing...");
  await delay(randomBetween(300, 500));

  const styleMult = style === "budget" ? 0.5 : style === "luxury" ? 2.5 : 1.0;
  const baseCost = Math.round(45 * days * request.groupSize * styleMult);
  let optimizedCost = baseCost;
  const opportunities: HiddenOpportunity[] = [];

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

  onProgress("attractions", 90, `${opportunities.length} attraction savings found`, baseCost - optimizedCost);

  return {
    agentId: "attractions",
    lineItems: [
      {
        category: "Attractions",
        description: `${dest.attractions.slice(0, 3).join(", ")} + more`,
        baseCost,
        optimizedCost,
        savings: baseCost - optimizedCost,
        savingsSource: opportunities.filter((o) => o.applied).map((o) => o.title).join(", "),
        agentId: "attractions",
      },
    ],
    opportunities,
    savings: baseCost - optimizedCost,
    message: "Attractions scheduled around free entry days",
  };
}

export async function runDiscountsAgent(
  request: ParsedRequest,
  style: TravelStyle,
  onProgress: ProgressCallback
): Promise<AgentResult> {
  onProgress("discounts", 30, "Scanning promo codes and seasonal deals...");
  await delay(randomBetween(350, 550));

  onProgress("discounts", 65, "Checking student, senior, and first-time user discounts...");
  await delay(randomBetween(300, 500));

  const baseCost = Math.round(200 * request.groupSize);
  let optimizedCost = baseCost;
  const opportunities: HiddenOpportunity[] = [];

  const promoSave = Math.round(baseCost * 0.15);
  opportunities.push({
    id: "discount-promo",
    title: "Stacked Promo Codes",
    description: "Hotel booking site promo + email signup discount combined",
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
      description: "ISIC card unlocks 10% off attractions and transit",
      savings: studentSave,
      category: "Discounts",
      agentId: "discounts",
      applied: true,
    });
    optimizedCost -= studentSave;
  }

  onProgress("discounts", 90, "Discounts stacked", baseCost - optimizedCost);

  return {
    agentId: "discounts",
    lineItems: [
      {
        category: "Discounts",
        description: "Applied promo codes & seasonal deals",
        baseCost,
        optimizedCost,
        savings: baseCost - optimizedCost,
        savingsSource: "Stacked promos",
        agentId: "discounts",
      },
    ],
    opportunities,
    savings: baseCost - optimizedCost,
    message: "Multiple discount codes stacked",
  };
}

export async function runMembershipsAgent(
  request: ParsedRequest,
  style: TravelStyle,
  onProgress: ProgressCallback
): Promise<AgentResult> {
  onProgress("memberships", 25, "Checking AAA, Costco, credit card travel perks...");
  await delay(randomBetween(350, 550));

  onProgress("memberships", 60, "Scanning loyalty program cross-benefits...");
  await delay(randomBetween(300, 500));

  const opportunities: HiddenOpportunity[] = [];
  let totalSavings = 0;

  const aaaSave = 85;
  opportunities.push({
    id: "membership-aaa",
    title: "AAA Travel Discount",
    description: "AAA membership: 10% off hotels + free travel insurance",
    savings: aaaSave,
    category: "Memberships",
    agentId: "memberships",
    applied: request.hasMemberships.includes("AAA") || style === "balanced",
  });
  if (request.hasMemberships.includes("AAA") || style === "balanced") totalSavings += aaaSave;

  const amexSave = 120;
  opportunities.push({
    id: "membership-amex",
    title: "Amex Platinum Travel Credit",
    description: "$200 annual travel credit + lounge access included",
    savings: amexSave,
    category: "Memberships",
    agentId: "memberships",
    applied: style === "luxury",
  });
  if (style === "luxury") totalSavings += amexSave;

  const costcoSave = 65;
  opportunities.push({
    id: "membership-costco",
    title: "Costco Travel Cash Back",
    description: "Executive membership: 2% cash back on travel bookings",
    savings: costcoSave,
    category: "Memberships",
    agentId: "memberships",
    applied: request.hasMemberships.includes("COSTCO"),
  });
  if (request.hasMemberships.includes("COSTCO")) totalSavings += costcoSave;

  onProgress("memberships", 90, `$${totalSavings} in membership benefits`, totalSavings);

  return {
    agentId: "memberships",
    lineItems: totalSavings > 0 ? [
      {
        category: "Membership Benefits",
        description: "Applied membership & loyalty perks",
        baseCost: totalSavings,
        optimizedCost: 0,
        savings: totalSavings,
        savingsSource: opportunities.filter((o) => o.applied).map((o) => o.title).join(", "),
        agentId: "memberships",
      },
    ] : [],
    opportunities,
    savings: totalSavings,
    message: `${opportunities.filter((o) => o.applied).length} membership benefits applied`,
  };
}

export async function runPassesAgent(
  request: ParsedRequest,
  style: TravelStyle,
  onProgress: ProgressCallback
): Promise<AgentResult> {
  const dest = getDestinationData(request.destination);
  onProgress("passes", 30, "Researching city passes and museum bundles...");
  await delay(randomBetween(350, 550));

  onProgress("passes", 65, "Comparing Go City vs individual tickets...");
  await delay(randomBetween(300, 500));

  const days = request.duration ?? 5;
  const passCost = Math.round(89 * request.groupSize);
  const individualCost = Math.round(140 * request.groupSize);
  const savings = individualCost - passCost;

  const opportunities: HiddenOpportunity[] = [
    {
      id: "pass-city",
      title: `${request.destination.charAt(0).toUpperCase() + request.destination.slice(1)} City Pass`,
      description: `Covers ${dest.attractions.length} attractions + transit for ${days} days`,
      savings,
      category: "Local Passes",
      agentId: "passes",
      applied: style !== "luxury",
    },
  ];

  onProgress("passes", 90, `City pass saves $${savings}/person`, savings);

  return {
    agentId: "passes",
    lineItems: style !== "luxury" ? [
      {
        category: "Local Passes",
        description: `City Pass (${days}-day, ${request.groupSize} travelers)`,
        baseCost: individualCost,
        optimizedCost: passCost,
        savings,
        savingsSource: "City Pass Bundle",
        agentId: "passes",
      },
    ] : [],
    opportunities,
    savings: style !== "luxury" ? savings : 0,
    message: "City pass covers major attractions at bundle rate",
  };
}

export async function runGroupAgent(
  request: ParsedRequest,
  style: TravelStyle,
  onProgress: ProgressCallback
): Promise<AgentResult> {
  onProgress("group", 25, "Analyzing group rate eligibility...");
  await delay(randomBetween(300, 500));

  if (request.groupSize < 4) {
    onProgress("group", 100, "Group too small for bulk rates");
    return {
      agentId: "group",
      lineItems: [],
      opportunities: [],
      savings: 0,
      message: "No group discounts available (< 4 travelers)",
    };
  }

  onProgress("group", 60, "Negotiating group dining and activity rates...");
  await delay(randomBetween(300, 500));

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
  onProgress("group", 90, `Group savings: $${totalSavings}`, totalSavings);

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

  onProgress("routing", 20, "Building optimal daily routes...");
  await delay(randomBetween(350, 550));

  onProgress("routing", 55, "Clustering attractions by neighborhood...");
  await delay(randomBetween(300, 500));

  onProgress("routing", 80, "Minimizing backtracking and transit hops...");
  await delay(randomBetween(200, 400));

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

  onProgress("routing", 95, "Route optimized", transitSave);

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
  onProgress("budget", 30, "Cross-referencing all agent findings...");
  await delay(randomBetween(350, 550));

  onProgress("budget", 60, "Identifying trade-off opportunities...");
  await delay(randomBetween(300, 500));

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

  onProgress("budget", 90, `Budget analysis complete: $${totalSavings} additional savings`, totalSavings);

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

export function createInitialAgentStatuses(): AgentStatus[] {
  const ids: AgentId[] = [
    "flight", "lodging", "transport", "parking", "attractions",
    "discounts", "memberships", "passes", "group", "routing", "budget",
  ];
  const names: Record<AgentId, string> = {
    flight: "Flight Agent", lodging: "Lodging Agent", transport: "Transport Agent",
    parking: "Parking Agent", attractions: "Attractions Agent", discounts: "Discounts Agent",
    memberships: "Memberships Agent", passes: "Local Passes Agent", group: "Group Agent",
    routing: "Routing Agent", budget: "Budget Agent",
  };
  return ids.map((id) => ({
    id,
    name: names[id],
    status: "idle" as const,
    progress: 0,
    message: "Waiting to start...",
    lastUpdate: Date.now(),
  }));
}
