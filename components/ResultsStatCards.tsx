"use client";

import { motion } from "framer-motion";
import { OptimizationResult } from "@/lib/types";
import { useCountUp } from "./useCountUp";
import { Bot, DollarSign, MapPin, ShieldCheck } from "lucide-react";

interface ResultsStatCardsProps {
  result: OptimizationResult;
}

export default function ResultsStatCards({ result }: ResultsStatCardsProps) {
  const bestPlan = [...result.plans].sort(
    (a, b) => a.totalOptimizedCost - b.totalOptimizedCost
  )[0];
  const verifiedTotal =
    bestPlan?.costAudit?.verifiedTotal ?? bestPlan?.totalOptimizedCost ?? 0;
  const savings = result.totalSavingsAcrossAgents;
  const verifyLinks = result.plans.reduce(
    (n, p) => n + p.opportunities.filter((o) => o.verifyUrl).length,
    0
  );

  const priceDisplay = useCountUp(verifiedTotal, 1400, true);
  const savingsDisplay = useCountUp(savings, 1400, true);

  const cards = [
    {
      icon: DollarSign,
      label: "Best verified price",
      value: `$${priceDisplay.toLocaleString()}`,
      sub: bestPlan ? `${bestPlan.title}` : "Lowest plan",
      color: "#d4a853",
    },
    {
      icon: ShieldCheck,
      label: "Total savings",
      value: savings > 0 ? `$${savingsDisplay.toLocaleString()}` : "—",
      sub: savings > 0 ? "Across all categories" : "No discounts applied",
      color: "#10b981",
    },
    {
      icon: Bot,
      label: "Agents deployed",
      value: "9",
      sub: "Sequential pipeline",
      color: "#6366f1",
    },
    {
      icon: MapPin,
      label: "Destination",
      value: result.request.destination,
      sub: `${result.request.duration ?? 5} days · ${result.request.groupSize} travelers`,
      color: "#06b6d4",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, staggerChildren: 0.08 }}
      className="grid grid-cols-2 lg:grid-cols-4 gap-3"
    >
      {cards.map((card, i) => {
        const Icon = card.icon;
        return (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: i * 0.08, duration: 0.4 }}
            className="section-shell p-4 relative overflow-hidden group hover:border-white/15 transition-colors"
          >
            <div
              className="absolute -top-6 -right-6 w-20 h-20 rounded-full opacity-20 blur-2xl transition-opacity group-hover:opacity-30"
              style={{ backgroundColor: card.color }}
            />
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center mb-3 border border-white/10"
              style={{ backgroundColor: `${card.color}18` }}
            >
              <Icon className="w-4 h-4" style={{ color: card.color }} strokeWidth={2} />
            </div>
            <p className="text-[10px] uppercase tracking-wider text-white/35">{card.label}</p>
            <p className="text-xl font-semibold text-white mt-0.5 truncate capitalize">
              {card.value}
            </p>
            <p className="text-[11px] text-white/40 mt-1 truncate">{card.sub}</p>
          </motion.div>
        );
      })}

      {verifyLinks > 0 && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="col-span-2 lg:col-span-4 text-center text-xs text-white/35"
        >
          {verifyLinks} deep verify links included — click any deal to confirm pricing
        </motion.p>
      )}
    </motion.div>
  );
}
