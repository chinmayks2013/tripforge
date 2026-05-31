"use client";

import { motion } from "framer-motion";
import { AgentId, AGENT_META } from "@/lib/types";
import { ListChecks } from "lucide-react";

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

  const wave1 = tasks.filter((t) => t.wave === 1);
  const wave2 = tasks.filter((t) => t.wave === 2);

  return (
    <div className="glass rounded-2xl p-4 border border-indigo-500/20">
      <div className="flex items-center gap-2 mb-3">
        <ListChecks className="w-4 h-4 text-indigo-400" />
        <h3 className="text-sm font-semibold text-white/90">Task assignments</h3>
        <span className="text-[10px] text-white/40">
          {tasks.length} tasks · 3 waves
        </span>
      </div>

      <div className="space-y-3">
        {[
          { wave: 1, label: "Wave 1 — parallel specialists", items: wave1 },
          { wave: 2, label: "Wave 2 — budget synthesis", items: wave2 },
          { wave: 3, label: "Wave 3 — cost verification", items: tasks.filter((t) => t.wave === 3) },
        ].map(({ wave, label, items }) =>
          items.length > 0 ? (
            <div key={wave}>
              <div
                className={`text-[10px] uppercase tracking-wide mb-1.5 ${
                  activeWave === wave ? "text-indigo-300" : "text-white/35"
                }`}
              >
                {label}
                {activeWave === wave && " · running"}
              </div>
              <div className="grid gap-1.5">
                {items.map((task, i) => {
                  const meta = AGENT_META[task.agentId];
                  return (
                    <motion.div
                      key={task.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="flex items-start gap-2 rounded-lg bg-white/[0.03] px-2.5 py-2 border border-white/5"
                    >
                      <span className="text-sm shrink-0">{meta.icon}</span>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-medium text-white/80">
                          {meta.name}
                          {task.wave === 3 && (
                            <span className="text-white/40 font-normal"> · final pass</span>
                          )}
                        </div>
                        <div className="text-[10px] text-white/40 truncate">
                          {task.title}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ) : null
        )}
      </div>
    </div>
  );
}
