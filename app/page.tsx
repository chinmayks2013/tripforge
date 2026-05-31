"use client";

import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";
import ChatInput from "@/components/ChatInput";
import AgentDashboard from "@/components/AgentDashboard";
import PlanComparison from "@/components/PlanComparison";
import AssumptionsChecklist from "@/components/AssumptionsChecklist";
import LocationPrompt from "@/components/LocationPrompt";
import ScrapeFeed from "@/components/ScrapeFeed";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import PhaseStepper from "@/components/PhaseStepper";
import SectionHeading from "@/components/SectionHeading";
import HeroFeatures from "@/components/HeroFeatures";
import AnimatedHeroDestinations from "@/components/AnimatedHeroDestinations";
import ParticleField from "@/components/ParticleField";
import AgentOrchestrationHub from "@/components/AgentOrchestrationHub";
import LiveCommandBar from "@/components/LiveCommandBar";
import ResultsStatCards from "@/components/ResultsStatCards";
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
    <div className="section-shell p-10 text-center text-white/40 text-sm animate-pulse">
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
                ? {
                    ...a,
                    status: "complete",
                    progress: 100,
                    savingsFound: savings ?? a.savingsFound,
                    lastUpdate: Date.now(),
                  }
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
  const agentsActive = agents.filter(
    (a) => a.status === "searching" || a.status === "optimizing"
  ).length;
  const agentsComplete = agents.filter((a) => a.status === "complete").length;
  const dataSources = scrapedData?.sources?.length ?? 0;

  return (
    <main className="min-h-screen flex flex-col relative overflow-x-hidden">
      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0 z-0" aria-hidden>
        <div className="absolute inset-x-0 top-0 h-[640px] mesh-grid opacity-70" />
        {(phase === "idle" || phase === "optimizing") && (
          <>
            <div className="absolute top-[-10%] left-[15%] w-[420px] h-[420px] rounded-full bg-rook-500/10 aurora-blob" />
            <div
              className="absolute top-[5%] right-[10%] w-[360px] h-[360px] rounded-full bg-indigo-500/8 aurora-blob"
              style={{ animationDelay: "-4s" }}
            />
            <ParticleField />
          </>
        )}
      </div>

      <LiveCommandBar
        visible={phase === "optimizing"}
        agentsActive={agentsActive}
        agentsComplete={agentsComplete}
        totalAgents={agents.length}
        savingsTotal={totalSavings}
        activeWave={activeWave}
        isScraping={isScraping}
        dataSources={dataSources}
      />

      <SiteHeader
        phase={phase}
        showNav={phase === "results" && !!result?.route}
      />

      <div
        className={clsx(
          "relative z-10 max-w-6xl mx-auto px-4 py-10 sm:py-14 space-y-14 flex-1 w-full",
          phase === "optimizing" && "pb-32"
        )}
      >
        {/* Hero & search */}
        <section className="space-y-8">
          <AnimatePresence mode="wait">
            {phase === "idle" && (
              <motion.div
                key="hero"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.45 }}
                className="text-center space-y-6 max-w-3xl mx-auto pt-4 sm:pt-8"
              >
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="section-label"
                >
                  Enterprise trip intelligence
                </motion.p>
                <h1 className="font-display text-3xl sm:text-4xl lg:text-[2.85rem] font-bold leading-[1.12] tracking-tight text-white">
                  Optimize every trip with{" "}
                  <span className="gradient-text">multi-agent research</span>
                </h1>
                <p className="text-white/45 text-sm sm:text-base leading-relaxed max-w-xl mx-auto">
                  Describe your journey once. A live web scrape gathers route data, then
                  nine specialist agents run sequentially to compare costs and surface savings.
                </p>
                <AnimatedHeroDestinations />
              </motion.div>
            )}

            {phase === "optimizing" && (
              <motion.div
                key="working"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center max-w-lg mx-auto"
              >
                <SectionHeading
                  label="In progress"
                  title="Building your optimized itinerary"
                  description={
                    isScraping
                      ? "Live web scrape — geocoding, weather, and route distance"
                      : "Running agents one at a time in sequential order"
                  }
                />
              </motion.div>
            )}

            {phase === "results" && result && (
              <motion.div
                key="done"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="text-center max-w-lg mx-auto">
                  <SectionHeading
                    label="Complete"
                    title={`Your trip to ${result.request.destination} is ready`}
                    description="Review your optimized plans, verified pricing, and interactive itinerary below"
                  />
                </div>
                <ResultsStatCards result={result} />
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
              className="pt-2"
            >
              <HeroFeatures />
            </motion.div>
          )}

          {phase === "results" && result?.route && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-center gap-3 flex-wrap"
            >
              <a href="#plans-section" className="btn-secondary text-xs">
                View plans
              </a>
              <a href="#journey-section" className="btn-primary text-xs">
                Open itinerary
              </a>
            </motion.div>
          )}
        </section>

        {/* Agent orchestration hub */}
        <AnimatePresence>
          {(phase === "optimizing" || phase === "results") && (
            <motion.section
              initial={{ opacity: 0, scale: 0.97, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <AgentOrchestrationHub
                agents={agents}
                activeWave={activeWave}
                isActive
              />
            </motion.section>
          )}
        </AnimatePresence>

        {/* Live data feed */}
        <AnimatePresence>
          {(isScraping || scrapedData) &&
            (phase === "optimizing" || phase === "results") && (
              <motion.section
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <SectionHeading
                  label="Live data"
                  title="Web research (pre-pipeline)"
                  description="OpenStreetMap, weather, and Wikipedia — scraped before agents run"
                  align="left"
                />
                <ScrapeFeed data={scrapedData} isLoading={isScraping} />
              </motion.section>
            )}
        </AnimatePresence>

        {/* Assumptions */}
        <AnimatePresence>
          {assumptions.length > 0 &&
            (phase === "optimizing" || phase === "results") && (
              <motion.section
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                id="assumptions-section"
              >
                <SectionHeading
                  label="Trip parameters"
                  title="Assumptions checklist"
                  description="Confirm or adjust what we inferred from your request"
                  align="left"
                />
                <AssumptionsChecklist
                  assumptions={assumptions}
                  onUpdate={handleAssumptionUpdate}
                  isUpdating={isRefining}
                />
              </motion.section>
            )}
        </AnimatePresence>

        {/* Task orchestrator */}
        <AnimatePresence>
          {taskPlan.length > 0 &&
            (phase === "optimizing" || phase === "results") && (
              <motion.section
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <SectionHeading
                  label="Orchestration"
                  title="Sequential agent steps"
                  description="One agent at a time — flight through cost verification"
                  align="left"
                />
                <TaskOrchestratorPanel tasks={taskPlan} activeWave={activeWave} />
              </motion.section>
            )}
        </AnimatePresence>

        {/* Agent dashboard */}
        <AnimatePresence>
          {(phase === "optimizing" || phase === "results") && (
            <motion.section
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <SectionHeading
                label="Agents"
                title="Specialist agent status"
                description="Each agent runs in order after the previous completes"
                align="left"
              />
              <AgentDashboard
                agents={agents}
                isActive={phase === "optimizing" || phase === "results"}
              />
            </motion.section>
          )}
        </AnimatePresence>

        {/* Plans */}
        <AnimatePresence>
          {result && result.plans.length > 0 && phase === "results" && (
            <motion.section
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
              id="plans-section"
            >
              <SectionHeading
                label="Recommendations"
                title="Optimized travel plans"
                description="Budget, balanced, and luxury — from a single optimization pass"
              />
              <PlanComparison plans={result.plans} />
            </motion.section>
          )}
        </AnimatePresence>

        {/* Journey */}
        <AnimatePresence>
          {result?.route && phase === "results" && (
            <motion.section
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              id="journey-section"
            >
              <SectionHeading
                label="Itinerary"
                title="Step-by-step journey"
                description="Interactive route map with weather, stops, and daily breakdown"
                align="left"
              />
              <TripJourney route={result.route} userLocation={userLocation} />
            </motion.section>
          )}
        </AnimatePresence>
      </div>

      <SiteFooter />
    </main>
  );
}
