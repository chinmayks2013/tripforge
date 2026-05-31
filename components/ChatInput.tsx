"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Plane, Users, Wallet, MapPin } from "lucide-react";
import clsx from "clsx";

const EXAMPLES = [
  {
    text: "Trip to Paris for 2 people next month",
    icon: Plane,
    tag: "Popular",
  },
  {
    text: "Family of 4 to Tokyo for a week, budget under $5000",
    icon: Users,
    tag: "Family",
  },
  {
    text: "Weekend in Boston, solo, love museums and food",
    icon: MapPin,
    tag: "Weekend",
  },
  {
    text: "Group of 6 to Barcelona, we have AAA membership",
    icon: Wallet,
    tag: "Group",
  },
];

interface ChatInputProps {
  onSubmit: (query: string) => void;
  isLoading: boolean;
}

export default function ChatInput({ onSubmit, isLoading }: ChatInputProps) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim() && !isLoading) {
      onSubmit(query.trim());
    }
  };

  const pickExample = (text: string) => {
    if (isLoading) return;
    setQuery(text);
    onSubmit(text);
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      <form onSubmit={handleSubmit} className="relative">
        <motion.div
          className={clsx(
            "glass-elevated rounded-2xl p-1 transition-all duration-300",
            focused && "agent-glow border-rook-400/25"
          )}
          animate={focused ? { scale: 1.005 } : { scale: 1 }}
        >
          <div className="flex items-center gap-3 px-4 py-3.5">
            <div className="w-9 h-9 rounded-xl bg-rook-500/15 border border-rook-400/20 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-rook-400" />
            </div>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="Where do you want to go? Describe your trip in plain English…"
              className="flex-1 bg-transparent text-white placeholder:text-white/35 outline-none text-base"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!query.trim() || isLoading}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-rook-500 to-rook-600 hover:from-rook-400 hover:to-rook-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl text-white font-semibold text-sm transition-all shadow-rook"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Planning…
                </span>
              ) : (
                <>
                  Plan trip
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </motion.div>
      </form>

      <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-2">
        {EXAMPLES.map((ex) => {
          const Icon = ex.icon;
          return (
            <button
              key={ex.text}
              type="button"
              onClick={() => pickExample(ex.text)}
              disabled={isLoading}
              className="group text-left glass rounded-xl px-4 py-3 interactive-card disabled:opacity-40 disabled:pointer-events-none"
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0 group-hover:border-rook-400/30 group-hover:bg-rook-500/10 transition-colors">
                  <Icon className="w-3.5 h-3.5 text-white/50 group-hover:text-rook-400 transition-colors" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] uppercase tracking-wider text-rook-400/80 font-semibold">
                    {ex.tag}
                  </span>
                  <p className="text-xs text-white/60 group-hover:text-white/85 mt-0.5 line-clamp-2 transition-colors">
                    {ex.text}
                  </p>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-white/20 group-hover:text-rook-400 group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
