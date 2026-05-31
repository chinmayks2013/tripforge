/** @deprecated Use lib/wandb/weave-client.ts */
export {
  isWeaveConfigured,
  weaveProjectUrl,
  flushOptimizationTrace,
  logScrapeTrace,
  logCoordinatorOp,
} from "./weave-client";

export async function traceScrape<T>(
  destination: string,
  origin: string | undefined,
  fn: () => Promise<T>
): Promise<T> {
  const { logScrapeTrace } = await import("./weave-client");
  return logScrapeTrace(destination, origin, fn);
}

export async function traceOptimization<T>(
  request: import("../types").ParsedRequest,
  fn: () => Promise<T>
): Promise<T> {
  return fn();
}

export async function traceAgentRun<T>(...args: [unknown, unknown, unknown, unknown, () => Promise<T>]): Promise<T> {
  return args[4]();
}
