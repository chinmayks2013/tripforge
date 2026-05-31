import { AgentId, ParsedRequest, TravelStyle } from "../types";
import { AgentScrapeSnapshot } from "../scraper/agent-scrapes";

export interface AIInsight {
  summary: string;
  recommendations: string[];
  /** 0–0.2 extra savings ratio suggested by AI */
  savingsBoost: number;
  confidence: "high" | "medium" | "low";
  usedLiveModel: boolean;
}

const AGENT_PROMPTS: Record<Exclude<AgentId, "flight">, string> = {
  lodging:
    "You are a lodging cost analyst. Given scraped hotel/hostel counts and trip details, suggest 2 brief optimizations.",
  transport:
    "You are a ground transport analyst. Given transit stop counts and trip style, suggest transit pass vs pay-per-ride.",
  attractions:
    "You are an activities planner. Given museum/attraction counts and interests, suggest combo tickets or free days.",
  savings:
    "You are a deals analyst. Given memberships and destination context, suggest stackable discounts.",
  group:
    "You are a group travel specialist. Given group size and venue counts, suggest group rates.",
  routing:
    "You are a route optimizer. Given POI density, suggest neighborhood clustering to cut transit.",
  budget:
    "You are a budget optimizer. Given trip constraints, suggest meal and category trade-offs.",
  efficiency:
    "You are a cost auditor. Given distance and style, flag if savings look inflated vs realistic floors.",
};

function fallbackInsight(
  agentId: Exclude<AgentId, "flight">,
  request: ParsedRequest,
  scrape: AgentScrapeSnapshot,
  style: TravelStyle
): AIInsight {
  const facts = scrape.facts;
  const recs: string[] = [];
  let boost = 0.05;

  switch (agentId) {
    case "lodging":
      if ((facts.hotelCount as number) > 50) {
        recs.push("High hotel supply — prioritize mid-week stays for 7% off-peak savings");
        boost = 0.08;
      } else {
        recs.push("Limited supply — book early; consider apartment rental for groups");
        boost = 0.06;
      }
      break;
    case "transport":
      if ((facts.transitStops as number) > 100 && !facts.hasCar) {
        recs.push("Dense transit network — 7-day unlimited pass beats pay-per-ride");
        boost = 0.1;
      } else {
        recs.push("Mix transit pass with occasional rideshare for edge trips");
        boost = 0.05;
      }
      break;
    case "attractions":
      if (request.attractionIntensity === "minimal") {
        recs.push("Limit activities to one cost-effective highlight per day and favor free parks or scenic neighborhoods.");
        boost = 0.14;
      } else if (request.attractionIntensity === "low") {
        recs.push("Lean into free or low-cost attractions, plus one paid highlight each day.");
        boost = 0.11;
      } else {
        recs.push(
          (facts.museums as number) > 5
            ? "Bundle museums with a city pass — saves vs individual tickets"
            : "Prioritize free-entry days and walking tours"
        );
        boost = style === "budget" ? 0.12 : 0.07;
      }
      break;
    case "savings":
      recs.push(
        request.hasMemberships.length
          ? `Stack ${request.hasMemberships.join(", ")} perks with seasonal promos`
          : "Add AAA or student ID credentials for 5–10% category discounts"
      );
      boost = 0.09;
      break;
    case "group":
      if (request.groupSize >= 4) {
        recs.push("Qualifies for group tour and restaurant set-menu rates");
        boost = 0.11;
      } else {
        recs.push("Duo bundles available on lodging and activity combos");
        boost = 0.04;
      }
      break;
    case "routing":
      recs.push("Cluster sights by neighborhood — reduces daily transit 15–20%");
      boost = 0.06;
      break;
    case "budget":
      recs.push("Shift one splurge meal to lunch special; groceries for breakfast");
      boost = style === "luxury" ? 0.02 : 0.08;
      break;
    case "efficiency":
      recs.push("Cross-check totals against scraped distance and destination cost index");
      boost = 0;
      break;
  }

  return {
    summary: recs[0] ?? "AI analysis complete",
    recommendations: recs,
    savingsBoost: boost,
    confidence: scrape.sources.length > 0 ? "medium" : "low",
    usedLiveModel: false,
  };
}

async function callOpenAI(
  agentId: Exclude<AgentId, "flight">,
  request: ParsedRequest,
  scrape: AgentScrapeSnapshot,
  style: TravelStyle,
  ctx?: { priorAgentSummaries?: { agentId: AgentId; message: string; savings: number }[] }
): Promise<AIInsight | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const priorNotes = ctx?.priorAgentSummaries?.length
    ? "\n\nPrior agent findings:\n" +
      ctx.priorAgentSummaries
        .map(
          (summary) =>
            `- ${summary.agentId}: ${summary.message} (saved $${summary.savings})`
        )
        .join("\n")
    : "";

  const prompt = `${AGENT_PROMPTS[agentId]}

Destination: ${request.destination}
Style: ${style}
Group: ${request.groupSize}
Duration: ${request.duration ?? 5} days
Travel mode: ${request.travelMode}
Attraction intensity: ${request.attractionIntensity ?? "normal"}
Scraped: ${scrape.summary}
Facts: ${JSON.stringify(scrape.facts)}${priorNotes}

Respond as JSON: {"summary":"one sentence","recommendations":["r1","r2"],"savingsBoost":0.08,"confidence":"high|medium|low"}`;

  try {
    const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
    const res = await (async () => {
      const callOpenAI = () =>
        fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: "Travel cost analyst. JSON only." },
              { role: "user", content: prompt },
            ],
            temperature: 0.3,
            max_tokens: 300,
          }),
        }).then(async (response) => {
          if (!response.ok) throw new Error(`OpenAI ${response.status}`);
          return response.json() as Promise<{
            choices?: { message?: { content?: string } }[];
            usage?: {
              prompt_tokens: number;
              completion_tokens: number;
              total_tokens: number;
            };
          }>;
        });

      if (process.env.WANDB_API_KEY) {
        const { traceLLMCompletion } = await import("../wandb/weave-client");
        return traceLLMCompletion(agentId, model, callOpenAI);
      }
      return callOpenAI();
    })();

    const text = res.choices?.[0]?.message?.content ?? "";
    const json = JSON.parse(text.replace(/```json|```/g, "").trim()) as {
      summary: string;
      recommendations: string[];
      savingsBoost: number;
      confidence: "high" | "medium" | "low";
    };

    return {
      summary: json.summary,
      recommendations: json.recommendations ?? [],
      savingsBoost: Math.min(0.2, Math.max(0, json.savingsBoost ?? 0.05)),
      confidence: json.confidence ?? "medium",
      usedLiveModel: true,
    };
  } catch {
    return null;
  }
}

/** AI reasoning for all agents except flight (scraping-only). */
export async function runAgentAI(
  agentId: AgentId,
  request: ParsedRequest,
  scrape: AgentScrapeSnapshot,
  style: TravelStyle,
  ctx?: { priorAgentSummaries?: { agentId: AgentId; message: string; savings: number }[] }
): Promise<AIInsight> {
  if (agentId === "flight") {
    throw new Error("Flight agent uses web scraping only — no AI");
  }

  const live = await callOpenAI(agentId, request, scrape, style, ctx);
  if (live) return live;

  return fallbackInsight(agentId, request, scrape, style);
}
