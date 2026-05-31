"use client";

import { motion } from "framer-motion";
import { AgentId, AGENT_META } from "@/lib/types";
import { Globe, ListOrdered } from "lucide-react";

export interface TaskPlanItem {
  id: string;
  agentId: AgentId;
  wave: number;
  title: string;
  objective: string;
  dependencies: AgentId[];
}

interface TaskOrchestratorPanelProps {
  tasks: TaskPlanItem[];
  activeWave?: number;
}

export default function TaskOrchestratorPanel({
  tasks,
  activeWave,
}: TaskOrchestratorPanelProps) {
  if (tasks.length === 0) return null;

  const ordered = [...tasks].sort((a, b) => a.wave - b.wave);

  return (
    <div className="section-shell p-4">
      <div className="flex items-center gap-2 mb-4">
        <ListOrdered className="w-4 h-4 text-white/50" />
        <h3 className="text-sm font-medium text-white/90">Sequential agent pipeline</h3>
        <span className="text-xs text-white/35 ml-auto">{tasks.length} steps</span>
      </div>

      {/* Pre-step: web scrape (not an agent) */}
      <div className="flex gap-3 mb-4 pb-4 border-b border-white/[0.06]">
        <div className="flex flex-col items-center">
          <div className="w-7 h-7 rounded-full flex items-center justify-center border border-cyan-500/30 bg-cyan-500/10 text-cyan-300">
            <Globe className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-white/85">Web research</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/20">
              Pre-step · live scrape
            </span>
          </div>
          <p className="text-xs text-white/40 mt-0.5 leading-relaxed">
            OpenStreetMap geocoding, weather, and route distance — runs before any agent
          </p>
        </div>
      </div>

      <ol className="space-y-0">
        {ordered.map((task, i) => {
          const meta = AGENT_META[task.agentId];
          const isActive = activeWave === task.wave;
          const isDone = activeWave != null && task.wave < activeWave;

          return (
            <li key={task.id} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium border ${
                    isActive
                      ? "border-rook-400/50 bg-rook-500/15 text-rook-300"
                      : isDone
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                        : "border-white/10 bg-white/[0.03] text-white/40"
                  }`}
                >
                  {isDone ? "✓" : task.wave}
                </div>
                {i < ordered.length - 1 && (
                  <div
                    className={`w-px flex-1 min-h-[1.5rem] my-1 ${
                      isDone ? "bg-emerald-500/25" : "bg-white/[0.08]"
                    }`}
                  />
                )}
              </div>
              <div className={`pb-4 flex-1 min-w-0 ${i === ordered.length - 1 ? "pb-0" : ""}`}>
                <div className="flex items-center gap-2">
                  <span className="text-sm">{meta.icon}</span>
                  <span className="text-sm font-medium text-white/85">{task.title}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.04] text-white/35 border border-white/[0.08]">
                    Rule-based
                  </span>
                </div>
                <p className="text-xs text-white/40 mt-0.5 leading-relaxed">{task.objective}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
