export type TravelStyle = "budget" | "balanced" | "luxury";

export type AgentId =
  | "flight"
  | "lodging"
  | "transport"
  | "attractions"
  | "savings"
  | "group"
  | "routing"
  | "budget"
  | "efficiency";

export interface AgentStatus {
  id: AgentId;
  name: string;
  status: "idle" | "searching" | "optimizing" | "complete" | "error";
  progress: number;
  message: string;
  savingsFound?: number;
  lastUpdate: number;
  /** Current task assigned by the orchestrator */
  assignedTask?: string;
  taskObjective?: string;
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
  /** Event / celebration trip (bachelor party, birthday, etc.) */
  isPartyTrip?: boolean;
  partyType?: string;
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
  /** Official or third-party page where the user can verify this deal */
  verifyUrl?: string;
  verifyLabel?: string;
}

export interface CostAuditReport {
  feasible: boolean;
  minRealisticTotal: number;
  verifiedTotal: number;
  originalTotal: number;
  correctionsApplied: number;
  confidence: "high" | "medium" | "low";
  budgetGap?: number;
  creditsApplied?: number;
  message: string;
  categoryFloors: { category: string; floor: number; source: string }[];
  flags: string[];
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
  costAudit?: CostAuditReport;
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
  perks?: { title: string; savings: number; verifyUrl?: string; verifyLabel?: string }[];
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
    | "task_plan_ready"
    | "task_wave_start"
    | "task_assigned"
    | "task_complete"
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
    description: "Live web scraping and fare analysis (no AI)",
  },
  lodging: {
    name: "Lodging Agent",
    icon: "🏨",
    color: "agent-lodging",
    description: "Web scrape hotel data + AI lodging analysis",
  },
  transport: {
    name: "Transport Agent",
    icon: "🚌",
    color: "agent-transport",
    description: "Web scrape transit network + AI transport planning",
  },
  attractions: {
    name: "Attractions Agent",
    icon: "🎭",
    color: "agent-attractions",
    description: "Web scrape POIs + AI activity recommendations",
  },
  savings: {
    name: "Savings Agent",
    icon: "💰",
    color: "agent-savings",
    description: "Web scrape deal context + AI promo matching",
  },
  group: {
    name: "Group Agent",
    icon: "👥",
    color: "agent-group",
    description: "Web scrape venues + AI group rate optimization",
  },
  routing: {
    name: "Routing Agent",
    icon: "🗺️",
    color: "agent-routing",
    description: "Web scrape POI clusters + AI route sequencing",
  },
  budget: {
    name: "Budget Agent",
    icon: "📊",
    color: "agent-budget",
    description: "Ingest scraped costs + AI budget reconciliation",
  },
  efficiency: {
    name: "Cost Efficiency Agent",
    icon: "🎯",
    color: "agent-efficiency",
    description: "Web scrape cost floors + AI verification",
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
