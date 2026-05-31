export type TravelStyle = "budget" | "balanced" | "luxury";

export type AgentId =
  | "flight"
  | "lodging"
  | "transport"
  | "parking"
  | "attractions"
  | "discounts"
  | "memberships"
  | "passes"
  | "group"
  | "routing"
  | "budget";

export interface AgentStatus {
  id: AgentId;
  name: string;
  status: "idle" | "searching" | "optimizing" | "complete" | "error";
  progress: number;
  message: string;
  savingsFound?: number;
  lastUpdate: number;
}

export interface ParsedRequest {
  destination: string;
  origin?: string;
  startDate?: string;
  endDate?: string;
  duration?: number;
  groupSize: number;
  budget?: number;
  interests: string[];
  hasCar: boolean;
  hasMemberships: string[];
  rawQuery: string;
  userLocation?: UserLocation;
  scrapedData?: ScrapedTripData;
}

export interface UserLocation {
  lat: number;
  lng: number;
  city: string;
  region?: string;
  country?: string;
}

export interface ScrapedTripData {
  originCity: string;
  originCoords?: { lat: number; lng: number };
  destinationDisplay: string;
  destinationCoords: { lat: number; lng: number };
  distanceMiles?: number;
  weather?: {
    tempF: number;
    condition: string;
    icon: string;
    humidity: number;
    windMph: number;
  };
  wikipediaSummary?: string;
  sources: { name: string; url: string }[];
  scrapedAt: number;
}

export interface AssumptionOption {
  id: string;
  label: string;
  value: string;
}

export interface Assumption {
  id: string;
  field: string;
  label: string;
  assumedValue: string;
  confidence: "high" | "medium" | "low";
  options: AssumptionOption[];
  status: "pending" | "confirmed" | "rejected" | "modified";
  userValue?: string;
}

export interface CostLineItem {
  category: string;
  description: string;
  baseCost: number;
  optimizedCost: number;
  savings: number;
  savingsSource?: string;
  agentId: AgentId;
}

export interface HiddenOpportunity {
  id: string;
  title: string;
  description: string;
  savings: number;
  category: string;
  agentId: AgentId;
  applied: boolean;
}

export interface TravelPlan {
  id: string;
  style: TravelStyle;
  title: string;
  totalBaseCost: number;
  totalOptimizedCost: number;
  totalSavings: number;
  savingsPercent: number;
  lineItems: CostLineItem[];
  opportunities: HiddenOpportunity[];
  summary: string;
  highlights: string[];
}

export interface ItineraryStop {
  id: string;
  order: number;
  time: string;
  title: string;
  description: string;
  category: "attraction" | "food" | "lodging" | "transit" | "gas" | "rest" | "travel" | "perk";
  cost: number;
  durationMin: number;
  lat: number;
  lng: number;
  /** Distance from previous stop in miles */
  distanceMi?: number;
  /** Travel time from previous stop in minutes */
  travelMin?: number;
  /** Transport mode between stops */
  transportMode?: "walk" | "drive" | "transit" | "rideshare";
  tips?: string;
  /** Membership / pass savings applied at this stop */
  perks?: { title: string; savings: number }[];
  /** Original cost before perks */
  originalCost?: number;
}

export interface DayWeather {
  date: string;
  dayLabel: string;
  highF: number;
  lowF: number;
  condition: string;
  icon: string;
  humidity: number;
  windMph: number;
  precipitation: number;
  uvIndex: number;
  packingTip: string;
}

export interface ItineraryDay {
  day: number;
  date: string;
  weather: DayWeather;
  totalCost: number;
  totalDistanceMi: number;
  stops: ItineraryStop[];
  /** @deprecated use stops */
  activities: {
    time: string;
    title: string;
    cost: number;
    category: string;
  }[];
}

export interface TripRoute {
  destination: string;
  destinationKey: string;
  center: { lat: number; lng: number };
  zoom: number;
  origin?: string;
  totalDays: number;
  totalStops: number;
  totalDistanceMi: number;
  days: ItineraryDay[];
  allStops: ItineraryStop[];
}

export interface OptimizationResult {
  request: ParsedRequest;
  assumptions: Assumption[];
  plans: TravelPlan[];
  itinerary: ItineraryDay[];
  route: TripRoute;
  agentStatuses: AgentStatus[];
  totalSavingsAcrossAgents: number;
  scrapedData?: ScrapedTripData;
}

export interface AgentEvent {
  type:
    | "agent_start"
    | "agent_progress"
    | "agent_complete"
    | "agent_savings"
    | "orchestrator_start"
    | "orchestrator_complete"
    | "plan_ready"
    | "assumptions_ready"
    | "scrape_progress"
    | "scrape_complete"
    | "error";
  agentId?: AgentId;
  data: Record<string, unknown>;
  timestamp: number;
}

export const AGENT_META: Record<
  AgentId,
  { name: string; icon: string; color: string; description: string }
> = {
  flight: {
    name: "Flight Agent",
    icon: "✈️",
    color: "agent-flight",
    description: "Finding cheapest routes, hidden city tickets, and fare alerts",
  },
  lodging: {
    name: "Lodging Agent",
    icon: "🏨",
    color: "agent-lodging",
    description: "Comparing hotels, hostels, and alternative stays",
  },
  transport: {
    name: "Transport Agent",
    icon: "🚌",
    color: "agent-transport",
    description: "Transit bundles, rideshare vs public transit optimization",
  },
  parking: {
    name: "Parking Agent",
    icon: "🅿️",
    color: "agent-parking",
    description: "Garage discounts, street parking rules, park-and-ride",
  },
  attractions: {
    name: "Attractions Agent",
    icon: "🎭",
    color: "agent-attractions",
    description: "Free entry days, combo tickets, off-peak pricing",
  },
  discounts: {
    name: "Discounts Agent",
    icon: "🏷️",
    color: "agent-discounts",
    description: "Coupons, promo codes, seasonal deals, student discounts",
  },
  memberships: {
    name: "Memberships Agent",
    icon: "💳",
    color: "agent-memberships",
    description: "AAA, Costco Travel, credit card perks, loyalty programs",
  },
  passes: {
    name: "Local Passes Agent",
    icon: "🎫",
    color: "agent-passes",
    description: "City passes, museum bundles, transit day passes",
  },
  group: {
    name: "Group Agent",
    icon: "👥",
    color: "agent-group",
    description: "Group rates, split costs, shared accommodations",
  },
  routing: {
    name: "Routing Agent",
    icon: "🗺️",
    color: "agent-routing",
    description: "Optimal day-by-day routing to minimize transit costs",
  },
  budget: {
    name: "Budget Agent",
    icon: "📊",
    color: "agent-budget",
    description: "Cross-category optimization and trade-off analysis",
  },
};

export const STYLE_MULTIPLIERS: Record<TravelStyle, number> = {
  budget: 0.65,
  balanced: 1.0,
  luxury: 1.75,
};

export const STYLE_LABELS: Record<TravelStyle, string> = {
  budget: "Budget Explorer",
  balanced: "Balanced Traveler",
  luxury: "Luxury Experience",
};
