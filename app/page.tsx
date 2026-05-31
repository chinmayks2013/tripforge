"use client";

import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ChatInput from "@/components/ChatInput";
import AgentDashboard from "@/components/AgentDashboard";
import PlanComparison from "@/components/PlanComparison";
import AssumptionsChecklist from "@/components/AssumptionsChecklist";
import LocationPrompt from "@/components/LocationPrompt";
import ScrapeFeed from "@/components/ScrapeFeed";
import SiteHeader from "@/components/SiteHeader";
import PhaseStepper from "@/components/PhaseStepper";
import TaskOrchestratorPanel, {
  TaskPlanItem,
} from "@/components/TaskOrchestratorPanel";
import dynamic from "next/dynamic";
import {
  AgentEvent,
  AgentStatus,
  Assumption,
  OptimizationResult,
  TravelPlan,
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
  const [taskPlan, setTaskPlan] = useState<TaskPlanItem[]>([]);
  const [activeWave, setActiveWave] = useState<number | undefined>();
  const abortRef = useRef<AbortController | null>(null);

  const handleEvent = useCallback((event: AgentEvent) => {
    switch (event.type) {
      case "agent_start":
        if (event.agentId) {
          setAgents((prev) =>
            prev.map((a) =>
              a.id === event.agentId && a.status !== "complete"
                ? {
                    ...a,
                    status: "searching",
                    progress: 0,
                    message: "Starting...",
                    lastUpdate: Date.now(),
                  }
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

      case "task_plan_ready": {
        const { tasks, style } = event.data as {
          tasks?: TaskPlanItem[];
          style?: string;
        };
        if (tasks?.length && style === "balanced") setTaskPlan(tasks);
        break;
      }

      case "task_wave_start": {
        const { wave, style } = event.data as { wave?: number; style?: string };
        if (style === "balanced" && wave != null) setActiveWave(wave);
        break;
      }

      case "task_assigned":
        if (event.agentId) {
          const { title, objective } = event.data as {
            title?: string;
            objective?: string;
          };
          setAgents((prev) =>
            prev.map((a) =>
              a.id === event.agentId
                ? {
                    ...a,
                    status: "searching",
                    progress: 0,
                    assignedTask: title,
                    taskObjective: objective,
                    message: title ?? "Assigned",
                    lastUpdate: Date.now(),
                  }
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

      case "task_complete":
        if (event.agentId) {
          const { savings, message } = event.data as {
            savings?: number;
            message?: string;
          };
          setAgents((prev) =>
            prev.map((a) =>
              a.id === event.agentId
                ? {
                    ...a,
                    status: "complete",
                    progress: 100,
                    savingsFound: savings ?? a.savingsFound,
                    message: message ?? a.message,
                    lastUpdate: Date.now(),
                  }
                : a
            )
          );
        }
        break;

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
          if (data.result.agentStatuses?.length) setAgents(data.result.agentStatuses);
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
    setAssumptions([]);
    setScrapedData(null);
    setTaskPlan([]);
    setActiveWave(undefined);
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

  const totalSavings = agents.reduce((s, a) => s + (a.savingsFound ?? 0), 0);

  return (
    <main className="min-h-screen flex flex-col">
      <SiteHeader
        phase={phase}
        showNav={phase === "results" && !!result?.route}
      />

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-10 flex-1 w-full">
        {/* Hero */}
        <section className="space-y-8">
          <AnimatePresence mode="wait">
            {phase === "idle" && (
              <motion.div
                key="hero"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className="text-center space-y-5 pt-4"
              >
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-rook-400/25 bg-rook-500/10 text-rook-300 text-xs font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-rook-400 animate-pulse" />
                  9 AI agents · live data · verified pricing
                </div>
                <h2 className="font-display text-4xl sm:text-5xl lg:text-[3.25rem] leading-tight text-white max-w-3xl mx-auto">
                  Plan smarter trips with{" "}
                  <span className="gradient-text">TravelRooks</span>
                </h2>
                <p className="text-white/50 max-w-xl mx-auto text-sm sm:text-base leading-relaxed">
                  Describe your trip once. Our agents research live routes, compare
                  stays and transport, surface hidden savings, and verify every price
                  against real-world cost floors.
                </p>
              </motion.div>
            )}
            {phase === "optimizing" && (
              <motion.div
                key="working"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center pt-2"
              >
                <h2 className="text-xl sm:text-2xl font-semibold text-white/90">
                  Building your optimized itinerary…
                </h2>
                <p className="text-sm text-white/45 mt-2">
                  {isScraping
                    ? "Pulling live weather, routes, and destination data"
                    : "Agents are negotiating the best combination of savings"}
                </p>
              </motion.div>
            )}
            {phase === "results" && result && (
              <motion.div
                key="done"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center pt-2"
              >
                <h2 className="text-xl sm:text-2xl font-semibold text-white/90">
                  Your trip to{" "}
                  <span className="text-rook-400 capitalize">
                    {result.request.destination}
                  </span>{" "}
                  is ready
                </h2>
                {result.totalSavingsAcrossAgents > 0 && (
                  <p className="text-sm text-emerald-400/90 mt-2 font-medium">
                    ${result.totalSavingsAcrossAgents.toLocaleString()} total savings
                    applied across all categories
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {phase !== "idle" && (
            <PhaseStepper
              phase={phase}
              isScraping={isScraping}
              savingsTotal={totalSavings}
            />
          )}

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
              transition={{ delay: 0.2 }}
              className="grid grid-cols-2 lg:grid-cols-4 gap-3 max-w-3xl mx-auto pt-2"
            >
              {[
                { value: "9", label: "Specialist agents", sub: "Parallel optimization" },
                { value: "3", label: "Plan styles", sub: "Budget · Balanced · Luxury" },
                { value: "Live", label: "Route data", sub: "OpenStreetMap + weather" },
                { value: "✓", label: "Verified costs", sub: "No inflated savings" },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="glass rounded-xl p-4 text-center border-white/[0.06]"
                >
                  <div className="text-2xl font-display text-rook-400">{stat.value}</div>
                  <div className="text-xs font-medium text-white/75 mt-1">{stat.label}</div>
                  <div className="text-[10px] text-white/35 mt-0.5">{stat.sub}</div>
                </div>
              ))}
            </motion.div>
          )}

          {phase === "results" && result?.route && (
            <div className="flex justify-center gap-2 text-xs flex-wrap">
              <a
                href="#plans-section"
                className="glass px-4 py-2 rounded-lg text-white/60 hover:text-white hover:border-rook-400/30 transition-colors"
              >
                View plans
              </a>
              <a
                href="#journey-section"
                className="px-4 py-2 rounded-lg bg-rook-500/15 border border-rook-400/30 text-rook-300 hover:bg-rook-500/25 transition-colors"
              >
                Journey map →
              </a>
            </div>
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

        {/* Assumptions Checklist — visible as soon as assumptions are ready */}
        <AnimatePresence>
          {assumptions.length > 0 && (phase === "optimizing" || phase === "results") && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              id="assumptions-section"
            >
              <AssumptionsChecklist
                assumptions={assumptions}
                onUpdate={handleAssumptionUpdate}
                isUpdating={isRefining}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Task orchestrator */}
        <AnimatePresence>
          {taskPlan.length > 0 && (phase === "optimizing" || phase === "results") && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <TaskOrchestratorPanel tasks={taskPlan} activeWave={activeWave} />
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

        {/* Plans */}
        <AnimatePresence>
          {result && result.plans.length > 0 && phase === "results" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
              id="plans-section"
            >
              <div className="text-center">
                <h2 className="font-display text-2xl text-white">
                  Optimized Plans
                </h2>
                <p className="text-sm text-white/40 mt-1">
                  Three travel styles — pick the balance of cost and comfort that fits you
                </p>
              </div>
              <PlanComparison plans={result.plans} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Step-by-step journey with satellite map — scroll here after plans */}
        <AnimatePresence>
          {result?.route && phase === "results" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              id="journey-section"
            >
              <TripJourney route={result.route} userLocation={userLocation} />
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      <footer className="border-t border-white/[0.06] mt-12">
        <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/35">
          <span className="font-display text-white/50">
            Travel<span className="text-rook-400">Rooks</span>
          </span>
          <span>Intelligent multi-agent trip planning · MIT Hackathon 2026</span>
        </div>
      </footer>
    </main>
  );
}
