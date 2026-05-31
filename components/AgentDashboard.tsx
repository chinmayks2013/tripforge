"use client";

import { motion, AnimatePresence } from "framer-motion";
import { AgentStatus, AGENT_META, AgentId } from "@/lib/types";
import clsx from "clsx";

interface AgentDashboardProps {
  agents: AgentStatus[];
  isActive: boolean;
}

const COLOR_MAP: Record<string, string> = {
  "agent-flight": "#6366f1",
  "agent-lodging": "#8b5cf6",
  "agent-transport": "#06b6d4",
  "agent-parking": "#64748b",
  "agent-attractions": "#f59e0b",
  "agent-discounts": "#10b981",
  "agent-memberships": "#ec4899",
  "agent-passes": "#3b82f6",
  "agent-group": "#f97316",
  "agent-routing": "#84cc16",
  "agent-budget": "#ef4444",
};

export default function AgentDashboard({ agents, isActive }: AgentDashboardProps) {
  if (!isActive) return null;

  const activeCount = agents.filter(
    (a) => a.status === "searching" || a.status === "optimizing"
  ).length;
  const completeCount = agents.filter((a) => a.status === "complete").length;
  const totalSavings = agents.reduce((s, a) => s + (a.savingsFound ?? 0), 0);

  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-white/90">
            Agent Orchestration
          </h3>
          <p className="text-xs text-white/50 mt-0.5">
            {activeCount > 0
              ? `${activeCount} agents working in parallel`
              : `${completeCount}/11 agents complete`}
          </p>
        </div>
        {totalSavings > 0 && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-right"
          >
            <div className="text-xs text-white/50">Savings discovered</div>
            <div className="text-lg font-bold text-emerald-400">
              ${totalSavings.toLocaleString()}
            </div>
          </motion.div>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
        <AnimatePresence>
          {agents.map((agent) => {
            const meta = AGENT_META[agent.id as AgentId];
            const color = COLOR_MAP[meta.color] ?? "#14b8a6";
            const isWorking =
              agent.status === "searching" || agent.status === "optimizing";
            const isComplete = agent.status === "complete";

            return (
              <motion.div
                key={agent.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={clsx(
                  "relative rounded-xl p-3 border transition-all duration-300",
                  isWorking && "border-white/20 bg-white/5",
                  isComplete && "border-emerald-500/30 bg-emerald-500/5",
                  !isWorking && !isComplete && "border-white/5 bg-white/[0.02]"
                )}
              >
                {isWorking && (
                  <motion.div
                    className="absolute inset-0 rounded-xl opacity-20 pointer-events-none"
                    style={{ background: `radial-gradient(circle at center, ${color}, transparent)` }}
                    animate={{ opacity: [0.1, 0.25, 0.1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                )}

                <div className="relative flex items-start gap-2">
                  <span className="text-lg">{meta.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-white/80 truncate">
                      {meta.name}
                    </div>
                    <div className="text-[10px] text-white/40 truncate mt-0.5">
                      {agent.message}
                    </div>

                    {(isWorking || isComplete) && (
                      <div className="mt-2 h-1 rounded-full bg-white/10 overflow-hidden">
                        <motion.div
                          className="h-full rounded-full"
                          style={{ backgroundColor: color }}
                          initial={{ width: 0 }}
                          animate={{ width: `${agent.progress}%` }}
                          transition={{ duration: 0.5 }}
                        />
                      </div>
                    )}

                    {agent.savingsFound != null && agent.savingsFound > 0 && (
                      <div className="text-[10px] text-emerald-400 mt-1 font-medium">
                        −${agent.savingsFound}
                      </div>
                    )}
                  </div>

                  {isComplete && (
                    <div className="w-4 h-4 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                      <svg className="w-2.5 h-2.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
