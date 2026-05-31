"use client";

import { ScrapedTripData } from "@/lib/types";
import { Globe, Cloud, BookOpen, Ruler } from "lucide-react";

interface ScrapeFeedProps {
  data: ScrapedTripData | null;
  isLoading?: boolean;
}

export default function ScrapeFeed({ data, isLoading }: ScrapeFeedProps) {
  if (!data && !isLoading) return null;

  return (
    <div className="glass rounded-2xl p-4 border border-cyan-500/20">
      <div className="flex items-center gap-2 mb-3">
        <Globe className="w-4 h-4 text-cyan-400" />
        <h3 className="text-sm font-semibold text-white/90">
          Live web scrape + AI extraction
        </h3>
        {isLoading && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 animate-pulse">
            Scraping…
          </span>
        )}
      </div>

      {data && (
        <div className="space-y-2 text-xs">
          {data.originCity && (
            <div className="flex items-start gap-2 text-white/60">
              <Ruler className="w-3.5 h-3.5 shrink-0 mt-0.5 text-indigo-400" />
              <span>
                Origin: <span className="text-white/90">{data.originCity}</span>
                {data.distanceMiles != null && (
                  <> → {data.destinationDisplay} ({data.distanceMiles.toLocaleString()} mi)</>
                )}
              </span>
            </div>
          )}
          {data.weather && (
            <div className="flex items-start gap-2 text-white/60">
              <Cloud className="w-3.5 h-3.5 shrink-0 mt-0.5 text-sky-400" />
              <span>
                Live weather at destination:{" "}
                <span className="text-white/90">
                  {data.weather.tempF}°F · {data.weather.condition}
                </span>
                <span className="text-white/40"> (Open-Meteo)</span>
              </span>
            </div>
          )}
          {data.wikipediaSummary && (
            <div className="flex items-start gap-2 text-white/60">
              <BookOpen className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-400" />
              <span className="line-clamp-2">{data.wikipediaSummary}</span>
            </div>
          )}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {data.sources.map((s) => (
              <span
                key={s.name}
                className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-white/40"
              >
                {s.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
