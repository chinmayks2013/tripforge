"use client";

import { useState } from "react";
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
  "agent-attractions": "#f59e0b",
  "agent-savings": "#10b981",
  "agent-group": "#f97316",
  "agent-routing": "#84cc16",
  "agent-budget": "#ef4444",
  "agent-efficiency": "#22d3ee",
};

export default function AgentDashboard({ agents, isActive }: AgentDashboardProps) {
  const [selectedId, setSelectedId] = useState<AgentId | null>(null);

  if (!isActive) return null;

  const activeCount = agents.filter(
    (a) => a.status === "searching" || a.status === "optimizing"
  ).length;
  const completeCount = agents.filter((a) => a.status === "complete").length;
  const totalSavings = agents.reduce((s, a) => s + (a.savingsFound ?? 0), 0);
  const selected = selectedId ? agents.find((a) => a.id === selectedId) : null;
  const selectedMeta = selectedId ? AGENT_META[selectedId] : null;

  return (
    <div className="space-y-3">
      <AnimatePresence>
        {selected && selectedMeta && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="section-shell p-4 border-rook-400/20 overflow-hidden"
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl">{selectedMeta.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white">{selectedMeta.name}</p>
                <p className="text-xs text-white/45 mt-0.5">{selectedMeta.description}</p>
                {selected.assignedTask && (
                  <p className="text-xs text-rook-300/80 mt-2">
                    Task: {selected.assignedTask}
                  </p>
                )}
                {selected.taskObjective && (
                  <p className="text-[11px] text-white/35 mt-1">{selected.taskObjective}</p>
                )}
                {selected.message && (
                  <p className="text-[11px] text-white/50 mt-2 italic">{selected.message}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                className="text-xs text-white/30 hover:text-white/60"
              >
                Close
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    <div className="section-shell p-5 sm:p-6">
      <div className="flex items-center justify-between mb-5 pb-4 border-b border-white/[0.06]">
        <div>
          <p className="text-xs text-white/40">
            {activeCount > 0
              ? "1 agent running"
              : `${completeCount} of ${agents.length} complete`}
          </p>
        </div>
        {totalSavings > 0 && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-right px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20"
          >
            <div className="text-[10px] text-emerald-400/70 uppercase tracking-wider">
              Savings found
            </div>
            <div className="text-lg font-semibold text-emerald-400">
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
              <motion.button
                type="button"
                key={agent.id}
                onClick={() =>
                  setSelectedId(selectedId === agent.id ? null : (agent.id as AgentId))
                }
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={clsx(
                  "relative rounded-xl p-3 border transition-all duration-300 text-left w-full",
                  selectedId === agent.id && "ring-1 ring-rook-400/40",
                  isWorking && "border-rook-400/25 bg-rook-500/5",
                  isComplete && "border-emerald-500/25 bg-emerald-500/5",
                  !isWorking && !isComplete && "border-white/5 bg-white/[0.02] hover:border-white/12"
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
                      {agent.assignedTask ?? agent.message}
                    </div>
                    {agent.taskObjective && agent.status !== "idle" && (
                      <div className="text-[9px] text-white/25 truncate mt-0.5 leading-tight">
                        {agent.taskObjective}
                      </div>
                    )}

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
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
    </div>
  );
}
