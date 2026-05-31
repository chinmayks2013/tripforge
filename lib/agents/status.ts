import { AgentId, AgentStatus } from "../types";

/** Client-safe helper — no server deps (scraper, weave, OpenAI). */
export function createInitialAgentStatuses(): AgentStatus[] {
  const ids: AgentId[] = [
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
