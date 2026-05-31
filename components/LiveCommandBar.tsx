"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Bot, DollarSign, ListOrdered, Radio } from "lucide-react";
import { useCountUp } from "./useCountUp";

interface LiveCommandBarProps {
  visible: boolean;
  agentsActive: number;
  agentsComplete: number;
  totalAgents: number;
  savingsTotal: number;
  activeWave?: number;
  isScraping: boolean;
  dataSources?: number;
}

export default function LiveCommandBar({
  visible,
  agentsActive,
  agentsComplete,
  totalAgents,
  savingsTotal,
  activeWave,
  isScraping,
  dataSources = 0,
}: LiveCommandBarProps) {
  const savingsDisplay = useCountUp(savingsTotal, 800, visible);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 24 }}
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-3xl"
        >
          <div className="glass-elevated rounded-2xl px-4 py-3 border border-rook-400/20 shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
            <div className="flex items-center gap-2 mb-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rook-400 opacity-60" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rook-400" />
              </span>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-rook-300">
                Live command center
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Metric
                icon={Bot}
                label="Agents"
                value={`${agentsComplete}/${totalAgents}`}
                sub={agentsActive > 0 ? "1 running" : "standby"}
                accent="#6366f1"
              />
              <Metric
                icon={ListOrdered}
                label="Step"
                value={activeWave != null ? `${activeWave} / 9` : "—"}
                sub={isScraping ? "Web scraping" : "Next agent"}
                accent="#d4a853"
              />
              <Metric
                icon={DollarSign}
                label="Savings"
                value={`$${savingsDisplay.toLocaleString()}`}
                sub="discovered"
                accent="#10b981"
              />
              <Metric
                icon={Radio}
                label="Sources"
                value={dataSources > 0 ? `${dataSources}` : "…"}
                sub="live feeds"
                accent="#06b6d4"
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: typeof Bot;
  label: string;
  value: string;
  sub: string;
  accent: string;
}) {
  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border border-white/10"
        style={{ backgroundColor: `${accent}18` }}
      >
        <Icon className="w-3.5 h-3.5" style={{ color: accent }} strokeWidth={2} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] text-white/35 uppercase tracking-wide">{label}</p>
        <p className="text-sm font-semibold text-white truncate">{value}</p>
        <p className="text-[10px] text-white/30 truncate">{sub}</p>
      </div>
    </div>
  );
}
