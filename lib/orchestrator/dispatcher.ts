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
  groupTasksByWave,
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
}

/**
 * Assigns contextual tasks to each AI agent and runs them in dependency waves.
 * Wave 1: specialists · Wave 2: budget · Wave 3: cost efficiency verification
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
  const waves = groupTasksByWave(tasks);
  const results = new Map<AgentId, AgentResult>();

  emitEvent({
    type: "task_plan_ready",
    data: {
      style,
      taskCount: tasks.length,
      waveCount: waves.size,
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

  for (const [waveNum, waveTasks] of Array.from(waves.entries())) {
    emitEvent({
      type: "task_wave_start",
      data: {
        wave: waveNum,
        agents: waveTasks.map((t) => t.agentId),
        style,
      },
      timestamp: Date.now(),
    });

    const partialSavings = Array.from(results.values()).reduce(
      (s, r) => s + r.savings,
      0
    );

    await Promise.all(
      waveTasks.map(async (task) => {
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

        const runner = AGENT_RUNNERS[task.agentId];
        const run = () =>
          runner(request, style, progress, {
            partialSavings: task.agentId === "budget" ? partialSavings : undefined,
            priorResults:
              task.agentId === "efficiency" ? new Map(results) : undefined,
          });

        const result = await Promise.race([
          run(),
          new Promise<AgentResult>((_, reject) =>
            setTimeout(
              () => reject(new Error(`${task.agentId} agent timed out`)),
              30_000
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
      })
    );

    const waveSavings = waveTasks.reduce(
      (s, t) => s + (results.get(t.agentId)?.savings ?? 0),
      0
    );
    options?.onWaveComplete?.(
      waveNum,
      waveTasks.map((t) => t.agentId),
      waveSavings
    );

    // Yield so SSE chunks flush before the next wave
    await new Promise((r) => setTimeout(r, 0));
  }

  return { tasks, results };
}
