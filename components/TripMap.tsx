"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { ItineraryStop, TripRoute } from "@/lib/types";
import { STOP_COLORS, STOP_ICONS } from "@/lib/locations";
import type { Map as LeafletMap, Marker, Polyline } from "leaflet";
import { motion } from "framer-motion";
import { Satellite, Play, Pause, SkipForward } from "lucide-react";

interface TripMapProps {
  route: TripRoute;
  selectedDay: number;
  activeStopIndex: number;
  onStopSelect: (index: number) => void;
  stops: ItineraryStop[];
}

export default function TripMap({
  route,
  selectedDay,
  activeStopIndex,
  onStopSelect,
  stops,
}: TripMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<LeafletMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const polylineRef = useRef<Polyline | null>(null);
  const glowPolylineRef = useRef<Polyline | null>(null);
  const travelerRef = useRef<Marker | null>(null);
  const onStopSelectRef = useRef(onStopSelect);
  const [mapReady, setMapReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  onStopSelectRef.current = onStopSelect;

  const center = route.center ?? { lat: 40.758, lng: -73.9855 };
  const zoom = route.zoom ?? 13;

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    let cancelled = false;

    import("leaflet").then((L) => {
      if (cancelled || !mapRef.current) return;

      const map = L.map(mapRef.current, {
        center: [center.lat, center.lng],
        zoom,
        zoomControl: true,
      });

      L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        {
          attribution: "Tiles © Esri",
          maxZoom: 19,
        }
      ).addTo(map);

      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png",
        {
          subdomains: "abcd",
          maxZoom: 19,
          opacity: 0.85,
        }
      ).addTo(map);

      mapInstance.current = map;
      setTimeout(() => map.invalidateSize(), 100);
      setMapReady(true);
    });

    return () => {
      cancelled = true;
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      polylineRef.current?.remove();
      glowPolylineRef.current?.remove();
      travelerRef.current?.remove();
      mapInstance.current?.remove();
      mapInstance.current = null;
      setMapReady(false);
    };
  }, [center.lat, center.lng, zoom]);

  useEffect(() => {
    if (!mapReady || !mapInstance.current || stops.length === 0) return;

    import("leaflet").then((L) => {
      const map = mapInstance.current!;

      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      polylineRef.current?.remove();
      glowPolylineRef.current?.remove();
      travelerRef.current?.remove();

      const latlngs = stops.map((s) => [s.lat, s.lng] as [number, number]);

      if (latlngs.length > 1) {
        glowPolylineRef.current = L.polyline(latlngs, {
          color: "#5eead4",
          weight: 8,
          opacity: 0.25,
        }).addTo(map);

        polylineRef.current = L.polyline(latlngs, {
          color: "#14b8a6",
          weight: 4,
          opacity: 0.85,
          dashArray: "8, 12",
          lineCap: "round",
        }).addTo(map);
      }

      stops.forEach((stop, idx) => {
        const color = STOP_COLORS[stop.category] ?? "#14b8a6";
        const icon = L.divIcon({
          className: "custom-marker",
          html: `<div style="
            width: 32px; height: 32px;
            background: ${color};
            border: 3px solid white;
            border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            font-size: 14px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.4);
            pointer-events: auto;
            cursor: pointer;
          ">${STOP_ICONS[stop.category] ?? "📍"}</div>`,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });

        const marker = L.marker([stop.lat, stop.lng], { icon })
          .addTo(map)
          .bindPopup(
            `<strong>${stop.time} — ${stop.title}</strong><br/>
            ${stop.description}<br/>
            ${stop.cost > 0 ? `<b>$${stop.cost}</b>` : "Free"}`
          );

        marker.on("click", () => onStopSelectRef.current(idx));
        markersRef.current.push(marker);
      });

      const active = stops[activeStopIndex];
      if (active) {
        const travelerIcon = L.divIcon({
          className: "traveler-marker",
          html: `<div class="traveler-pulse" style="
            width: 20px; height: 20px;
            background: #14b8a6;
            border: 3px solid white;
            border-radius: 50%;
            pointer-events: none;
          "></div>`,
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        });

        travelerRef.current = L.marker([active.lat, active.lng], {
          icon: travelerIcon,
          zIndexOffset: 1000,
          interactive: false,
        }).addTo(map);
      }

      if (latlngs.length > 0) {
        map.fitBounds(L.latLngBounds(latlngs), { padding: [50, 50], maxZoom: 15 });
      }
    });
  }, [mapReady, stops, activeStopIndex]);

  useEffect(() => {
    if (!isPlaying || stops.length === 0) return;
    const interval = setInterval(() => {
      const next = (activeStopIndex + 1) % stops.length;
      onStopSelectRef.current(next);
    }, 2500);
    return () => clearInterval(interval);
  }, [isPlaying, activeStopIndex, stops.length]);

  const handleNext = useCallback(() => {
    if (stops.length > 0) {
      onStopSelectRef.current((activeStopIndex + 1) % stops.length);
    }
  }, [activeStopIndex, stops.length]);

  return (
    <div className="trip-map-shell relative rounded-2xl overflow-hidden border border-white/10 isolate z-0">
      <div className="absolute top-3 left-3 z-[10] flex items-center gap-2 pointer-events-none">
        <div className="glass px-3 py-1.5 rounded-lg flex items-center gap-2 text-xs text-white/80 pointer-events-auto">
          <Satellite className="w-3.5 h-3.5 text-brand-400" />
          Satellite View · Day {selectedDay}
        </div>
      </div>

      <div className="absolute top-3 right-3 z-[10] flex items-center gap-1">
        <button
          type="button"
          onClick={() => setIsPlaying((p) => !p)}
          className="glass p-2 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          title={isPlaying ? "Pause tour" : "Play tour"}
        >
          {isPlaying ? (
            <Pause className="w-4 h-4 text-white/80" />
          ) : (
            <Play className="w-4 h-4 text-white/80" />
          )}
        </button>
        <button
          type="button"
          onClick={handleNext}
          className="glass p-2 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          title="Next stop"
        >
          <SkipForward className="w-4 h-4 text-white/80" />
        </button>
      </div>

      <div
        ref={mapRef}
        className="w-full h-[420px] sm:h-[480px] bg-slate-900 relative z-0"
      />

      {stops[activeStopIndex] && (
        <motion.div
          key={activeStopIndex}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute bottom-3 left-3 right-3 z-[10] pointer-events-none"
        >
          <div className="glass rounded-xl p-3 flex items-center gap-3 pointer-events-auto">
            <span className="text-2xl">
              {STOP_ICONS[stops[activeStopIndex].category]}
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-white truncate">
                {stops[activeStopIndex].title}
              </div>
              <div className="text-xs text-white/50">
                Stop {activeStopIndex + 1} of {stops.length}
              </div>
            </div>
            <div className="text-xs text-brand-400 font-medium shrink-0">
              {stops[activeStopIndex].time}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
