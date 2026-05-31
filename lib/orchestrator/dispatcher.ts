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
} from "../agents";
import { AgentEvent, AgentId, ParsedRequest, TravelStyle } from "../types";
import {
  AgentTask,
  buildAgentTaskPlan,
} from "./agent-tasks";

export type TaskEventEmitter = (event: AgentEvent) => void;

type AgentRunnerContext = {
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
  flight: (req, style, cb) => runFlightAgent(req, style, cb),
  lodging: (req, style, cb) => runLodgingAgent(req, style, cb),
  transport: (req, style, cb) => runTransportAgent(req, style, cb),
  attractions: (req, style, cb) => runAttractionsAgent(req, style, cb),
  savings: (req, style, cb) => runSavingsAgent(req, style, cb),
  group: (req, style, cb) => runGroupAgent(req, style, cb),
  routing: (req, style, cb) => runRoutingAgent(req, style, cb),
  budget: (req, style, cb, ctx) =>
    runBudgetAgent(req, style, cb, ctx?.partialSavings ?? 0),
  efficiency: (req, style, cb, ctx) =>
    runEfficiencyAgent(req, style, cb, ctx?.priorResults ?? new Map()),
};

export interface DispatchResult {
  tasks: AgentTask[];
  results: Map<AgentId, AgentResult>;
  request: ParsedRequest;
}

/**
 * Runs agents one at a time in priority order.
 * Live web scraping happens before this pipeline (see TravelOrchestrator).
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
      data: {
        wave: task.wave,
        agents: [task.agentId],
        style,
      },
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
      });

    const result = await Promise.race([
      run(),
      new Promise<AgentResult>((_, reject) =>
        setTimeout(
          () => reject(new Error(`${task.agentId} agent timed out`)),
          15_000
        )
      ),
    ]);

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

    options?.onWaveComplete?.(
      task.wave,
      [task.agentId],
      result.savings
    );

    await new Promise((r) => setTimeout(r, 0));
  }

  return { tasks, results, request: workingRequest };
}
