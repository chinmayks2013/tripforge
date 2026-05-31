"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { ItineraryStop, TripRoute } from "@/lib/types";
import { STOP_COLORS, STOP_ICONS } from "@/lib/locations";
import { motion } from "framer-motion";
import { Satellite, Play, Pause, SkipForward, MapPin } from "lucide-react";
import { UserLocation } from "@/lib/types";

interface StaticRouteMapProps {
  route: TripRoute;
  selectedDay: number;
  activeStopIndex: number;
  onStopSelect: (index: number) => void;
  stops: ItineraryStop[];
  userLocation?: UserLocation | null;
}

function projectStop(
  lat: number,
  lng: number,
  bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number }
) {
  const pad = 0.08;
  const latRange = bounds.maxLat - bounds.minLat || 0.01;
  const lngRange = bounds.maxLng - bounds.minLng || 0.01;
  const x =
    pad * 100 +
    ((lng - bounds.minLng) / lngRange) * (100 - 2 * pad * 100);
  const y =
    pad * 100 +
    ((bounds.maxLat - lat) / latRange) * (100 - 2 * pad * 100);
  return { x: Math.min(95, Math.max(5, x)), y: Math.min(95, Math.max(5, y)) };
}

export default function StaticRouteMap({
  route,
  selectedDay,
  activeStopIndex,
  onStopSelect,
  stops,
  userLocation,
}: StaticRouteMapProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [mapImage, setMapImage] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const allLats = stops.map((s) => s.lat);
  const allLngs = stops.map((s) => s.lng);
  if (userLocation) {
    allLats.push(userLocation.lat);
    allLngs.push(userLocation.lng);
  }
  const bounds = {
    minLat: Math.min(...allLats) - 0.02,
    maxLat: Math.max(...allLats) + 0.02,
    minLng: Math.min(...allLngs) - 0.02,
    maxLng: Math.max(...allLngs) + 0.02,
  };

  useEffect(() => {
    const bbox = `${bounds.minLng},${bounds.minLat},${bounds.maxLng},${bounds.maxLat}`;
    const url = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?bbox=${bbox}&bboxSR=4326&size=800,480&format=png&f=image`;
    setMapImage(url);
  }, [bounds.minLat, bounds.maxLat, bounds.minLng, bounds.maxLng]);

  useEffect(() => {
    if (!isPlaying || stops.length === 0) return;
    const t = setInterval(() => {
      onStopSelect((activeStopIndex + 1) % stops.length);
    }, 2500);
    return () => clearInterval(t);
  }, [isPlaying, activeStopIndex, stops.length, onStopSelect]);

  const points = stops.map((s) => projectStop(s.lat, s.lng, bounds));
  const polyline = points.map((p) => `${p.x},${p.y}`).join(" ");

  const originPoint = userLocation
    ? projectStop(userLocation.lat, userLocation.lng, bounds)
    : null;

  return (
    <div
      ref={containerRef}
      className="relative rounded-2xl overflow-hidden border border-white/10 bg-slate-900 isolate"
      style={{ height: 420 }}
    >
      {/* Satellite background — no interactive map library */}
      {mapImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={mapImage}
          alt="Satellite view"
          className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
          draggable={false}
        />
      )}
      <div className="absolute inset-0 bg-slate-900/20 pointer-events-none" />

      {/* Route SVG — pointer-events-none except stop buttons below */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        {points.length > 1 && (
          <>
            <polyline
              points={polyline}
              fill="none"
              stroke="#5eead4"
              strokeWidth="0.8"
              strokeOpacity="0.4"
              vectorEffect="non-scaling-stroke"
            />
            <polyline
              points={polyline}
              fill="none"
              stroke="#14b8a6"
              strokeWidth="0.4"
              strokeDasharray="2,2"
              vectorEffect="non-scaling-stroke"
            />
          </>
        )}
        {originPoint && (
          <circle
            cx={originPoint.x}
            cy={originPoint.y}
            r="1.2"
            fill="#6366f1"
            stroke="white"
            strokeWidth="0.3"
          />
        )}
      </svg>

      {/* Clickable stop markers */}
      {stops.map((stop, idx) => {
        const { x, y } = points[idx];
        const color = STOP_COLORS[stop.category] ?? "#14b8a6";
        const isActive = idx === activeStopIndex;
        return (
          <button
            key={stop.id}
            type="button"
            onClick={() => onStopSelect(idx)}
            className="absolute z-10 -translate-x-1/2 -translate-y-1/2 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-brand-400 rounded-full"
            style={{
              left: `${x}%`,
              top: `${y}%`,
              transform: `translate(-50%, -50%) scale(${isActive ? 1.25 : 1})`,
            }}
            title={stop.title}
          >
            <span
              className="flex w-8 h-8 items-center justify-center rounded-full border-2 border-white text-sm shadow-lg"
              style={{ background: color }}
            >
              {STOP_ICONS[stop.category] ?? "📍"}
            </span>
          </button>
        );
      })}

      {/* Controls — above map, always clickable */}
      <div className="absolute top-3 left-3 z-20 pointer-events-none">
        <div className="glass px-3 py-1.5 rounded-lg flex items-center gap-2 text-xs text-white/80 pointer-events-auto">
          <Satellite className="w-3.5 h-3.5 text-brand-400" />
          Satellite · Day {selectedDay}
        </div>
      </div>

      <div className="absolute top-3 right-3 z-20 flex gap-1">
        <button
          type="button"
          onClick={() => setIsPlaying((p) => !p)}
          className="glass p-2 rounded-lg hover:bg-white/10 cursor-pointer z-20"
        >
          {isPlaying ? (
            <Pause className="w-4 h-4 text-white/80" />
          ) : (
            <Play className="w-4 h-4 text-white/80" />
          )}
        </button>
        <button
          type="button"
          onClick={() => onStopSelect((activeStopIndex + 1) % stops.length)}
          className="glass p-2 rounded-lg hover:bg-white/10 cursor-pointer z-20"
        >
          <SkipForward className="w-4 h-4 text-white/80" />
        </button>
      </div>

      {originPoint && userLocation && (
        <div
          className="absolute z-10 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          style={{ left: `${originPoint.x}%`, top: `${originPoint.y}%` }}
        >
          <span className="flex items-center gap-1 text-[10px] bg-indigo-600/90 text-white px-1.5 py-0.5 rounded-full whitespace-nowrap -mt-10">
            <MapPin className="w-2.5 h-2.5" /> You · {userLocation.city}
          </span>
        </div>
      )}

      {stops[activeStopIndex] && (
        <motion.div
          key={activeStopIndex}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute bottom-3 left-3 right-3 z-20 pointer-events-none"
        >
          <div className="glass rounded-xl p-3 flex items-center gap-3 pointer-events-auto">
            <span className="text-xl">{STOP_ICONS[stops[activeStopIndex].category]}</span>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-white truncate">
                {stops[activeStopIndex].title}
              </div>
              <div className="text-xs text-white/50">
                Stop {activeStopIndex + 1} of {stops.length}
              </div>
            </div>
            <span className="text-xs text-brand-400">{stops[activeStopIndex].time}</span>
          </div>
        </motion.div>
      )}
    </div>
  );
}
