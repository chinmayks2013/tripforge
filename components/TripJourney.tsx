"use client";

import { useState, useMemo } from "react";
import { TripRoute } from "@/lib/types";
import StaticRouteMap from "./StaticRouteMap";
import { UserLocation } from "@/lib/types";
import ItineraryTimeline from "./ItineraryTimeline";
import clsx from "clsx";
import { Map, Route } from "lucide-react";

interface TripJourneyProps {
  route: TripRoute;
  userLocation?: UserLocation | null;
}

export default function TripJourney({ route, userLocation }: TripJourneyProps) {
  const [selectedDay, setSelectedDay] = useState(1);
  const [activeStopIndex, setActiveStopIndex] = useState(0);

  const currentDay = route.days.find((d) => d.day === selectedDay) ?? route.days[0];

  const dayStops = useMemo(() => currentDay?.stops ?? [], [currentDay]);

  const handleDayChange = (day: number) => {
    setSelectedDay(day);
    setActiveStopIndex(0);
  };

  if (!currentDay) return null;

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-xl font-bold text-white flex items-center justify-center gap-2">
          <Route className="w-5 h-5 text-brand-400" />
          Your Journey — {route.destination}
        </h2>
        <p className="text-sm text-white/40 mt-1">
          {route.totalDays} days · {route.totalStops} stops · {route.totalDistanceMi} mi total
          {route.origin && ` · from ${route.origin}`}
        </p>
      </div>

      {/* Day tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 justify-center">
        {route.days.map((d) => (
          <button
            key={d.day}
            onClick={() => handleDayChange(d.day)}
            className={clsx(
              "px-4 py-2 rounded-xl text-sm font-medium transition-all shrink-0 border",
              selectedDay === d.day
                ? "bg-brand-600/20 border-brand-500/50 text-brand-300"
                : "border-white/10 text-white/50 hover:border-white/20 hover:text-white/70"
            )}
          >
            <span className="block">Day {d.day}</span>
            <span className="text-[10px] opacity-60">{d.weather.icon} {d.weather.highF}°</span>
          </button>
        ))}
      </div>

      {/* Map + Timeline grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-white/50 px-1">
            <Map className="w-3.5 h-3.5" />
            Live satellite route · click stops or press play to tour
          </div>
          <StaticRouteMap
            route={route}
            selectedDay={selectedDay}
            activeStopIndex={activeStopIndex}
            onStopSelect={setActiveStopIndex}
            stops={dayStops}
            userLocation={userLocation}
          />
        </div>

        <ItineraryTimeline
          day={currentDay}
          activeStopIndex={activeStopIndex}
          onStopSelect={setActiveStopIndex}
        />
      </div>
    </div>
  );
}
