"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Play, Sparkles, Search } from "lucide-react";
import clsx from "clsx";

const DEMO_QUERY = "Trip to Paris for 2 people next month, budget $4000";

const EXAMPLES = [
  "Trip to Paris for 2 people next month",
  "Family of 4 to Tokyo for a week, budget under $5000",
  "Weekend in Boston, solo, love museums and food",
  "Group of 6 to Barcelona, we have AAA membership",
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
    if (query.trim() && !isLoading) onSubmit(query.trim());
  };

  const pickExample = (text: string) => {
    if (isLoading) return;
    setQuery(text);
    onSubmit(text);
  };

  const runDemo = () => {
    if (isLoading) return;
    setQuery(DEMO_QUERY);
    onSubmit(DEMO_QUERY);
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-4">
      {!isLoading && (
        <motion.button
          type="button"
          onClick={runDemo}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mx-auto flex items-center gap-2 px-4 py-2 rounded-full
            border border-rook-400/25 bg-rook-500/10 text-rook-300
            hover:bg-rook-500/15 hover:border-rook-400/40 transition-all text-xs font-medium"
        >
          <Play className="w-3 h-3 fill-current" />
          Run live demo
          <Sparkles className="w-3 h-3 opacity-60" />
        </motion.button>
      )}

      <form onSubmit={handleSubmit}>
        <div
          className={clsx(
            "glass-elevated rounded-2xl transition-all duration-300",
            focused && "search-glow border-rook-400/25"
          )}
        >
          <div className="flex items-center gap-3 px-5 py-4">
            <div
              className={clsx(
                "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                focused
                  ? "bg-rook-500/15 border border-rook-400/30"
                  : "bg-white/[0.04] border border-white/10"
              )}
            >
              <Search
                className={clsx(
                  "w-4 h-4 transition-colors",
                  focused ? "text-rook-400" : "text-white/35"
                )}
              />
            </div>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="Describe your trip — destination, dates, travelers, budget…"
              className="flex-1 bg-transparent text-white placeholder:text-white/30 outline-none text-sm sm:text-[15px]"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!query.trim() || isLoading}
              className="btn-primary shrink-0"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Optimizing
                </span>
              ) : (
                <>
                  Optimize
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      <div className="flex flex-wrap justify-center gap-2">
        {EXAMPLES.map((text, i) => (
          <motion.button
            key={text}
            type="button"
            onClick={() => pickExample(text)}
            disabled={isLoading}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 + i * 0.05 }}
            className="text-xs px-3 py-1.5 rounded-full border border-white/[0.08]
              bg-white/[0.02] text-white/40 hover:text-white/75 hover:border-white/18
              hover:bg-white/[0.04] transition-all disabled:opacity-40"
          >
            {text}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
