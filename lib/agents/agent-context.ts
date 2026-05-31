import { AgentId, ParsedRequest, ScrapedTripData, TravelStyle } from "../types";
import { scrapeForAgent } from "../scraper/agent-scrapes";
import { runAgentAI } from "./ai-reasoning";
import { ProgressCallback } from "./index";

export interface AgentRunContext {
  onScrapeProgress?: (agentId: AgentId, message: string) => void;
}

export interface PreparedAgentData {
  scrape: import("../scraper/agent-scrapes").AgentScrapeSnapshot;
  ai?: import("./ai-reasoning").AIInsight;
  tripData?: ScrapedTripData;
}

/** Scrape live web data, then run AI for non-flight agents. */
export async function prepareAgent(
  agentId: AgentId,
  request: ParsedRequest,
  style: TravelStyle,
  onProgress: ProgressCallback,
  ctx: AgentRunContext | undefined,
  options: { useAi: boolean }
): Promise<PreparedAgentData> {
  onProgress(agentId, 12, `Scraping live ${agentId} data from the web…`);

  const { snapshot, tripData } = await scrapeForAgent(agentId, request, (msg) => {
    ctx?.onScrapeProgress?.(agentId, msg);
    onProgress(agentId, 35, msg);
  });

  onProgress(agentId, 48, snapshot.summary);

  if (!options.useAi) {
    return { scrape: snapshot, tripData };
  }

  onProgress(agentId, 62, "AI analyzing scraped data…");
  const ai = await runAgentAI(agentId, request, snapshot, style);
  onProgress(
    agentId,
    78,
    ai.usedLiveModel ? `AI (${ai.confidence}): ${ai.summary}` : `AI analysis: ${ai.summary}`
  );

  return { scrape: snapshot, ai, tripData };
}

/** Apply AI savings boost as an opportunity line. */
export function applyAiSavings(
  agentId: AgentId,
  baseCost: number,
  ai: import("./ai-reasoning").AIInsight | undefined,
  opportunities: import("../types").HiddenOpportunity[]
): number {
  if (!ai || ai.savingsBoost <= 0) return 0;
  const savings = Math.round(baseCost * ai.savingsBoost);
  if (savings <= 0) return 0;
  opportunities.push({
    id: `${agentId}-ai-insight`,
    title: "AI-recommended optimization",
    description: ai.recommendations[0] ?? ai.summary,
    savings,
    category: "AI Insight",
    agentId,
    applied: true,
  });
  return savings;
}
