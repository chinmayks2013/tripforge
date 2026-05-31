"use client";

import { useEffect, useState, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ScrapedTripData } from "@/lib/types";
import { Globe, Cloud, BookOpen, Ruler, Loader2, LucideIcon } from "lucide-react";

interface ScrapeFeedProps {
  data: ScrapedTripData | null;
  isLoading?: boolean;
}

type FeedRow = {
  icon: LucideIcon;
  color: string;
  content: ReactNode;
};

function buildRows(data: ScrapedTripData): FeedRow[] {
  const rows: FeedRow[] = [];
  if (data.originCity) {
    rows.push({
      icon: Ruler,
      color: "text-indigo-400",
      content: (
        <>
          Origin: <span className="text-white/90">{data.originCity}</span>
          {data.distanceMiles != null && (
            <> → {data.destinationDisplay} ({data.distanceMiles.toLocaleString()} mi)</>
          )}
        </>
      ),
    });
  }
  if (data.weather) {
    rows.push({
      icon: Cloud,
      color: "text-sky-400",
      content: (
        <>
          Live weather:{" "}
          <span className="text-white/90">
            {data.weather.tempF}°F · {data.weather.condition}
          </span>
          <span className="text-white/40"> (Open-Meteo)</span>
        </>
      ),
    });
  }
  if (data.wikipediaSummary) {
    rows.push({
      icon: BookOpen,
      color: "text-amber-400",
      content: <span className="line-clamp-2">{data.wikipediaSummary}</span>,
    });
  }
  return rows;
}

export default function ScrapeFeed({ data, isLoading }: ScrapeFeedProps) {
  const [revealed, setRevealed] = useState(0);

  useEffect(() => {
    if (!data) {
      setRevealed(0);
      return;
    }
    setRevealed(0);
    const steps = 4;
    let i = 0;
    const timer = setInterval(() => {
      i++;
      setRevealed(i);
      if (i >= steps) clearInterval(timer);
    }, 350);
    return () => clearInterval(timer);
  }, [data]);

  if (!data && !isLoading) return null;

  const rows = data ? buildRows(data) : [];

  return (
    <div className="section-shell p-4 relative overflow-hidden">
      {isLoading && (
        <div className="absolute inset-x-0 top-0 h-0.5 bg-white/5 overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-transparent via-rook-400 to-transparent w-1/3"
            animate={{ x: ["-100%", "400%"] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          />
        </div>
      )}

      <div className="flex items-center gap-2 mb-3">
        <Globe className="w-4 h-4 text-rook-400" />
        <h3 className="text-sm font-medium text-white/90">Flight agent — live research</h3>
        {isLoading && (
          <span className="inline-flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded-full bg-rook-500/15 text-rook-300 border border-rook-400/20">
            <Loader2 className="w-3 h-3 animate-spin" />
            Streaming
          </span>
        )}
      </div>

      <div className="space-y-2 text-xs min-h-[4rem]">
        <AnimatePresence mode="popLayout">
          {isLoading && !data && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-2"
            >
              {[1, 2, 3].map((n) => (
                <div key={n} className="flex gap-2 items-center">
                  <div className="w-3.5 h-3.5 rounded bg-white/5 animate-pulse" />
                  <div
                    className="h-3 rounded bg-white/5 animate-pulse"
                    style={{ width: `${60 + n * 10}%` }}
                  />
                </div>
              ))}
            </motion.div>
          )}

          {rows.map((row, i) => {
            if (i >= revealed) return null;
            const Icon = row.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-start gap-2 text-white/60"
              >
                <Icon className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${row.color}`} />
                <span>{row.content}</span>
              </motion.div>
            );
          })}

          {data && revealed >= rows.length && data.sources.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-wrap gap-1.5 pt-1"
            >
              {data.sources.map((s, i) => (
                <motion.span
                  key={s.name}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300/80 border border-emerald-500/20"
                >
                  ✓ {s.name}
                </motion.span>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
