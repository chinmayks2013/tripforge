"use client";

import { motion } from "framer-motion";
import { Layers, Route, ShieldCheck, Zap } from "lucide-react";

const FEATURES = [
  {
    icon: Layers,
    title: "Sequential pipeline",
    description: "Live scrape first, then rule-based agents run in strict order.",
    accent: "#6366f1",
  },
  {
    icon: Route,
    title: "Live route research",
    description: "OpenStreetMap routing, weather, and destination data in real time.",
    accent: "#06b6d4",
  },
  {
    icon: ShieldCheck,
    title: "Verified pricing",
    description: "Cost efficiency agent validates totals against realistic floors.",
    accent: "#10b981",
  },
  {
    icon: Zap,
    title: "Three plan tiers",
    description: "Budget, balanced, and luxury styles from one optimization pass.",
    accent: "#d4a853",
  },
];

export default function HeroFeatures() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
      {FEATURES.map((feature, i) => {
        const Icon = feature.icon;
        return (
          <motion.div
            key={feature.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + i * 0.07, duration: 0.4 }}
            className="section-shell p-5 interactive-card cursor-default relative overflow-hidden group"
          >
            <div
              className="absolute top-0 inset-x-0 h-px opacity-60"
              style={{
                background: `linear-gradient(90deg, transparent, ${feature.accent}55, transparent)`,
              }}
            />
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 border border-white/10 transition-transform group-hover:scale-105"
              style={{ backgroundColor: `${feature.accent}14` }}
            >
              <Icon className="w-4 h-4" style={{ color: feature.accent }} strokeWidth={1.75} />
            </div>
            <h3 className="text-sm font-semibold text-white/90">{feature.title}</h3>
            <p className="text-xs text-white/40 mt-1.5 leading-relaxed">
              {feature.description}
            </p>
          </motion.div>
        );
      })}
    </div>
  );
}
