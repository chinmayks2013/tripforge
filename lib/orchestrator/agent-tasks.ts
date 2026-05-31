import { AgentId, ParsedRequest, TravelStyle } from "../types";

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

/** Budget agent waits for wave-1 specialists; efficiency verifies everything after budget. */
export const AGENT_DEPENDENCIES: Partial<Record<AgentId, AgentId[]>> = {
  budget: ["flight", "lodging", "transport", "attractions", "savings", "group", "routing"],
  efficiency: ["flight", "lodging", "transport", "attractions", "savings", "group", "routing", "budget"],
};

const WAVE_1: AgentId[] = [
  "flight",
  "lodging",
  "transport",
  "attractions",
  "savings",
  "group",
  "routing",
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
  const styleLabel =
    style === "budget" ? "lowest cost" : style === "luxury" ? "premium" : "best value";

  return [
    {
      agentId: "flight",
      wave: 1,
      priority: 1,
      title: "Optimize airfare",
      objective: `Find ${styleLabel} flights from ${ctx.origin} to ${ctx.dest} for ${ctx.travelers} traveler(s)${
        ctx.distance ? ` (~${ctx.distance} mi)` : ""
      }`,
      dependencies: [],
      context: {
        origin: ctx.origin,
        destination: ctx.dest,
        travelers: ctx.travelers,
        style,
        ...(ctx.distance != null ? { distanceMiles: ctx.distance } : {}),
      },
    },
    {
      agentId: "lodging",
      wave: 1,
      priority: 2,
      title: "Compare stays",
      objective: `Search ${ctx.days - 1} nights in ${ctx.dest} — hotels, hostels, and availability for ${ctx.travelers} guest(s)`,
      dependencies: [],
      context: { destination: ctx.dest, nights: ctx.days - 1, travelers: ctx.travelers, style },
    },
    {
      agentId: "transport",
      wave: 1,
      priority: 3,
      title: "Ground transport + city passes",
      objective: request.hasCar
        ? `Rental, parking, park-and-ride, and transit passes for ${ctx.days} days in ${ctx.dest}`
        : `Transit passes, city cards, and rideshare mix for ${ctx.dest} (${ctx.days} days)`,
      dependencies: [],
      context: { destination: ctx.dest, days: ctx.days, hasCar: request.hasCar, style },
    },
    {
      agentId: "attractions",
      wave: 1,
      priority: 4,
      title: request.isPartyTrip ? "Plan activities & events" : "Curate activities",
      objective: request.isPartyTrip
        ? `Plan ${request.partyType ?? "celebration"} — venues, nightlife, city pass entry in ${ctx.dest}`
        : `Build ${ctx.days}-day activity list — attractions, events, nightlife${
            request.interests.length ? ` (${request.interests.join(", ")})` : ""
          }`,
      dependencies: [],
      context: {
        destination: ctx.dest,
        days: ctx.days,
        travelers: ctx.travelers,
        style,
        isPartyTrip: !!request.isPartyTrip,
        ...(request.partyType ? { partyType: request.partyType } : {}),
      },
    },
    {
      agentId: "savings",
      wave: 1,
      priority: 5,
      title: "Apply pricing credentials",
      objective: `Stack promo codes, seasonal deals, and membership perks (known: ${ctx.memberships})`,
      dependencies: [],
      context: { destination: ctx.dest, memberships: ctx.memberships, style },
    },
    {
      agentId: "group",
      wave: 1,
      priority: 6,
      title: "Optimize group logistics",
      objective:
        ctx.travelers >= 4
          ? `Group rates, cost splitting, and role assignment for ${ctx.travelers} travelers`
          : `Duo/family bundles and split-cost options for ${ctx.travelers} traveler(s)`,
      dependencies: [],
      context: { destination: ctx.dest, travelers: ctx.travelers, style },
    },
    {
      agentId: "routing",
      wave: 1,
      priority: 7,
      title: "Optimize daily routes",
      objective: `Day-order map sequencing in ${ctx.dest} — minimize backtracking${
        ctx.distance ? ` (origin ${ctx.distance} mi away)` : ""
      }`,
      dependencies: [],
      context: {
        destination: ctx.dest,
        origin: ctx.origin,
        days: ctx.days,
        style,
        ...(ctx.distance != null ? { distanceMiles: ctx.distance } : {}),
      },
    },
    {
      agentId: "budget",
      wave: 2,
      priority: 8,
      title: "Cross-cutting budget sync",
      objective: ctx.budget
        ? `Enforce $${ctx.budget} cap with trade-offs across all agents`
        : `Maximize savings across all categories for ${styleLabel} plan`,
      dependencies: AGENT_DEPENDENCIES.budget ?? [],
      context: {
        destination: ctx.dest,
        style,
        ...(ctx.budget != null ? { budgetCap: ctx.budget } : {}),
      },
    },
    {
      agentId: "efficiency",
      wave: 3,
      priority: 9,
      title: "Verify cost accuracy",
      objective: ctx.distance
        ? `Recalibrate all estimates using ${ctx.distance} mi scraped route + destination cost floors`
        : `Apply realistic cost floors and cap inflated savings for ${ctx.dest}`,
      dependencies: AGENT_DEPENDENCIES.efficiency ?? [],
      context: {
        destination: ctx.dest,
        style,
        ...(ctx.distance != null ? { distanceMiles: ctx.distance } : {}),
        ...(ctx.budget != null ? { budgetCap: ctx.budget } : {}),
      },
    },
  ];
}

/** Build the full task plan for a trip optimization run. */
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

/** Group tasks into execution waves (parallel within each wave). */
export function groupTasksByWave(tasks: AgentTask[]): Map<number, AgentTask[]> {
  const waves = new Map<number, AgentTask[]>();
  for (const task of tasks) {
    const list = waves.get(task.wave) ?? [];
    list.push(task);
    waves.set(task.wave, list);
  }
  for (const list of Array.from(waves.values())) {
    list.sort((a, b) => a.priority - b.priority);
  }
  return new Map(
    Array.from(waves.entries()).sort(([a], [b]) => a - b)
  );
}

export function getWaveAgentIds(wave: AgentTask[]): AgentId[] {
  return wave.map((t) => t.agentId);
}

export { WAVE_1 };
