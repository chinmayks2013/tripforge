import { AgentId, ParsedRequest, TravelStyle } from "../types";
import { AgentResult } from "../agents";

/** Weave tracing is opt-in — it can hang agent runs if the W&B API is slow. */
const WEAVE_ENABLED = process.env.WANDB_TRACE === "true";

type TracePayload = Record<string, unknown>;

async function runTraced<T>(
  opName: string,
  inputs: TracePayload,
  fn: () => Promise<T>
): Promise<T> {
  if (!WEAVE_ENABLED) return fn();

  try {
    const { login, init, op } = await import("weave");
    const apiKey = process.env.WANDB_API_KEY;
    if (!apiKey) return fn();

    await Promise.race([
      (async () => {
        await login(apiKey);
        await init(process.env.WANDB_PROJECT ?? "chinmayks2013/tripforge");
      })(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("weave init timeout")), 2000)
      ),
    ]);

    const traced = op(async (_inputs: TracePayload) => fn(), { name: opName });
    return Promise.race([
      traced(inputs) as Promise<T>,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error("weave trace timeout")), 5000)
      ),
    ]);
  } catch (err) {
    console.warn(`[wandb] Skipping trace for ${opName}:`, err);
    return fn();
  }
}

export async function traceScrape<T>(
  destination: string,
  origin: string | undefined,
  fn: () => Promise<T>
): Promise<T> {
  return runTraced("tripforge/scrape", { destination, origin }, fn);
}

export async function traceOptimization<T>(
  request: ParsedRequest,
  fn: () => Promise<T>
): Promise<T> {
  return runTraced(
    "tripforge/optimize",
    {
      destination: request.destination,
      origin: request.origin,
      groupSize: request.groupSize,
    },
    fn
  );
}

/** Never wrap agents in Weave — parallel traced ops deadlock and hang the UI. */
export async function traceAgentRun(
  _agentId: AgentId,
  _request: ParsedRequest,
  _style: TravelStyle,
  _taskTitle: string | undefined,
  fn: () => Promise<AgentResult>
): Promise<AgentResult> {
  return fn();
}
