"use client";

import { HiddenOpportunity, AGENT_META, AgentId } from "@/lib/types";
import { motion } from "framer-motion";
import { ExternalLink, ShieldCheck } from "lucide-react";

interface OpportunitiesPanelProps {
  opportunities: HiddenOpportunity[];
}

function VerifyLinkButton({
  url,
  label,
  variant = "applied",
}: {
  url: string;
  label: string;
  variant?: "applied" | "muted";
}) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={
        variant === "applied"
          ? "inline-flex items-center gap-1 text-[10px] text-rook-400/90 hover:text-rook-300 mt-1.5 transition-colors"
          : "inline-flex items-center gap-1 text-[10px] text-white/35 hover:text-white/55 mt-1.5 transition-colors"
      }
      onClick={(e) => e.stopPropagation()}
    >
      <ExternalLink className="w-3 h-3 shrink-0" />
      {label}
    </a>
  );
}

export default function OpportunitiesPanel({
  opportunities,
}: OpportunitiesPanelProps) {
  const applied = opportunities.filter((o) => o.applied);
  const available = opportunities.filter((o) => !o.applied);
  const totalSavings = applied.reduce((s, o) => s + o.savings, 0);
  const withLinks = opportunities.filter((o) => o.verifyUrl).length;

  return (
    <div className="glass-elevated rounded-2xl p-5">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-semibold text-white/90">
          Deals & Perks
        </h3>
        <span className="text-xs text-emerald-400 font-medium">
          ${totalSavings.toLocaleString()} unlocked
        </span>
      </div>
      <p className="text-xs text-white/40 mb-1">
        Each link opens the exact pass, promo, or filtered search — not a generic homepage.
      </p>
      {withLinks > 0 && (
        <p className="text-[10px] text-white/30 mb-4 flex items-center gap-1">
          <ShieldCheck className="w-3 h-3 text-rook-400/70" />
          {withLinks} verify link{withLinks !== 1 ? "s" : ""} below
        </p>
      )}

      <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
        {applied.map((opp, idx) => {
          const meta = AGENT_META[opp.agentId as AgentId];
          return (
            <motion.div
              key={opp.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="flex items-start gap-3 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20"
            >
              <span className="text-base shrink-0">{meta?.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-white/90">
                    {opp.title}
                  </span>
                  <span className="text-xs font-bold text-emerald-400 shrink-0">
                    −${opp.savings}
                  </span>
                </div>
                <p className="text-[10px] text-white/40 mt-0.5">
                  {opp.description}
                </p>
                {opp.verifyUrl && (
                  <VerifyLinkButton
                    url={opp.verifyUrl}
                    label={opp.verifyLabel ?? "Open this deal"}
                  />
                )}
              </div>
            </motion.div>
          );
        })}

        {available.map((opp) => {
          const meta = AGENT_META[opp.agentId as AgentId];
          return (
            <div
              key={opp.id}
              className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5 opacity-70"
            >
              <span className="text-base shrink-0 grayscale">{meta?.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-white/60">
                    {opp.title}
                  </span>
                  <span className="text-xs text-white/30 shrink-0">
                    +${opp.savings} potential
                  </span>
                </div>
                <p className="text-[10px] text-white/30 mt-0.5">
                  {opp.description}
                </p>
                {opp.verifyUrl && (
                  <VerifyLinkButton
                    url={opp.verifyUrl}
                    label={opp.verifyLabel ?? "Check eligibility"}
                    variant="muted"
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
