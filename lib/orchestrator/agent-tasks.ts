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
  const styleLabel =
    style === "budget" ? "lowest cost" : style === "luxury" ? "premium" : "best value";

  const templates: TaskTemplate[] = [
    {
      agentId: "flight",
      wave: 1,
      priority: 1,
      title: "Calculate flight costs",
      objective: `Rule-based fare analysis: ${ctx.origin} → ${ctx.dest} for ${ctx.travelers} traveler(s)`,
      dependencies: [],
      context: {
        origin: ctx.origin,
        destination: ctx.dest,
        travelers: ctx.travelers,
        style,
      },
    },
    {
      agentId: "lodging",
      wave: 2,
      priority: 2,
      title: "Calculate lodging",
      objective: `${ctx.days - 1} nights in ${ctx.dest} — rule-based pricing tables`,
      dependencies: AGENT_DEPENDENCIES.lodging ?? [],
      context: { destination: ctx.dest, nights: ctx.days - 1, travelers: ctx.travelers, style },
    },
    {
      agentId: "transport",
      wave: 3,
      priority: 3,
      title: "Calculate transport",
      objective: request.hasCar
        ? `Rental, parking, and transit rules for ${ctx.days} days`
        : `Transit passes and city cards for ${ctx.dest}`,
      dependencies: AGENT_DEPENDENCIES.transport ?? [],
      context: { destination: ctx.dest, days: ctx.days, hasCar: request.hasCar, style },
    },
    {
      agentId: "attractions",
      wave: 4,
      priority: 4,
      title: "Calculate activities",
      objective: `${ctx.days}-day activity costs from destination tables`,
      dependencies: AGENT_DEPENDENCIES.attractions ?? [],
      context: {
        destination: ctx.dest,
        days: ctx.days,
        travelers: ctx.travelers,
        style,
        isPartyTrip: !!request.isPartyTrip,
      },
    },
    {
      agentId: "savings",
      wave: 5,
      priority: 5,
      title: "Apply discount rules",
      objective: `Membership and promo rules (known: ${ctx.memberships})`,
      dependencies: AGENT_DEPENDENCIES.savings ?? [],
      context: { destination: ctx.dest, memberships: ctx.memberships, style },
    },
    {
      agentId: "group",
      wave: 6,
      priority: 6,
      title: "Apply group rules",
      objective:
        ctx.travelers >= 4
          ? `Group rate tables for ${ctx.travelers} travelers`
          : `Solo/duo pricing — no group bulk rates`,
      dependencies: AGENT_DEPENDENCIES.group ?? [],
      context: { destination: ctx.dest, travelers: ctx.travelers, style },
    },
    {
      agentId: "routing",
      wave: 7,
      priority: 7,
      title: "Sequence daily routes",
      objective: `Neighborhood clustering for ${ctx.days} days in ${ctx.dest}`,
      dependencies: AGENT_DEPENDENCIES.routing ?? [],
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
      wave: 8,
      priority: 8,
      title: "Budget reconciliation",
      objective: ctx.budget
        ? `Enforce $${ctx.budget} cap across all categories`
        : `Cross-category meal and trade-off rules for ${styleLabel} plan`,
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
      title: "Verify cost accuracy",
      objective: ctx.distance
        ? `Validate totals against ${ctx.distance} mi scraped route + cost floors`
        : `Apply destination cost floors and savings caps`,
      dependencies: AGENT_DEPENDENCIES.efficiency ?? [],
      context: {
        destination: ctx.dest,
        style,
        ...(ctx.distance != null ? { distanceMiles: ctx.distance } : {}),
        ...(ctx.budget != null ? { budgetCap: ctx.budget } : {}),
      },
    },
  ];

  return templates;
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
