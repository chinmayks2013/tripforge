import { AgentId, ParsedRequest, TravelStyle } from "../types";
import { getDestinationData } from "../locations";

export type TaskStatus = "pending" | "assigned" | "running" | "complete" | "skipped";

export interface AgentTask {
  id: string;
  agentId: AgentId;
  wave: number;
  priority: number;
  title: string;
  objective: string;
  dependencies: AgentId[];
  context: Record<string, string | number | boolean>;
  status: TaskStatus;
}

/** Sequential pipeline — each agent runs after the previous completes. */
export const AGENT_DEPENDENCIES: Partial<Record<AgentId, AgentId[]>> = {
  lodging: ["flight"],
  transport: ["flight", "lodging"],
  attractions: ["flight", "lodging", "transport"],
  savings: ["flight", "lodging", "transport", "attractions"],
  group: ["flight", "lodging", "transport", "attractions", "savings"],
  routing: ["flight", "lodging", "transport", "attractions", "savings", "group"],
  budget: ["flight", "lodging", "transport", "attractions", "savings", "group", "routing"],
  efficiency: ["flight", "lodging", "transport", "attractions", "savings", "group", "routing", "budget"],
};

const SEQUENTIAL_ORDER: AgentId[] = [
  "flight",
  "lodging",
  "transport",
  "attractions",
  "savings",
  "group",
  "routing",
  "budget",
  "efficiency",
];

function tripContext(request: ParsedRequest) {
  const origin =
    request.origin ??
    request.userLocation?.city ??
    request.scrapedData?.originCity ??
    "nearest airport";
  const dest = request.destination;
  const days = request.duration ?? 5;
  const travelers = request.groupSize;
  const distance = request.scrapedData?.distanceMiles;
  const budget = request.budget;
  const memberships = request.hasMemberships.length
    ? request.hasMemberships.join(", ")
    : "none listed";

  return { origin, dest, days, travelers, distance, budget, memberships };
}

type TaskTemplate = Omit<AgentTask, "id" | "status">;

function taskTemplates(
  request: ParsedRequest,
  style: TravelStyle
): TaskTemplate[] {
  const ctx = tripContext(request);
  const destinationData = getDestinationData(request.destination);
  const avgLocalDaily = Math.max(120, Math.round(destinationData.baseCost / 5));
  const budgetPerDay =
    request.budget != null && ctx.days > 0
      ? request.budget / ctx.days
      : undefined;
  const budgetPressure = budgetPerDay
    ? budgetPerDay < avgLocalDaily * 0.75
      ? "minimal"
      : budgetPerDay < avgLocalDaily
      ? "low"
      : "normal"
    : "normal";
  const attractionIntensity = request.attractionIntensity ?? budgetPressure;
  const shouldIncludeFlight = !["bus", "train", "car"].includes(request.travelMode);
  const shouldIncludeLodging =
    request.durationHours == null || request.durationHours >= 18;
  const styleLabel =
    style === "budget" ? "lowest cost" : style === "luxury" ? "premium" : "best value";

  const templates: TaskTemplate[] = [
    {
      agentId: "flight",
      wave: 1,
      priority: 1,
      title: "Scrape & price flights",
      objective: shouldIncludeFlight
        ? `Live web scrape + fare analysis (no AI): ${ctx.origin} → ${ctx.dest}`
        : `Skip flight search for ${request.travelMode} travel`,
      dependencies: [],
      context: {
        origin: ctx.origin,
        destination: ctx.dest,
        travelers: ctx.travelers,
        style,
        travelMode: request.travelMode,
        skipped: !shouldIncludeFlight,
      },
    },
    {
      agentId: "lodging",
      wave: 2,
      priority: 2,
      title: "Scrape & calculate lodging",
      objective: shouldIncludeLodging
        ? `${ctx.days - 1} nights — web scrape hotel data + AI analysis`
        : `Skip lodging for same-day or short trip`,
      dependencies: AGENT_DEPENDENCIES.lodging ?? [],
      context: {
        destination: ctx.dest,
        nights: Math.max(0, ctx.days - 1),
        travelers: ctx.travelers,
        style,
        skipped: !shouldIncludeLodging,
      },
    },
    {
      agentId: "transport",
      wave: 3,
      priority: 3,
      title: "Scrape & calculate transport",
      objective: request.hasCar
        ? `Scrape transit/parking data + AI for ${ctx.days} days`
        : `Scrape ground transport + AI for ${ctx.dest}`,
      dependencies: AGENT_DEPENDENCIES.transport ?? [],
      context: {
        destination: ctx.dest,
        days: ctx.days,
        hasCar: request.hasCar,
        travelMode: request.travelMode,
        style,
      },
    },
    {
      agentId: "attractions",
      wave: 4,
      priority: 4,
      title: "Scrape & plan activities",
      objective:
        attractionIntensity === "minimal"
          ? `${ctx.days}-day highlights with free/low-cost attractions`
          : attractionIntensity === "low"
          ? `${ctx.days}-day highlights with budget-aware attractions`
          : `${ctx.days}-day activities — scrape POIs + AI recommendations`,
      dependencies: AGENT_DEPENDENCIES.attractions ?? [],
      context: {
        destination: ctx.dest,
        days: ctx.days,
        travelers: ctx.travelers,
        style,
        isPartyTrip: !!request.isPartyTrip,
        attractionIntensity,
        travelMode: request.travelMode,
      },
    },
    {
      agentId: "savings",
      wave: 5,
      priority: 5,
      title: "Scrape & apply deals",
      objective: `Scrape tourism context + AI match promos (${ctx.memberships})`,
      dependencies: AGENT_DEPENDENCIES.savings ?? [],
      context: { destination: ctx.dest, memberships: ctx.memberships, style },
    },
    {
      agentId: "group",
      wave: 6,
      priority: 6,
      title: "Scrape & optimize group",
      objective:
        ctx.travelers >= 4
          ? `Scrape venues + AI group rates for ${ctx.travelers} travelers`
          : `Scrape + AI duo/family bundle options`,
      dependencies: AGENT_DEPENDENCIES.group ?? [],
      context: { destination: ctx.dest, travelers: ctx.travelers, style },
    },
    {
      agentId: "routing",
      wave: 7,
      priority: 7,
      title: "Scrape & sequence routes",
      objective: `Scrape POI clusters + AI route order for ${ctx.days} days`,
      dependencies: AGENT_DEPENDENCIES.routing ?? [],
      context: {
        destination: ctx.dest,
        origin: ctx.origin,
        days: ctx.days,
        style,
        travelMode: request.travelMode,
        ...(ctx.distance != null ? { distanceMiles: ctx.distance } : {}),
      },
    },
    {
      agentId: "budget",
      wave: 8,
      priority: 8,
      title: "Scrape & reconcile budget",
      objective: ctx.budget
        ? `Ingest scraped costs + AI enforce $${ctx.budget} cap`
        : `Scrape prior agent data + AI trade-offs for ${styleLabel} plan`,
      dependencies: AGENT_DEPENDENCIES.budget ?? [],
      context: {
        destination: ctx.dest,
        style,
        ...(ctx.budget != null ? { budgetCap: ctx.budget } : {}),
      },
    },
    {
      agentId: "efficiency",
      wave: 9,
      priority: 9,
      title: "Scrape & verify costs",
      objective: ctx.distance
        ? `Scrape cost floors + AI verify against ${ctx.distance} mi route`
        : `Scrape benchmarks + AI verify destination cost floors`,
      dependencies: AGENT_DEPENDENCIES.efficiency ?? [],
      context: {
        destination: ctx.dest,
        style,
        ...(ctx.distance != null ? { distanceMiles: ctx.distance } : {}),
        ...(ctx.budget != null ? { budgetCap: ctx.budget } : {}),
      },
    },
  ]; 

  const filteredTemplates = templates.filter((task) => {
    if (task.agentId === "flight" && !shouldIncludeFlight) return false;
    if (task.agentId === "lodging" && !shouldIncludeLodging) return false;
    return true;
  });

  return filteredTemplates;
}

export function buildAgentTaskPlan(
  request: ParsedRequest,
  style: TravelStyle,
  filterAgents?: AgentId[]
): AgentTask[] {
  const templates = taskTemplates(request, style);
  const filtered = filterAgents
    ? templates.filter((t) => filterAgents.includes(t.agentId))
    : templates;

  return filtered.map((t) => ({
    ...t,
    id: `${t.agentId}-${style}-${Date.now()}`,
    status: "pending" as TaskStatus,
  }));
}

export function groupTasksByWave(tasks: AgentTask[]): Map<number, AgentTask[]> {
  const waves = new Map<number, AgentTask[]>();
  for (const task of tasks) {
    const list = waves.get(task.wave) ?? [];
    list.push(task);
    waves.set(task.wave, list);
  }
  return new Map(
    Array.from(waves.entries()).sort(([a], [b]) => a - b)
  );
}

export function getWaveAgentIds(wave: AgentTask[]): AgentId[] {
  return wave.map((t) => t.agentId);
}

export { SEQUENTIAL_ORDER };
