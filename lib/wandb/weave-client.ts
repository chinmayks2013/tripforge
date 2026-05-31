import { AgentId, OptimizationResult, ParsedRequest } from "../types";

const PROJECT = process.env.WANDB_PROJECT ?? "chinmayks2013/tripforge";
const DISABLED = process.env.WANDB_TRACE === "false";

type WeaveModule = typeof import("weave");

let weaveModule: WeaveModule | null = null;
let initPromise: Promise<boolean> | null = null;

export function isWeaveConfigured(): boolean {
  return !DISABLED && Boolean(process.env.WANDB_API_KEY);
}

export function weaveProjectUrl(): string {
  const slug = PROJECT.includes("/") ? PROJECT : `chinmayks2013/${PROJECT}`;
  return `https://wandb.ai/${slug}/weave`;
}

async function ensureWeave(): Promise<WeaveModule | null> {
  if (!isWeaveConfigured()) return null;
  if (weaveModule) return weaveModule;

  if (!initPromise) {
    initPromise = (async () => {
      try {
        const weave = await import("weave");
        const apiKey = process.env.WANDB_API_KEY!;
        await Promise.race([
          (async () => {
            await weave.login(apiKey);
            await weave.init(PROJECT);
          })(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("weave init timeout")), 4000)
          ),
        ]);
        weaveModule = weave;
        return true;
      } catch (err) {
        console.warn("[TravelRooks/weave] Init skipped:", err);
        return false;
      }
    })();
  }

  const ok = await initPromise;
  return ok ? weaveModule : null;
}

function summarizeResult(result: OptimizationResult) {
  return {
    destination: result.request.destination,
    origin: result.request.origin,
    groupSize: result.request.groupSize,
    duration: result.request.duration,
    totalSavings: result.totalSavingsAcrossAgents,
    plans: result.plans.map((p) => ({
      style: p.style,
      totalOptimizedCost: p.totalOptimizedCost,
      totalSavings: p.totalSavings,
      verifiedTotal: p.costAudit?.verifiedTotal,
      minRealisticTotal: p.costAudit?.minRealisticTotal,
    })),
    agentCount: result.agentStatuses.length,
    agentsComplete: result.agentStatuses.filter((a) => a.status === "complete")
      .length,
  };
}

/** Fire-and-forget — never blocks the optimization response. */
export function flushOptimizationTrace(
  request: ParsedRequest,
  result: OptimizationResult
): void {
  void (async () => {
    const weave = await ensureWeave();
    if (!weave) return;

    try {
      const traced = weave.op(
        async (input: {
          destination: string;
          origin?: string;
          groupSize: number;
          duration?: number;
          rawQuery: string;
        }) => {
          return summarizeResult(result);
        },
        { name: "travelrooks/coordinator/optimize" }
      );

      await Promise.race([
        traced({
          destination: request.destination,
          origin: request.origin,
          groupSize: request.groupSize,
          duration: request.duration,
          rawQuery: request.rawQuery,
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("weave flush timeout")), 8000)
        ),
      ]);
    } catch (err) {
      console.warn("[TravelRooks/weave] Flush failed:", err);
    }
  })();
}

export async function logCoordinatorOp<T>(
  name: string,
  inputs: Record<string, unknown>,
  fn: () => Promise<T>
): Promise<T> {
  const result = await fn();
  void (async () => {
    const weave = await ensureWeave();
    if (!weave) return;
    try {
      const traced = weave.op(
        async (_in: Record<string, unknown>) => result,
        { name: `travelrooks/coordinator/${name}` }
      );
      await Promise.race([
        traced(inputs),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("weave op timeout")), 5000)
        ),
      ]);
    } catch {
      /* non-fatal */
    }
  })();
  return result;
}

export function logAgentDispatch(
  agentId: AgentId,
  task: { title: string; wave: number; objective: string }
): void {
  void (async () => {
    const weave = await ensureWeave();
    if (!weave) return;
    try {
      const traced = weave.op(
        async (input: Record<string, unknown>) => input,
        { name: "travelrooks/coordinator/dispatch_task" }
      );
      await Promise.race([
        traced({ agentId, ...task, status: "requested" }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("timeout")), 3000)
        ),
      ]);
    } catch {
      /* non-fatal */
    }
  })();
}

export function logWaveComplete(
  wave: number,
  agents: AgentId[],
  savings: number
): void {
  void (async () => {
    const weave = await ensureWeave();
    if (!weave) return;
    try {
      const traced = weave.op(
        async (input: Record<string, unknown>) => input,
        { name: "travelrooks/coordinator/wave_complete" }
      );
      await Promise.race([
        traced({ wave, agents, savings, status: "complete" }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("timeout")), 3000)
        ),
      ]);
    } catch {
      /* non-fatal */
    }
  })();
}

export async function logScrapeTrace<T>(
  destination: string,
  origin: string | undefined,
  fn: () => Promise<T>
): Promise<T> {
  return logCoordinatorOp("scrape", { destination, origin }, fn);
}
