"use client";

import { motion, AnimatePresence } from "framer-motion";
import { AgentStatus, AgentId, AGENT_META } from "@/lib/types";

const SEQUENTIAL_ORDER: AgentId[] = [
  "flight",
  "lodging",
  "transport",
  "attractions",
  "savings",
  "group",
  "routing",
  "budget",
  "efficiency",
];

const COLOR_MAP: Record<string, string> = {
  "agent-flight": "#6366f1",
  "agent-lodging": "#8b5cf6",
  "agent-transport": "#06b6d4",
  "agent-attractions": "#f59e0b",
  "agent-savings": "#10b981",
  "agent-group": "#f97316",
  "agent-routing": "#84cc16",
  "agent-budget": "#ef4444",
  "agent-efficiency": "#22d3ee",
};

interface AgentOrchestrationHubProps {
  agents: AgentStatus[];
  activeWave?: number;
  isActive: boolean;
}

function agentState(agent: AgentStatus): "idle" | "working" | "complete" {
  if (agent.status === "complete") return "complete";
  if (agent.status === "searching" || agent.status === "optimizing") return "working";
  return "idle";
}

export default function AgentOrchestrationHub({
  agents,
  activeWave,
  isActive,
}: AgentOrchestrationHubProps) {
  if (!isActive) return null;

  const agentMap = Object.fromEntries(agents.map((a) => [a.id, a])) as Record<
    AgentId,
    AgentStatus
  >;

  const workingAgent = agents.find(
    (a) => a.status === "searching" || a.status === "optimizing"
  );
  const completeCount = agents.filter((a) => a.status === "complete").length;
  const skippedCount = agents.filter((a) => a.status === "skipped").length;
  const currentStep = activeWave ?? (workingAgent ? SEQUENTIAL_ORDER.indexOf(workingAgent.id as AgentId) + 1 : 0);

  return (
    <div className="section-shell overflow-hidden relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(201,162,77,0.07),transparent_60%)] pointer-events-none" />

      <div className="px-4 sm:px-5 pt-4 pb-3 flex items-center justify-between relative z-10 gap-3">
        <div>
          <p className="section-label">Sequential pipeline</p>
          <p className="text-sm text-white/50 mt-0.5">
            {workingAgent
              ? `Running ${AGENT_META[workingAgent.id as AgentId].name}…`
              : completeCount === agents.length
                ? "All 9 agents complete"
                : skippedCount === agents.length
                  ? "Agent not triggered"
                  : completeCount + skippedCount === agents.length
                    ? "Some agents were not triggered"
                    : "Waiting for next agent…"}
          </p>
        </div>
        {currentStep > 0 && (
          <motion.span
            key={currentStep}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-xs px-3 py-1 rounded-full border border-rook-400/30 bg-rook-500/10 text-rook-300 shrink-0"
          >
            Step {currentStep} / {SEQUENTIAL_ORDER.length}
          </motion.span>
        )}
      </div>

      {/* Sequential pipeline row */}
      <div className="px-4 sm:px-5 pb-4 overflow-x-auto">
        <div className="flex items-center gap-1 min-w-max py-2">
          {SEQUENTIAL_ORDER.map((id, i) => {
            const agent = agentMap[id];
            const meta = AGENT_META[id];
            const color = COLOR_MAP[meta.color] ?? "#d4a853";
            const state = agent ? agentState(agent) : "idle";
            const isLast = i === SEQUENTIAL_ORDER.length - 1;

            return (
              <div key={id} className="flex items-center">
                <motion.div
                  layout
                  className="relative flex flex-col items-center gap-1.5"
                  animate={{
                    scale: state === "working" ? 1.05 : 1,
                    opacity: state === "idle" ? 0.45 : 1,
                  }}
                  transition={{ duration: 0.25 }}
                >
                  {state === "working" && (
                    <motion.div
                      className="absolute inset-0 rounded-xl"
                      style={{ boxShadow: `0 0 24px ${color}44` }}
                      animate={{ opacity: [0.4, 0.8, 0.4] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    />
                  )}
                  <div
                    className="relative w-11 h-11 rounded-xl flex items-center justify-center border text-lg"
                    style={{
                      borderColor:
                        state === "complete"
                          ? "#10b98155"
                          : state === "working"
                            ? `${color}88`
                            : "rgba(255,255,255,0.1)",
                      backgroundColor:
                        state === "complete"
                          ? "rgba(16,185,129,0.12)"
                          : state === "working"
                            ? `${color}18`
                            : "rgba(255,255,255,0.03)",
                    }}
                  >
                    {meta.icon}
                    {state === "complete" && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center text-[9px] text-white">
                        ✓
                      </span>
                    )}
                  </div>
                  <span
                    className="text-[9px] font-medium max-w-[52px] text-center leading-tight"
                    style={{
                      color:
                        state === "working"
                          ? "#fff"
                          : state === "complete"
                            ? "rgba(16,185,129,0.85)"
                            : "rgba(255,255,255,0.35)",
                    }}
                  >
                    {meta.name.replace(" Agent", "")}
                  </span>
                  {agent && state === "working" && (
                    <div className="w-10 h-0.5 rounded-full bg-white/10 overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: color }}
                        initial={{ width: 0 }}
                        animate={{ width: `${agent.progress}%` }}
                      />
                    </div>
                  )}
                </motion.div>

                {!isLast && (
                  <div
                    className="w-4 sm:w-6 h-px mx-0.5 shrink-0 transition-colors duration-300"
                    style={{
                      backgroundColor:
                        state === "complete"
                          ? "rgba(16,185,129,0.35)"
                          : "rgba(255,255,255,0.08)",
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="px-4 sm:px-5 pb-4 min-h-[2rem] border-t border-white/[0.05] pt-3">
        <AnimatePresence mode="wait">
          {workingAgent ? (
            <motion.p
              key={workingAgent.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="text-xs text-white/45 truncate"
            >
              <span className="text-rook-400">●</span>{" "}
              {workingAgent.message || workingAgent.assignedTask || AGENT_META[workingAgent.id as AgentId].name}
            </motion.p>
          ) : completeCount === agents.length ? (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs text-emerald-400/80"
            >
              Sequential pipeline complete — plans ready for review
            </motion.p>
          ) : (
            <p className="text-xs text-white/30">
              Agents run one at a time in order
            </p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
