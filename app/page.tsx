"use client";

import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ChatInput from "@/components/ChatInput";
import AgentDashboard from "@/components/AgentDashboard";
import PlanComparison from "@/components/PlanComparison";
import AssumptionsChecklist from "@/components/AssumptionsChecklist";
import LocationPrompt from "@/components/LocationPrompt";
import ScrapeFeed from "@/components/ScrapeFeed";
import dynamic from "next/dynamic";
import {
  AgentEvent,
  AgentStatus,
  Assumption,
  OptimizationResult,
  TravelPlan,
  AGENT_META,
  ScrapedTripData,
  UserLocation,
} from "@/lib/types";
import { createInitialAgentStatuses } from "@/lib/agents";

const TripJourney = dynamic(() => import("@/components/TripJourney"), {
  ssr: false,
  loading: () => (
    <div className="glass rounded-2xl p-8 text-center text-white/40 text-sm">
      Loading journey map…
    </div>
  ),
});

type AppPhase = "idle" | "optimizing" | "results";

export default function Home() {
  const [phase, setPhase] = useState<AppPhase>("idle");
  const [agents, setAgents] = useState<AgentStatus[]>(createInitialAgentStatuses());
  const [result, setResult] = useState<OptimizationResult | null>(null);
  const [assumptions, setAssumptions] = useState<Assumption[]>([]);
  const [isRefining, setIsRefining] = useState(false);
  const [query, setQuery] = useState("");
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [scrapedData, setScrapedData] = useState<ScrapedTripData | null>(null);
  const [isScraping, setIsScraping] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const handleEvent = useCallback((event: AgentEvent) => {
    switch (event.type) {
      case "agent_start":
        if (event.agentId) {
          setAgents((prev) =>
            prev.map((a) =>
              a.id === event.agentId
                ? { ...a, status: "searching", progress: 0, message: "Starting...", lastUpdate: Date.now() }
                : a
            )
          );
        }
        break;

      case "agent_progress":
        if (event.agentId) {
          const { progress, message, savings } = event.data as {
            progress: number;
            message: string;
            savings?: number;
          };
          setAgents((prev) =>
            prev.map((a) =>
              a.id === event.agentId
                ? {
                    ...a,
                    status: progress >= 100 ? "complete" : "searching",
                    progress,
                    message,
                    savingsFound: savings ?? a.savingsFound,
                    lastUpdate: Date.now(),
                  }
                : a
            )
          );
        }
        break;

      case "agent_complete":
        if (event.agentId) {
          const { savings } = event.data as { savings?: number };
          setAgents((prev) =>
            prev.map((a) =>
              a.id === event.agentId
                ? { ...a, status: "complete", progress: 100, savingsFound: savings ?? a.savingsFound, lastUpdate: Date.now() }
                : a
            )
          );
        }
        break;

      case "scrape_progress": {
        setIsScraping(true);
        const { message } = event.data as { message?: string };
        if (message) {
          setAgents((prev) =>
            prev.map((a) =>
              a.id === "routing"
                ? { ...a, status: "searching", message, progress: Math.min(90, a.progress + 15) }
                : a
            )
          );
        }
        break;
      }

      case "scrape_complete": {
        const data = event.data as { scrapedData?: ScrapedTripData };
        if (data.scrapedData) setScrapedData(data.scrapedData);
        setIsScraping(false);
        break;
      }

      case "assumptions_ready":
        setAssumptions((event.data.assumptions as Assumption[]) ?? []);
        break;

      case "plan_ready": {
        const plan = event.data.plan as TravelPlan;
        setResult((prev) => {
          if (!prev) return prev;
          const plans = [...prev.plans.filter((p) => p.style !== plan.style), plan];
          return { ...prev, plans };
        });
        break;
      }

      case "orchestrator_complete": {
        const data = event.data as { result?: OptimizationResult; refine?: boolean };
        if (data.result) {
          setResult(data.result);
          if (data.result.scrapedData) setScrapedData(data.result.scrapedData);
          if (data.result.assumptions?.length) setAssumptions(data.result.assumptions);
          if (data.result.agentStatuses) setAgents(data.result.agentStatuses);
        }
        setIsScraping(false);
        setPhase("results");
        setIsRefining(false);
        break;
      }

      case "error":
        console.error("Optimization error:", event.data);
        setPhase("results");
        setIsRefining(false);
        break;
    }
  }, []);

  const streamOptimize = useCallback(
    async (body: Record<string, unknown>) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const response = await fetch("/api/optimize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        if (!response.ok) throw new Error("Optimization request failed");

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response stream");

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const event = JSON.parse(line.slice(6)) as AgentEvent;
                handleEvent(event);
              } catch {
                /* skip malformed */
              }
            }
          }
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          console.error("Stream error:", err);
          setPhase("results");
          setIsRefining(false);
        }
      }
    },
    [handleEvent]
  );

  const handleSubmit = async (q: string) => {
    setQuery(q);
    setPhase("optimizing");
    setAgents(createInitialAgentStatuses());
    setResult(null);
    setScrapedData(null);
    setIsScraping(true);

    await streamOptimize({
      query: q,
      userLocation: userLocation ?? undefined,
    });
  };

  const handleAssumptionUpdate = async (updated: Assumption[]) => {
    setAssumptions(updated);
    setIsRefining(true);
    setAgents(createInitialAgentStatuses());
    setIsScraping(true);

    await streamOptimize({
      query,
      assumptions: updated,
      refine: true,
      userLocation: userLocation ?? undefined,
    });
  };

  return (
    <main className="min-h-screen">
      {/* Header */}
      <header className="border-b border-white/5">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-cyan-500 flex items-center justify-center text-lg">
              ⚡
            </div>
            <div>
              <h1 className="text-lg font-bold gradient-text">TripForge</h1>
              <p className="text-[10px] text-white/40 tracking-wide uppercase">
                Multi-Agent Cost Optimizer
              </p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-xs text-white/40">
            {Object.values(AGENT_META).slice(0, 5).map((a) => (
              <span key={a.name} title={a.description}>
                {a.icon}
              </span>
            ))}
            <span>+6 more agents</span>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Hero / Input */}
        <section className="text-center space-y-6 py-8">
          <AnimatePresence mode="wait">
            {phase === "idle" && (
              <motion.div
                key="hero"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-4"
              >
                <h2 className="text-3xl sm:text-4xl font-bold text-white">
                  Tell us where you want to go.
                  <br />
                  <span className="gradient-text">We&apos;ll find every way to save.</span>
                </h2>
                <p className="text-white/50 max-w-xl mx-auto text-sm sm:text-base">
                  11 AI agents work in parallel to minimize your trip cost — uncovering
                  hidden passes, membership perks, group rates, and savings traditional
                  planners miss.
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          <LocationPrompt
            location={userLocation}
            onLocation={setUserLocation}
            loading={phase === "optimizing"}
          />

          <ChatInput onSubmit={handleSubmit} isLoading={phase === "optimizing"} />

          {phase === "idle" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto pt-4"
            >
              {[
                { icon: "🎫", label: "Local Passes" },
                { icon: "💳", label: "Membership Perks" },
                { icon: "👥", label: "Group Rates" },
                { icon: "🏷️", label: "Hidden Discounts" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="glass rounded-xl p-3 text-center"
                >
                  <div className="text-xl mb-1">{item.icon}</div>
                  <div className="text-[10px] text-white/50">{item.label}</div>
                </div>
              ))}
            </motion.div>
          )}
        </section>

        {/* Live scrape feed */}
        <AnimatePresence>
          {(isScraping || scrapedData) && (phase === "optimizing" || phase === "results") && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <ScrapeFeed data={scrapedData} isLoading={isScraping} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Agent Dashboard */}
        <AnimatePresence>
          {(phase === "optimizing" || phase === "results") && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <AgentDashboard
                agents={agents}
                isActive={phase === "optimizing" || phase === "results"}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Assumptions Checklist */}
        <AnimatePresence>
          {assumptions.length > 0 && phase === "results" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <AssumptionsChecklist
                assumptions={assumptions}
                onUpdate={handleAssumptionUpdate}
                isUpdating={isRefining}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Plans */}
        <AnimatePresence>
          {result && result.plans.length > 0 && phase === "results" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="text-center">
                <h2 className="text-xl font-bold text-white">
                  Your Optimized Plans
                </h2>
                <p className="text-sm text-white/40 mt-1">
                  {result.plans.length} travel styles ·{" "}
                  {result.plans[0]?.opportunities.filter((o) => o.applied).length ?? 0}+
                  hidden savings applied
                </p>
              </div>
              <PlanComparison plans={result.plans} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Step-by-step journey with satellite map */}
        <AnimatePresence>
          {result?.route && phase === "results" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <TripJourney route={result.route} userLocation={userLocation} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/5 mt-16">
        <div className="max-w-6xl mx-auto px-4 py-6 text-center text-xs text-white/30">
          TripForge · Multi-Agent Travel Cost Optimization · Hackathon 2026
        </div>
      </footer>
    </main>
  );
}
