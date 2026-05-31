import {
  runFlightAgent,
  runLodgingAgent,
  runTransportAgent,
  runAttractionsAgent,
  runSavingsAgent,
  runGroupAgent,
  runRoutingAgent,
  runBudgetAgent,
  runEfficiencyAgent,
  AgentResult,
  ProgressCallback,
  AgentRunContext,
} from "../agents";
import { AgentEvent, AgentId, ParsedRequest, TravelStyle } from "../types";
import {
  AgentTask,
  buildAgentTaskPlan,
} from "./agent-tasks";
import { traceAgentRun } from "../wandb/weave-client";

export type TaskEventEmitter = (event: AgentEvent) => void;

type AgentRunnerContext = AgentRunContext & {
  partialSavings?: number;
  priorResults?: Map<AgentId, AgentResult>;
};

type AgentRunner = (
  request: ParsedRequest,
  style: TravelStyle,
  onProgress: ProgressCallback,
  context?: AgentRunnerContext
) => Promise<AgentResult>;

const AGENT_RUNNERS: Record<AgentId, AgentRunner> = {
  flight: (req, style, cb, ctx) => runFlightAgent(req, style, cb, ctx),
  lodging: (req, style, cb, ctx) => runLodgingAgent(req, style, cb, ctx),
  transport: (req, style, cb, ctx) => runTransportAgent(req, style, cb, ctx),
  attractions: (req, style, cb, ctx) => runAttractionsAgent(req, style, cb, ctx),
  savings: (req, style, cb, ctx) => runSavingsAgent(req, style, cb, ctx),
  group: (req, style, cb, ctx) => runGroupAgent(req, style, cb, ctx),
  routing: (req, style, cb, ctx) => runRoutingAgent(req, style, cb, ctx),
  budget: (req, style, cb, ctx) =>
    runBudgetAgent(req, style, cb, ctx?.partialSavings ?? 0, ctx),
  efficiency: (req, style, cb, ctx) =>
    runEfficiencyAgent(req, style, cb, ctx?.priorResults ?? new Map(), ctx),
};

const AGENT_TIMEOUT_MS: Partial<Record<AgentId, number>> = {
  flight: 18_000,
  lodging: 10_000,
  transport: 10_000,
  attractions: 10_000,
  savings: 8_000,
  group: 8_000,
  routing: 10_000,
  budget: 8_000,
  efficiency: 10_000,
};

function agentTimeoutMs(agentId: AgentId): number {
  return AGENT_TIMEOUT_MS[agentId] ?? 10_000;
}

function fallbackAgentResult(agentId: AgentId, message: string): AgentResult {
  return {
    agentId,
    lineItems: [],
    opportunities: [],
    savings: 0,
    message,
  };
}

function summarizeAgentResult(result: AgentResult) {
  return {
    agentId: result.agentId,
    savings: result.savings,
    lineItemCount: result.lineItems.length,
    opportunityCount: result.opportunities.length,
    usedLiveAi: Boolean(result.aiInsight),
    message: result.message,
  };
}

export interface DispatchResult {
  tasks: AgentTask[];
  results: Map<AgentId, AgentResult>;
  request: ParsedRequest;
}

/**
 * Runs agents sequentially. Each agent scrapes live web data;
 * all except flight also run AI analysis on the scraped context.
 */
export async function dispatchAgentTasks(
  request: ParsedRequest,
  style: TravelStyle,
  onProgress: ProgressCallback,
  emit: TaskEventEmitter,
  filterAgents?: AgentId[],
  options?: { live?: boolean; onWaveComplete?: (wave: number, agents: AgentId[], savings: number) => void }
): Promise<DispatchResult> {
  const live = options?.live !== false;
  const noopProgress: ProgressCallback = () => {};
  const progress = live ? onProgress : noopProgress;
  const emitEvent: TaskEventEmitter = live
    ? emit
    : (event) => {
        if (event.type === "task_complete" || event.type === "agent_complete") return;
      };

  const tasks = buildAgentTaskPlan(request, style, filterAgents);
  const orderedTasks = [...tasks].sort((a, b) => a.priority - b.priority);
  const results = new Map<AgentId, AgentResult>();
  let workingRequest = request;

  emitEvent({
    type: "task_plan_ready",
    data: {
      style,
      taskCount: tasks.length,
      waveCount: orderedTasks.length,
      tasks: tasks.map(({ id, agentId, wave, title, objective, dependencies }) => ({
        id,
        agentId,
        wave,
        title,
        objective,
        dependencies,
      })),
    },
    timestamp: Date.now(),
  });

  for (const task of orderedTasks) {
    emitEvent({
      type: "task_wave_start",
      data: { wave: task.wave, agents: [task.agentId], style },
      timestamp: Date.now(),
    });

    task.status = "assigned";
    emitEvent({
      type: "task_assigned",
      agentId: task.agentId,
      data: {
        taskId: task.id,
        title: task.title,
        objective: task.objective,
        wave: task.wave,
        dependencies: task.dependencies,
        context: task.context,
        style,
      },
      timestamp: Date.now(),
    });

    emitEvent({
      type: "agent_start",
      agentId: task.agentId,
      data: { style, task: task.title, objective: task.objective },
      timestamp: Date.now(),
    });

    task.status = "running";

    const partialSavings = Array.from(results.values()).reduce(
      (s, r) => s + r.savings,
      0
    );

    const runner = AGENT_RUNNERS[task.agentId];
    const run = () =>
      runner(workingRequest, style, progress, {
        partialSavings: task.agentId === "budget" ? partialSavings : undefined,
        priorResults:
          task.agentId === "efficiency" ? new Map(results) : undefined,
        onScrapeProgress: (agentId, message) => {
          emitEvent({
            type: "scrape_progress",
            agentId,
            data: { message, agentId },
            timestamp: Date.now(),
          });
        },
      });

    const timeoutMs = agentTimeoutMs(task.agentId);
    let result: AgentResult;

    try {
      result = await traceAgentRun(
        task.agentId,
        {
          title: task.title,
          wave: task.wave,
          style,
          objective: task.objective,
        },
        () =>
          Promise.race([
            run(),
            new Promise<AgentResult>((_, reject) =>
              setTimeout(
                () => reject(new Error(`${task.agentId} agent timed out after ${timeoutMs}ms`)),
                timeoutMs
              )
            ),
          ]),
        summarizeAgentResult
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : `${task.agentId} agent failed`;
      result = fallbackAgentResult(task.agentId, message);
      emitEvent({
        type: "agent_progress",
        agentId: task.agentId,
        data: { progress: 100, message, error: true },
        timestamp: Date.now(),
      });
    }

    if (result.scrapedData) {
      workingRequest = {
        ...workingRequest,
        scrapedData: result.scrapedData,
        origin: workingRequest.origin ?? result.scrapedData.originCity,
      };
    }

    if (live) {
      progress(task.agentId, 100, result.message, result.savings);
    }

    results.set(task.agentId, result);
    task.status = "complete";

    emitEvent({
      type: "task_complete",
      agentId: task.agentId,
      data: {
        taskId: task.id,
        title: task.title,
        savings: result.savings,
        message: result.message,
        style,
        ...(result.costAudit ? { costAudit: result.costAudit } : {}),
      },
      timestamp: Date.now(),
    });

    options?.onWaveComplete?.(task.wave, [task.agentId], result.savings);
    await new Promise((r) => setTimeout(r, 0));
  }

  return { tasks, results, request: workingRequest };
}
