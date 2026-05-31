import "server-only";

import { AgentId, OptimizationResult, ParsedRequest } from "../types";

const DISABLED = process.env.WANDB_TRACE === "false";

export function projectRef(): string {
  const raw = process.env.WANDB_PROJECT ?? "TravelRook";
  if (raw.includes("/")) return raw;
  const entity = process.env.WANDB_ENTITY ?? "chinmayks2013-student";
  return `${entity}/${raw}`;
}

type WeaveModule = typeof import("weave");
type WeaveClient = Awaited<ReturnType<WeaveModule["init"]>>;

let weaveModule: WeaveModule | null = null;
let weaveClient: WeaveClient | null = null;
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
        process.env.WANDB_API_KEY = apiKey;
        await weave.login(apiKey);
        weaveClient = await weave.init(projectRef());
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

async function waitForWeaveFlush(): Promise<void> {
  try {
    if (weaveClient?.waitForBatchProcessing) {
      await weaveClient.waitForBatchProcessing();
    }
  } catch {
    /* non-fatal */
  }
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

/**
 * Runs `fn` inside a Weave op so duration, inputs, and outputs are traced correctly.
 */
export async function logCoordinatorOp<T>(
  name: string,
  inputs: Record<string, unknown>,
  fn: () => Promise<T>,
  summarizeOutput?: (result: T) => unknown
): Promise<T> {
  if (!isWeaveConfigured()) return fn();

  try {
    const weave = await ensureWeave();
    if (!weave) return fn();

    let captured: T;
    const traced = weave.op(
      async (meta: Record<string, unknown>) => {
        captured = await fn();
        const output = summarizeOutput ? summarizeOutput(captured) : captured;
        return { meta, output };
      },
      { name: `travelrooks/coordinator/${name}` }
    );

    await traced(inputs);
    return captured!;
  } catch (err) {
    console.warn(`[TravelRooks/weave] Op ${name} failed:`, err);
    return fn();
  }
}

/** Trace a single agent run (scrape + optional AI) as a child op. */
export async function traceAgentRun<T>(
  agentId: AgentId,
  inputs: Record<string, unknown>,
  fn: () => Promise<T>,
  summarizeOutput?: (result: T) => unknown
): Promise<T> {
  return logCoordinatorOp(
    `agent/${agentId}`,
    { agentId, ...inputs },
    fn,
    summarizeOutput
  );
}

export interface LLMUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

/** Trace an OpenAI chat completion and surface token usage in Weave. */
export async function traceLLMCompletion<T extends { usage?: LLMUsage | null }>(
  agentId: AgentId,
  model: string,
  fn: () => Promise<T>
): Promise<T> {
  return logCoordinatorOp(
    `llm/${agentId}`,
    { agentId, model, provider: "openai" },
    fn,
    (result) => ({
      model,
      usage: result.usage ?? {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
      },
    })
  );
}

export async function logWaveComplete(
  wave: number,
  agents: AgentId[],
  savings: number
): Promise<void> {
  await logCoordinatorOp("wave_complete", { wave, agents, savings }, async () => ({
    wave,
    agents,
    savings,
    status: "complete",
  }));
}

export async function logScrapeTrace<T>(
  destination: string,
  origin: string | undefined,
  fn: () => Promise<T>
): Promise<T> {
  return logCoordinatorOp("scrape", { destination, origin }, fn);
}

/** Await before closing the API stream so traces reach W&B. */
export async function flushOptimizationTrace(
  request: ParsedRequest,
  result: OptimizationResult
): Promise<void> {
  if (!isWeaveConfigured()) return;

  try {
    const weave = await ensureWeave();
    if (!weave) return;

    const traced = weave.op(
      async (inputs: Record<string, unknown>) => ({
        inputs,
        output: summarizeResult(result),
      }),
      { name: "travelrooks/coordinator/optimize_summary" }
    );

    await traced({
      destination: request.destination,
      origin: request.origin,
      groupSize: request.groupSize,
      duration: request.duration,
      rawQuery: request.rawQuery,
    });

    await waitForWeaveFlush();
    console.log("[TravelRooks/weave] Trace flushed:", weaveProjectUrl());
  } catch (err) {
    console.warn("[TravelRooks/weave] Flush failed:", err);
  }
}
