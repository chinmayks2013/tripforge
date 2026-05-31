import { AgentId, OptimizationResult, ParsedRequest } from "../types";

const DISABLED = process.env.WANDB_TRACE === "false";

export function projectRef(): string {
  const raw = process.env.WANDB_PROJECT ?? "tripforge";
  if (raw.includes("/")) return raw;
  const entity = process.env.WANDB_ENTITY ?? "chinmayks2013";
  return `${entity}/${raw}`;
}

type WeaveModule = typeof import("weave");

let weaveModule: WeaveModule | null = null;
let initPromise: Promise<boolean> | null = null;

export function isWeaveConfigured(): boolean {
  return !DISABLED && Boolean(process.env.WANDB_API_KEY);
}

export function weaveProjectUrl(): string {
  return `https://wandb.ai/${projectRef()}/weave`;
}

export function wandbProjectUrl(): string {
  return `https://wandb.ai/${projectRef()}`;
}

async function ensureWeave(): Promise<WeaveModule | null> {
  if (!isWeaveConfigured()) return null;
  if (weaveModule) return weaveModule;

  if (!initPromise) {
    initPromise = (async () => {
      try {
        const weave = await import("weave");
        const apiKey = process.env.WANDB_API_KEY!;
        osSetApiKey(apiKey);
        await weave.login(apiKey);
        await weave.init(projectRef());
        weaveModule = weave;
        return true;
      } catch (err) {
        console.warn("[TravelRooks/weave] Init failed:", err);
        initPromise = null;
        return false;
      }
    })();
  }

  const ok = await initPromise;
  return ok ? weaveModule : null;
}

/** Mirrors Python: os.environ['WANDB_API_KEY'] = key */
function osSetApiKey(key: string) {
  process.env.WANDB_API_KEY = key;
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

/** Await this before closing the API stream so traces reach W&B. */
export async function flushOptimizationTrace(
  request: ParsedRequest,
  result: OptimizationResult
): Promise<void> {
  if (!isWeaveConfigured()) return;

  try {
    const weave = await ensureWeave();
    if (!weave) return;

    const traced = weave.op(
      async () => ({
        inputs: {
          destination: request.destination,
          origin: request.origin,
          groupSize: request.groupSize,
          duration: request.duration,
          rawQuery: request.rawQuery,
        },
        output: summarizeResult(result),
      }),
      { name: "travelrooks/coordinator/optimize" }
    );

    await traced();
    console.log("[TravelRooks/weave] Trace logged:", weaveProjectUrl());
  } catch (err) {
    console.warn("[TravelRooks/weave] Flush failed:", err);
  }
}

export async function logCoordinatorOp<T>(
  name: string,
  inputs: Record<string, unknown>,
  fn: () => Promise<T>
): Promise<T> {
  const result = await fn();
  if (!isWeaveConfigured()) return result;

  try {
    const weave = await ensureWeave();
    if (!weave) return result;
    const traced = weave.op(
      async () => ({ inputs, output: result }),
      { name: `travelrooks/coordinator/${name}` }
    );
    await traced();
  } catch {
    /* non-fatal */
  }
  return result;
}

export function logAgentDispatch(
  agentId: AgentId,
  task: { title: string; wave: number; objective: string }
): void {
  void logCoordinatorOp("dispatch_task", { agentId, ...task, status: "requested" }, async () => true);
}

export function logWaveComplete(
  wave: number,
  agents: AgentId[],
  savings: number
): void {
  void logCoordinatorOp("wave_complete", { wave, agents, savings, status: "complete" }, async () => true);
}

export async function logScrapeTrace<T>(
  destination: string,
  origin: string | undefined,
  fn: () => Promise<T>
): Promise<T> {
  return logCoordinatorOp("scrape", { destination, origin }, fn);
}
