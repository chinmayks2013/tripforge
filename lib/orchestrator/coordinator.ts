/**
 * Unified coordinator — replaces the standalone Python coordinator_agent.py.
 * Owns agent registry, task dispatch waves, and W&B Weave logging.
 */
import {
  AgentId,
  AgentEvent,
  OptimizationResult,
  ParsedRequest,
  ScrapedTripData,
  TravelStyle,
} from "../types";
import { buildAgentTaskPlan } from "./agent-tasks";
import { dispatchAgentTasks } from "./dispatcher";
import { ProgressCallback } from "../agents";
import {
  flushOptimizationTrace,
  logAgentDispatch,
  logScrapeTrace,
  logWaveComplete,
} from "../wandb/weave-client";

/** Same 9 agents as the web UI; Python `cost_efficient` maps to `efficiency`. */
export const COORDINATOR_AGENTS: AgentId[] = [
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

export type CoordinatorEventEmitter = (event: AgentEvent) => void | Promise<void>;

export class TravelCoordinator {
  private emit: CoordinatorEventEmitter;

  constructor(emit: CoordinatorEventEmitter) {
    this.emit = emit;
  }

  /** Publish the master task plan (formerly coordinator_agent.py loop). */
  publishTaskPlan(request: ParsedRequest, style: TravelStyle = "balanced") {
    const tasks = buildAgentTaskPlan(request, style);
    for (const task of tasks) {
      logAgentDispatch(task.agentId, {
        title: task.title,
        wave: task.wave,
        objective: task.objective,
      });
    }
    return tasks;
  }

  async scrapeAndEnrich(
    request: ParsedRequest,
    scrapeFn: (
      destination: string,
      origin: string | undefined,
      userLocation: ParsedRequest["userLocation"],
      onProgress: (msg: string) => void
    ) => Promise<ScrapedTripData>,
    timeoutMs: number
  ): Promise<ParsedRequest> {
    try {
      return await logScrapeTrace(request.destination, request.origin, async () => {
        const scraped = await Promise.race([
          scrapeFn(
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
            setTimeout(() => reject(new Error("Scrape timed out")), timeoutMs)
          ),
        ]);
        return {
          ...request,
          origin: request.origin ?? scraped.originCity,
          scrapedData: scraped,
        };
      });
    } catch {
      return request;
    }
  }

  dispatchAgents(
    request: ParsedRequest,
    style: TravelStyle,
    onProgress: ProgressCallback,
    taskHandler: (event: AgentEvent) => void,
    filterAgents?: AgentId[],
    live = true
  ) {
    this.publishTaskPlan(request, style);

    return dispatchAgentTasks(
      request,
      style,
      onProgress,
      taskHandler,
      filterAgents,
      {
        live,
        onWaveComplete: (wave, agents, savings) => {
          logWaveComplete(wave, agents, savings);
        },
      }
    );
  }

  logRunComplete(request: ParsedRequest, result: OptimizationResult) {
    flushOptimizationTrace(request, result);
  }
}
