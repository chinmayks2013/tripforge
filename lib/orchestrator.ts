import {
  AgentEvent,
  AgentId,
  AgentStatus,
  OptimizationResult,
  ParsedRequest,
  TravelPlan,
  TravelStyle,
  STYLE_LABELS,
} from "./types";
import { generateAssumptions } from "./parser";
import { buildTripRoute } from "./itinerary-builder";
import { scrapeTripData } from "./scraper";
import {
  createInitialAgentStatuses,
  ProgressCallback,
} from "./agents";
import { dispatchAgentTasks } from "./orchestrator/dispatcher";
import { buildAgentTaskPlan } from "./orchestrator/agent-tasks";
import { deriveStyledPlan } from "./orchestrator/plan-derivation";

export type EventEmitter = (event: AgentEvent) => void | Promise<void>;

export { dispatchAgentTasks } from "./orchestrator/dispatcher";
export { buildAgentTaskPlan } from "./orchestrator/agent-tasks";
export type { AgentTask } from "./orchestrator/agent-tasks";

const SCRAPE_TIMEOUT_MS = 12_000;

export class TravelOrchestrator {
  private emit: EventEmitter;
  private agentStatuses: AgentStatus[];

  constructor(emit: EventEmitter) {
    this.emit = emit;
    this.agentStatuses = createInitialAgentStatuses();
  }

  private updateAgent(agentId: AgentId, updates: Partial<AgentStatus>) {
    const idx = this.agentStatuses.findIndex((a) => a.id === agentId);
    if (idx >= 0) {
      this.agentStatuses[idx] = {
        ...this.agentStatuses[idx],
        ...updates,
        lastUpdate: Date.now(),
      };
    }
  }

  private makeProgressCallback(): ProgressCallback {
    return (agentId, progress, message, savings) => {
      this.updateAgent(agentId, {
        status: progress >= 100 ? "complete" : "searching",
        progress,
        message,
        savingsFound:
          savings != null
            ? savings
            : this.agentStatuses.find((a) => a.id === agentId)?.savingsFound,
      });
      this.emit({
        type: progress >= 100 ? "agent_complete" : "agent_progress",
        agentId,
        data: { progress, message, savings },
        timestamp: Date.now(),
      });
    };
  }

  async optimize(request: ParsedRequest): Promise<OptimizationResult> {
    this.emit({
      type: "orchestrator_start",
      data: { message: "Scraping live web data, then assigning tasks to 9 AI agents…" },
      timestamp: Date.now(),
    });

    let enriched = { ...request };

    try {
      const scraped = await Promise.race([
        scrapeTripData(
          request.destination,
          request.origin,
          request.userLocation,
          (msg) => {
            this.emit({
              type: "scrape_progress",
              data: { message: msg },
              timestamp: Date.now(),
            });
          }
        ),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Scrape timed out")), SCRAPE_TIMEOUT_MS)
        ),
      ]);
      enriched = {
        ...request,
        origin: request.origin ?? scraped.originCity,
        scrapedData: scraped,
      };
      this.emit({
        type: "scrape_complete",
        data: { scrapedData: scraped },
        timestamp: Date.now(),
      });
    } catch (err) {
      this.emit({
        type: "scrape_complete",
        data: { message: String(err) },
        timestamp: Date.now(),
      });
    }

    this.emit({
      type: "orchestrator_start",
      data: { message: "Dispatching 9 agents in 3 waves…" },
      timestamp: Date.now(),
    });

    const assumptions = generateAssumptions(enriched);
    this.emit({
      type: "assumptions_ready",
      data: { assumptions },
      timestamp: Date.now(),
    });

    // Run all agents ONCE (balanced). Budget/luxury are derived instantly.
    const balancedPlan = await this.runAgentTaskPlan(enriched, "balanced", undefined, true);
    this.emit({
      type: "plan_ready",
      data: { plan: balancedPlan },
      timestamp: Date.now(),
    });

    const budgetPlan = deriveStyledPlan(balancedPlan, "budget");
    this.emit({
      type: "plan_ready",
      data: { plan: budgetPlan },
      timestamp: Date.now(),
    });

    const luxuryPlan = deriveStyledPlan(balancedPlan, "luxury");
    this.emit({
      type: "plan_ready",
      data: { plan: luxuryPlan },
      timestamp: Date.now(),
    });

    const plans = [budgetPlan, balancedPlan, luxuryPlan];
    const route = buildTripRoute(enriched);
    const totalSavings = plans.reduce((sum, p) => sum + p.totalSavings, 0);

    this.emit({
      type: "orchestrator_complete",
      data: {
        message: "All 9 agents complete. 3 optimized plans ready.",
        totalSavings,
      },
      timestamp: Date.now(),
    });

    return {
      request: enriched,
      assumptions,
      plans,
      itinerary: route.days,
      route,
      agentStatuses: [...this.agentStatuses],
      totalSavingsAcrossAgents: totalSavings,
      scrapedData: enriched.scrapedData,
    };
  }

  async rerunAgents(
    request: ParsedRequest,
    agentIds?: AgentId[]
  ): Promise<Partial<OptimizationResult>> {
    this.agentStatuses = createInitialAgentStatuses();

    const balancedPlan = await this.runAgentTaskPlan(
      request,
      "balanced",
      agentIds,
      true
    );
    const plans = [
      deriveStyledPlan(balancedPlan, "budget"),
      balancedPlan,
      deriveStyledPlan(balancedPlan, "luxury"),
    ];

    for (const plan of plans) {
      this.emit({
        type: "plan_ready",
        data: { plan, partial: true },
        timestamp: Date.now(),
      });
    }

    const route = buildTripRoute(request);

    return {
      request,
      plans,
      itinerary: route.days,
      route,
      agentStatuses: [...this.agentStatuses],
      totalSavingsAcrossAgents: plans.reduce((sum, p) => sum + p.totalSavings, 0),
    };
  }

  private async runAgentTaskPlan(
    request: ParsedRequest,
    style: TravelStyle,
    filterAgents?: AgentId[],
    liveUpdates = true
  ): Promise<TravelPlan> {
    const onProgress = liveUpdates ? this.makeProgressCallback() : () => {};

    const taskAssignHandler = (event: AgentEvent) => {
      if (liveUpdates && event.type === "task_assigned" && event.agentId) {
        const { title, objective } = event.data as {
          title?: string;
          objective?: string;
        };
        this.updateAgent(event.agentId, {
          status: "searching",
          progress: 0,
          message: title ?? "Starting…",
          assignedTask: title,
          taskObjective: objective,
        });
      }
      if (liveUpdates) this.emit(event);
    };

    const { results } = await dispatchAgentTasks(
      request,
      style,
      onProgress,
      taskAssignHandler,
      filterAgents,
      { live: liveUpdates }
    );

    const efficiencyResult = results.get("efficiency");
    const agentResults = Array.from(results.values()).filter(
      (r) => r.agentId !== "efficiency"
    );

    const lineItems =
      efficiencyResult?.verifiedLineItems ??
      agentResults.flatMap((r) => r.lineItems);

    const opportunities = [
      ...agentResults.flatMap((r) => r.opportunities),
      ...(efficiencyResult?.opportunities ?? []),
    ];

    const costAudit = efficiencyResult?.costAudit;
    const totalBaseCost = lineItems.reduce((s, i) => s + i.baseCost, 0);
    const totalOptimizedCost =
      costAudit?.verifiedTotal ??
      lineItems.reduce((s, i) => s + i.optimizedCost, 0);
    const totalSavings = totalBaseCost - totalOptimizedCost;
    const savingsPercent =
      totalBaseCost > 0 ? Math.round((totalSavings / totalBaseCost) * 100) : 0;

    const highlights = opportunities
      .filter((o) => o.applied)
      .slice(0, 4)
      .map((o) => o.title);

    return {
      id: `${style}-${Date.now()}`,
      style,
      title: STYLE_LABELS[style],
      totalBaseCost,
      totalOptimizedCost,
      totalSavings,
      savingsPercent,
      lineItems,
      opportunities,
      summary: costAudit?.feasible === false
        ? `${STYLE_LABELS[style]} plan for ${request.destination}: budget may be too low (min ~$${costAudit.minRealisticTotal.toLocaleString()}).`
        : `${STYLE_LABELS[style]} plan for ${request.destination}: ${request.duration} days, ${request.groupSize} travelers. ${opportunities.filter((o) => o.applied).length} hidden savings applied.`,
      highlights,
      costAudit,
    };
  }
}

export function getAffectedAgents(field: string): AgentId[] {
  const map: Record<string, AgentId[]> = {
    origin: ["flight", "routing"],
    dates: ["flight", "lodging", "attractions"],
    groupSize: ["flight", "lodging", "group", "attractions", "savings"],
    duration: ["lodging", "transport", "attractions", "routing", "budget"],
    hasCar: ["transport", "routing"],
    budget: ["budget", "lodging", "flight", "savings", "efficiency"],
    destination: ["flight", "lodging", "attractions", "routing", "transport", "savings", "efficiency"],
  };
  return map[field] ?? ["budget"];
}
