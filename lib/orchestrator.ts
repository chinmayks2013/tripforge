import {
  AgentEvent,
  AgentId,
  AgentStatus,
  ItineraryDay,
  OptimizationResult,
  ParsedRequest,
  TravelPlan,
  TravelStyle,
  STYLE_LABELS,
} from "./types";
import { generateAssumptions, getDestinationData } from "./parser";
import { buildTripRoute } from "./itinerary-builder";
import { scrapeTripData } from "./scraper";
import {
  runFlightAgent,
  runLodgingAgent,
  runTransportAgent,
  runParkingAgent,
  runAttractionsAgent,
  runDiscountsAgent,
  runMembershipsAgent,
  runPassesAgent,
  runGroupAgent,
  runRoutingAgent,
  runBudgetAgent,
  createInitialAgentStatuses,
  AgentResult,
  ProgressCallback,
} from "./agents";

export type EventEmitter = (event: AgentEvent) => void;

export class TravelOrchestrator {
  private emit: EventEmitter;
  private agentStatuses: AgentStatus[];

  constructor(emit: EventEmitter) {
    this.emit = emit;
    this.agentStatuses = createInitialAgentStatuses();
  }

  private updateAgent(
    agentId: AgentId,
    updates: Partial<AgentStatus>
  ) {
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
        savingsFound: savings,
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
      data: { message: "Scraping live web data, then dispatching 11 agents…" },
      timestamp: Date.now(),
    });

    let enriched = { ...request };

    try {
      const scraped = await scrapeTripData(
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
      );
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
        type: "scrape_progress",
        data: { message: `Scrape partial — using defaults: ${err}` },
        timestamp: Date.now(),
      });
    }

    this.emit({
      type: "orchestrator_start",
      data: { message: "Orchestrator dispatching 11 agents in parallel…" },
      timestamp: Date.now(),
    });

    const assumptions = generateAssumptions(enriched);
    this.emit({
      type: "assumptions_ready",
      data: { assumptions },
      timestamp: Date.now(),
    });

    const styles: TravelStyle[] = ["budget", "balanced", "luxury"];
    const plans: TravelPlan[] = [];

    for (const style of styles) {
      const plan = await this.runParallelAgents(enriched, style);
      plans.push(plan);
      this.emit({
        type: "plan_ready",
        data: { plan },
        timestamp: Date.now(),
      });
    }

    const route = buildTripRoute(enriched);
    const itinerary = route.days;
    const totalSavings = plans.reduce((sum, p) => sum + p.totalSavings, 0);

    this.emit({
      type: "orchestrator_complete",
      data: {
        message: "All agents complete. 3 optimized plans ready.",
        totalSavings,
      },
      timestamp: Date.now(),
    });

    return {
      request: enriched,
      assumptions,
      plans,
      itinerary,
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
    const styles: TravelStyle[] = ["budget", "balanced", "luxury"];
    const plans: TravelPlan[] = [];

    for (const style of styles) {
      const plan = await this.runParallelAgents(request, style, agentIds);
      plans.push(plan);
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

  private async runParallelAgents(
    request: ParsedRequest,
    style: TravelStyle,
    filterAgents?: AgentId[]
  ): Promise<TravelPlan> {
    const onProgress = this.makeProgressCallback();

    for (const status of this.agentStatuses) {
      if (!filterAgents || filterAgents.includes(status.id)) {
        this.updateAgent(status.id, { status: "searching", progress: 0, message: "Starting..." });
        this.emit({
          type: "agent_start",
          agentId: status.id,
          data: { style },
          timestamp: Date.now(),
        });
      }
    }

    const runAgent = async <T>(id: AgentId, fn: () => Promise<T>): Promise<T | null> => {
      if (filterAgents && !filterAgents.includes(id)) return null;
      return fn();
    };

    const [
      flight, lodging, transport, parking, attractions,
      discounts, memberships, passes, group, routing,
    ] = await Promise.all([
      runAgent("flight", () => runFlightAgent(request, style, onProgress)),
      runAgent("lodging", () => runLodgingAgent(request, style, onProgress)),
      runAgent("transport", () => runTransportAgent(request, style, onProgress)),
      runAgent("parking", () => runParkingAgent(request, style, onProgress)),
      runAgent("attractions", () => runAttractionsAgent(request, style, onProgress)),
      runAgent("discounts", () => runDiscountsAgent(request, style, onProgress)),
      runAgent("memberships", () => runMembershipsAgent(request, style, onProgress)),
      runAgent("passes", () => runPassesAgent(request, style, onProgress)),
      runAgent("group", () => runGroupAgent(request, style, onProgress)),
      runAgent("routing", () => runRoutingAgent(request, style, onProgress)),
    ]);

    const partialSavings = [flight, lodging, transport, parking, attractions,
      discounts, memberships, passes, group, routing]
      .filter(Boolean)
      .reduce((sum, r) => sum + (r as AgentResult).savings, 0);

    const budget = await runAgent("budget", () =>
      runBudgetAgent(request, style, onProgress, partialSavings)
    );

    const results = [flight, lodging, transport, parking, attractions,
      discounts, memberships, passes, group, routing, budget].filter(Boolean) as AgentResult[];

    const lineItems = results.flatMap((r) => r.lineItems);
    const opportunities = results.flatMap((r) => r.opportunities);
    const totalBaseCost = lineItems.reduce((s, i) => s + i.baseCost, 0);
    const totalOptimizedCost = lineItems.reduce((s, i) => s + i.optimizedCost, 0);
    const totalSavings = totalBaseCost - totalOptimizedCost;
    const savingsPercent = totalBaseCost > 0 ? Math.round((totalSavings / totalBaseCost) * 100) : 0;

    const dest = getDestinationData(request.destination);
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
      summary: `${STYLE_LABELS[style]} plan for ${request.destination}: ${request.duration} days, ${request.groupSize} travelers. ${opportunities.filter((o) => o.applied).length} hidden savings applied.`,
      highlights,
    };
  }
}

export function getAffectedAgents(field: string): AgentId[] {
  const map: Record<string, AgentId[]> = {
    origin: ["flight", "routing"],
    dates: ["flight", "lodging", "attractions"],
    groupSize: ["flight", "lodging", "group", "attractions", "passes"],
    duration: ["lodging", "transport", "attractions", "passes", "routing", "budget"],
    hasCar: ["transport", "parking", "routing"],
    budget: ["budget", "lodging", "flight"],
    destination: ["flight", "lodging", "attractions", "passes", "routing", "transport"],
  };
  return map[field] ?? ["budget"];
}
