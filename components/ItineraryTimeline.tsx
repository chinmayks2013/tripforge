"use client";

import { motion } from "framer-motion";
import { ItineraryDay, ItineraryStop } from "@/lib/types";
import { STOP_ICONS, STOP_COLORS } from "@/lib/locations";
import clsx from "clsx";
import {
  Cloud,
  Droplets,
  Wind,
  Sun,
  Navigation,
  Clock,
  DollarSign,
  Fuel,
  ChevronRight,
} from "lucide-react";

interface ItineraryTimelineProps {
  day: ItineraryDay;
  activeStopIndex: number;
  onStopSelect: (index: number) => void;
}

const TRANSPORT_ICONS: Record<string, string> = {
  walk: "🚶",
  drive: "🚗",
  transit: "🚇",
  rideshare: "🚕",
};

function StopCard({
  stop,
  index,
  isActive,
  isLast,
  onSelect,
}: {
  stop: ItineraryStop;
  index: number;
  isActive: boolean;
  isLast: boolean;
  onSelect: () => void;
}) {
  const color = STOP_COLORS[stop.category] ?? "#14b8a6";

  return (
    <div className="relative flex gap-4">
      {!isLast && (
        <div
          className="absolute left-[19px] top-10 bottom-0 w-0.5"
          style={{ background: `linear-gradient(to bottom, ${color}66, ${color}22)` }}
        />
      )}

      <button
        onClick={onSelect}
        className={clsx(
          "relative z-10 w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all border-2",
          isActive
            ? "border-brand-400 scale-110 shadow-lg shadow-brand-500/30"
            : "border-white/20 hover:border-white/40"
        )}
        style={{ background: isActive ? color : `${color}44` }}
      >
        <span className="text-sm">{STOP_ICONS[stop.category] ?? "📍"}</span>
      </button>

      <motion.div
        layout
        onClick={onSelect}
        className={clsx(
          "flex-1 mb-4 rounded-xl p-4 cursor-pointer transition-all border",
          isActive
            ? "border-brand-500/40 bg-brand-500/10"
            : "border-white/5 bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.04]"
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-brand-400">{stop.time}</span>
              {stop.category === "gas" && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-500/20 text-slate-300 flex items-center gap-1">
                  <Fuel className="w-2.5 h-2.5" /> Gas Stop
                </span>
              )}
              {stop.category === "rest" && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300">
                  Rest Stop
                </span>
              )}
              {stop.category === "perk" && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                  🎫 Pass / Perk
                </span>
              )}
            </div>
            <h4 className="text-sm font-semibold text-white mt-0.5">{stop.title}</h4>
            <p className="text-xs text-white/50 mt-1">{stop.description}</p>
          </div>
          {stop.cost > 0 && (
            <span className="text-sm font-medium text-white/80 shrink-0">
              {stop.originalCost != null && stop.originalCost > stop.cost && (
                <span className="text-white/40 line-through mr-1.5 text-xs">
                  ${stop.originalCost}
                </span>
              )}
              ${stop.cost}
            </span>
          )}
          {stop.cost === 0 && stop.category !== "attraction" && (
            <span className="text-xs text-emerald-400 shrink-0">Free</span>
          )}
        </div>

        <div className="flex flex-wrap gap-3 mt-3 text-[10px] text-white/40">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {stop.durationMin} min
          </span>
          {stop.distanceMi != null && stop.distanceMi > 0 && (
            <span className="flex items-center gap-1">
              <Navigation className="w-3 h-3" />
              {stop.distanceMi} mi
              {stop.travelMin != null && ` · ${stop.travelMin} min`}
              {stop.transportMode && (
                <span className="ml-0.5">{TRANSPORT_ICONS[stop.transportMode]}</span>
              )}
            </span>
          )}
          {stop.cost === 0 && stop.category === "attraction" && (
            <span className="text-emerald-400">Free entry</span>
          )}
        </div>

        {stop.perks && stop.perks.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {stop.perks.map((p) => (
              <span
                key={p.title}
                className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
              >
                ✓ {p.title} · save ${p.savings}
              </span>
            ))}
          </div>
        )}

        {stop.tips && isActive && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="text-[10px] text-brand-300/80 mt-2 pt-2 border-t border-white/5"
          >
            💡 {stop.tips}
          </motion.p>
        )}
      </motion.div>
    </div>
  );
}

function WeatherCard({ weather }: { weather: ItineraryDay["weather"] }) {
  return (
    <div className="glass rounded-xl p-4 mb-4 border border-white/10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{weather.icon}</span>
          <div>
            <div className="text-sm font-semibold text-white">{weather.condition}</div>
            <div className="text-xs text-white/50">{weather.dayLabel}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-white">
            {weather.highF}°
            <span className="text-sm text-white/40 font-normal"> / {weather.lowF}°F</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 mt-3 pt-3 border-t border-white/5">
        <div className="text-center">
          <Droplets className="w-3.5 h-3.5 text-blue-400 mx-auto mb-0.5" />
          <div className="text-[10px] text-white/40">Humidity</div>
          <div className="text-xs text-white/80">{weather.humidity}%</div>
        </div>
        <div className="text-center">
          <Wind className="w-3.5 h-3.5 text-cyan-400 mx-auto mb-0.5" />
          <div className="text-[10px] text-white/40">Wind</div>
          <div className="text-xs text-white/80">{weather.windMph} mph</div>
        </div>
        <div className="text-center">
          <Cloud className="w-3.5 h-3.5 text-slate-400 mx-auto mb-0.5" />
          <div className="text-[10px] text-white/40">Rain</div>
          <div className="text-xs text-white/80">{weather.precipitation}%</div>
        </div>
        <div className="text-center">
          <Sun className="w-3.5 h-3.5 text-amber-400 mx-auto mb-0.5" />
          <div className="text-[10px] text-white/40">UV</div>
          <div className="text-xs text-white/80">{weather.uvIndex}</div>
        </div>
      </div>

      <p className="text-[10px] text-amber-300/70 mt-2 flex items-center gap-1">
        <ChevronRight className="w-3 h-3" />
        {weather.packingTip}
      </p>
    </div>
  );
}

export default function ItineraryTimeline({
  day,
  activeStopIndex,
  onStopSelect,
}: ItineraryTimelineProps) {
  const gasStops = day.stops.filter((s) => s.category === "gas").length;
  const restStops = day.stops.filter((s) => s.category === "rest").length;
  const perkStops = day.stops.filter((s) => s.category === "perk" || (s.perks?.length ?? 0) > 0).length;
  const perkSavings = day.stops.reduce(
    (s, st) => s + (st.perks?.reduce((ps, p) => ps + p.savings, 0) ?? 0),
    0
  );

  return (
    <div className="glass rounded-2xl p-5 h-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-white/90">
            Step-by-Step Itinerary
          </h3>
          <p className="text-xs text-white/40 mt-0.5">
            Day {day.day} · {day.stops.length} stops · {day.totalDistanceMi} mi
          </p>
        </div>
        <div className="text-right text-xs">
          <div className="flex items-center gap-1 text-white/60">
            <DollarSign className="w-3 h-3" />
            ${day.totalCost} today
          </div>
          {(gasStops > 0 || restStops > 0 || perkStops > 0) && (
            <div className="text-white/40 mt-0.5">
              {gasStops > 0 && `⛽ ${gasStops} gas`}
              {gasStops > 0 && (restStops > 0 || perkStops > 0) && " · "}
              {restStops > 0 && `🛑 ${restStops} rest`}
              {restStops > 0 && perkStops > 0 && " · "}
              {perkStops > 0 && `🎫 ${perkSavings > 0 ? `$${perkSavings} perks` : "perks"}`}
            </div>
          )}
        </div>
      </div>

      <WeatherCard weather={day.weather} />

      <div className="max-h-[520px] overflow-y-auto pr-1 space-y-0">
        {day.stops.map((stop, idx) => (
          <StopCard
            key={stop.id}
            stop={stop}
            index={idx}
            isActive={idx === activeStopIndex}
            isLast={idx === day.stops.length - 1}
            onSelect={() => onStopSelect(idx)}
          />
        ))}
      </div>
    </div>
  );
}
