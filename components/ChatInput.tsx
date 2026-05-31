"use client";

import { useState } from "react";
import { Send, Sparkles } from "lucide-react";

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim() && !isLoading) {
      onSubmit(query.trim());
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      <form onSubmit={handleSubmit} className="relative">
        <div className="glass rounded-2xl p-1 agent-glow">
          <div className="flex items-center gap-3 px-4 py-3">
            <Sparkles className="w-5 h-5 text-brand-400 shrink-0" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Describe your trip in plain English — we'll figure out the rest..."
              className="flex-1 bg-transparent text-white placeholder:text-white/40 outline-none text-base"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!query.trim() || isLoading}
              className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl text-white font-medium transition-all"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Optimizing
                </span>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Plan Trip
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      <div className="mt-4 flex flex-wrap gap-2 justify-center">
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            onClick={() => setQuery(ex)}
            disabled={isLoading}
            className="text-xs px-3 py-1.5 rounded-full glass text-white/60 hover:text-white/90 hover:bg-white/10 transition-all disabled:opacity-40"
          >
            {ex}
          </button>
        ))}
      </div>
    </div>
  );
}
