import { Assumption, ParsedRequest } from "./types";
import { getDestinationData } from "./locations";

const DEFAULT_DEST = "new york";

const KNOWN_DESTINATIONS = [
  "new york", "paris", "tokyo", "london", "barcelona",
  "san francisco", "chicago", "boston",
];

function extractDestination(query: string): string {
  const lower = query.toLowerCase();
  for (const dest of KNOWN_DESTINATIONS) {
    if (lower.includes(dest)) return dest;
  }
  const toMatch = lower.match(/(?:to|visit|in|going to|trip to)\s+([a-z\s]+?)(?:\s+(?:for|with|in|on|next|this)|$|,|\.)/);
  if (toMatch) {
    const candidate = toMatch[1].trim();
    for (const dest of KNOWN_DESTINATIONS) {
      if (candidate.includes(dest) || dest.includes(candidate)) return dest;
    }
    return candidate;
  }
  return DEFAULT_DEST;
}

function extractGroupSize(query: string): number {
  const lower = query.toLowerCase();
  const patterns = [
    /(\d+)\s*(?:people|persons|travelers|guests|of us)/,
    /group of (\d+)/,
    /(\d+)\s*(?:adults|friends|family members)/,
    /(?:me and|with)\s+(\d+)/,
    /family of (\d+)/,
  ];
  for (const p of patterns) {
    const m = lower.match(p);
    if (m) return parseInt(m[1], 10);
  }
  if (lower.includes("solo") || lower.includes("alone") || lower.includes("just me")) return 1;
  if (lower.includes("couple") || lower.includes("two of us") || lower.includes("partner")) return 2;
  if (lower.includes("family")) return 4;
  return 2;
}

function extractDuration(query: string): number {
  const lower = query.toLowerCase();
  const m = lower.match(/(\d+)\s*(?:day|night|week)/);
  if (m) {
    const n = parseInt(m[1], 10);
    if (lower.includes("week")) return n * 7;
    if (lower.includes("night")) return n + 1;
    return n;
  }
  if (lower.includes("weekend")) return 3;
  if (lower.includes("week")) return 7;
  return 5;
}

/** Only extract budget when the user explicitly mentions spending limits — never from "5 days" or "2 people". */
function extractBudget(query: string): number | undefined {
  const patterns = [
    /(?:budget|max(?:imum)?|limit|cap|spend(?:ing)?)\s*(?:of|is|at|:)?\s*\$?\s*([\d,]+(?:\.\d{2})?)/i,
    /\$?\s*([\d,]+(?:\.\d{2})?)\s*(?:budget|max(?:imum)?|limit|total|cap|usd)/i,
    /(?:under|below|less than|up to)\s+\$?\s*([\d,]+)/i,
  ];
  for (const re of patterns) {
    const m = query.match(re);
    if (m) {
      const amount = parseInt(m[1].replace(/,/g, ""), 10);
      if (!Number.isNaN(amount) && amount > 0) return amount;
    }
  }
  return undefined;
}

function parseBudgetAssumptionValue(val: string): number | undefined {
  const lower = val.toLowerCase();
  if (
    lower === "flexible" ||
    lower.includes("no limit") ||
    lower.includes("no strict") ||
    lower.includes("not specified")
  ) {
    return undefined;
  }
  const digits = val.replace(/[^\d]/g, "");
  if (!digits) return undefined;
  const amount = parseInt(digits, 10);
  return Number.isNaN(amount) || amount <= 0 ? undefined : amount;
}

function extractOrigin(query: string): string | undefined {
  const m = query.match(/(?:from|leaving|departing)\s+([A-Za-z\s]+?)(?:\s+to|\s+for|,|$)/i);
  return m ? m[1].trim() : undefined;
}

function extractInterests(query: string): string[] {
  const lower = query.toLowerCase();
  const interests: string[] = [];
  const keywords: Record<string, string> = {
    museum: "museums",
    art: "art galleries",
    food: "food & dining",
    beach: "beaches",
    hiking: "outdoor activities",
    shopping: "shopping",
    nightlife: "nightlife",
    history: "historical sites",
    music: "live music",
    sports: "sports events",
    kid: "family-friendly",
    child: "family-friendly",
  };
  for (const [kw, label] of Object.entries(keywords)) {
    if (lower.includes(kw)) interests.push(label);
  }
  return interests.length ? interests : ["sightseeing", "local culture"];
}

function extractMemberships(query: string): string[] {
  const lower = query.toLowerCase();
  const memberships: string[] = [];
  const known = ["aaa", "costco", "aarp", "student", "military", "senior", "amex", "chase"];
  for (const m of known) {
    if (lower.includes(m)) memberships.push(m.toUpperCase());
  }
  return memberships;
}

function hasCar(query: string): boolean {
  const lower = query.toLowerCase();
  return (
    lower.includes("driving") ||
    lower.includes("rent a car") ||
    lower.includes("rental car") ||
    lower.includes("road trip") ||
    lower.includes("with car")
  );
}

function extractPartyTrip(query: string): { isPartyTrip: boolean; partyType?: string } {
  const lower = query.toLowerCase();
  const types: Record<string, string> = {
    "bachelor party": "bachelor party",
    "bachelorette": "bachelorette party",
    birthday: "birthday celebration",
    anniversary: "anniversary",
    wedding: "wedding celebration",
    reunion: "reunion",
    celebration: "celebration",
    "night out": "nightlife",
    nightlife: "nightlife",
    "stag do": "stag party",
    "hen do": "hen party",
  };
  for (const [kw, label] of Object.entries(types)) {
    if (lower.includes(kw)) return { isPartyTrip: true, partyType: label };
  }
  if (/\bparty\b/.test(lower)) return { isPartyTrip: true, partyType: "group celebration" };
  return { isPartyTrip: false };
}

export function parseNaturalLanguage(query: string): ParsedRequest {
  const destination = extractDestination(query);
  const party = extractPartyTrip(query);
  return {
    destination,
    origin: extractOrigin(query),
    duration: extractDuration(query),
    groupSize: extractGroupSize(query),
    budget: extractBudget(query),
    interests: extractInterests(query),
    hasCar: hasCar(query),
    hasMemberships: extractMemberships(query),
    isPartyTrip: party.isPartyTrip,
    partyType: party.partyType,
    rawQuery: query,
  };
}

export function generateAssumptions(request: ParsedRequest): Assumption[] {
  const dest = request.destination;
  const assumptions: Assumption[] = [];

  const resolvedOrigin =
    request.origin ??
    request.userLocation?.city ??
    request.scrapedData?.originCity;

  if (!resolvedOrigin) {
    assumptions.push({
      id: "origin",
      field: "origin",
      label: "Departure city",
      assumedValue: "Your nearest major airport",
      confidence: "low",
      options: [
        { id: "nyc", label: "New York (JFK)", value: "New York" },
        { id: "la", label: "Los Angeles (LAX)", value: "Los Angeles" },
        { id: "chicago", label: "Chicago (ORD)", value: "Chicago" },
        { id: "boston", label: "Boston (BOS)", value: "Boston" },
        { id: "dc", label: "Washington DC (DCA)", value: "Washington DC" },
      ],
      status: "pending",
    });
  } else {
    assumptions.push({
      id: "origin",
      field: "origin",
      label: "Departure city",
      assumedValue: resolvedOrigin,
      confidence: request.userLocation ? "high" : "medium",
      options: [
        { id: "current", label: resolvedOrigin, value: resolvedOrigin },
        { id: "nyc", label: "New York (JFK)", value: "New York" },
        { id: "la", label: "Los Angeles (LAX)", value: "Los Angeles" },
        { id: "chicago", label: "Chicago (ORD)", value: "Chicago" },
      ],
      status: request.userLocation ? "confirmed" : "pending",
    });
  }

  assumptions.push({
    id: "dates",
    field: "dates",
    label: "Travel dates",
    assumedValue: "Next month, flexible ±3 days",
    confidence: "medium",
    options: [
      { id: "next-month", label: "Next month", value: "next-month" },
      { id: "summer", label: "This summer", value: "summer" },
      { id: "fall", label: "This fall", value: "fall" },
      { id: "winter", label: "This winter", value: "winter" },
      { id: "flexible", label: "Fully flexible", value: "flexible" },
    ],
    status: "pending",
  });

  assumptions.push({
    id: "group",
    field: "groupSize",
    label: "Group size",
    assumedValue: `${request.groupSize} traveler${request.groupSize > 1 ? "s" : ""}`,
    confidence: request.rawQuery.match(/\d+\s*(?:people|persons|travelers)/) ? "high" : "medium",
    options: [
      { id: "1", label: "Solo (1)", value: "1" },
      { id: "2", label: "Couple (2)", value: "2" },
      { id: "4", label: "Family (4)", value: "4" },
      { id: "6", label: "Group (6)", value: "6" },
    ],
    status: "pending",
  });

  assumptions.push({
    id: "duration",
    field: "duration",
    label: "Trip duration",
    assumedValue: `${request.duration} days`,
    confidence: request.rawQuery.match(/\d+\s*day/) ? "high" : "medium",
    options: [
      { id: "3", label: "Weekend (3 days)", value: "3" },
      { id: "5", label: "5 days", value: "5" },
      { id: "7", label: "1 week", value: "7" },
      { id: "10", label: "10 days", value: "10" },
    ],
    status: "pending",
  });

  assumptions.push({
    id: "car",
    field: "hasCar",
    label: "Transportation mode",
    assumedValue: request.hasCar ? "Renting a car" : "Public transit & rideshare",
    confidence: request.hasCar ? "high" : "medium",
    options: [
      { id: "transit", label: "Public transit only", value: "transit" },
      { id: "rideshare", label: "Rideshare & transit", value: "rideshare" },
      { id: "rental", label: "Rental car", value: "rental" },
      { id: "own", label: "Driving own car", value: "own" },
    ],
    status: "pending",
  });

  if (request.budget == null) {
    assumptions.push({
      id: "budget",
      field: "budget",
      label: "Total budget",
      assumedValue: "Not specified — no spending cap (you didn't mention a budget)",
      confidence: "low",
      options: [
        { id: "1000", label: "Under $1,000", value: "1000" },
        { id: "2000", label: "Under $2,000", value: "2000" },
        { id: "3000", label: "Under $3,000", value: "3000" },
        { id: "5000", label: "Under $5,000", value: "5000" },
        { id: "flexible", label: "No limit — optimize for value", value: "flexible" },
      ],
      status: "pending",
    });
  } else {
    assumptions.push({
      id: "budget",
      field: "budget",
      label: "Total budget",
      assumedValue: `$${request.budget.toLocaleString()} (from your message)`,
      confidence: "high",
      options: [
        { id: "1000", label: "Under $1,000", value: "1000" },
        { id: "2000", label: "Under $2,000", value: "2000" },
        { id: "3000", label: "Under $3,000", value: "3000" },
        { id: "5000", label: "Under $5,000", value: "5000" },
        { id: "flexible", label: "No limit", value: "flexible" },
      ],
      status: "pending",
    });
  }

  assumptions.push({
    id: "destination",
    field: "destination",
    label: "Destination",
    assumedValue: dest.charAt(0).toUpperCase() + dest.slice(1),
    confidence: request.rawQuery.toLowerCase().includes(dest) ? "high" : "low",
    options: KNOWN_DESTINATIONS.slice(0, 5).map((d) => ({
      id: d.replace(/\s/g, "-"),
      label: d.charAt(0).toUpperCase() + d.slice(1),
      value: d,
    })),
    status: "pending",
  });

  return assumptions;
}

export { getDestinationData } from "./locations";

export function applyAssumptionUpdates(
  request: ParsedRequest,
  assumptions: Assumption[]
): ParsedRequest {
  const updated = { ...request };
  for (const a of assumptions) {
    const val = a.userValue ?? (a.status === "confirmed" ? a.assumedValue : undefined);
    if (!val || a.status === "rejected") continue;
    switch (a.field) {
      case "origin":
        updated.origin = val;
        break;
      case "groupSize":
        updated.groupSize = parseInt(val, 10) || updated.groupSize;
        break;
      case "duration":
        updated.duration = parseInt(val, 10) || updated.duration;
        break;
      case "hasCar":
        updated.hasCar = val === "rental" || val === "own";
        break;
      case "budget":
        updated.budget = parseBudgetAssumptionValue(val);
        break;
      case "destination":
        updated.destination = val;
        break;
    }
  }
  return updated;
}
