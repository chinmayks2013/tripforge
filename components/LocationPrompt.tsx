"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { MapPin, Loader2, Navigation } from "lucide-react";
import { UserLocation } from "@/lib/types";
import clsx from "clsx";

const STORAGE_KEY = "travelrooks-user-location";
const CACHE_MS = 60 * 60 * 1000; // 1 hour

interface LocationPromptProps {
  location: UserLocation | null;
  onLocation: (loc: UserLocation) => void;
  loading?: boolean;
}

function readCachedLocation(): UserLocation | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const { loc, at } = JSON.parse(raw) as { loc: UserLocation; at: number };
    if (Date.now() - at > CACHE_MS) return null;
    return loc;
  } catch {
    return null;
  }
}

function cacheLocation(loc: UserLocation) {
  try {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ loc, at: Date.now() })
    );
  } catch {
    /* ignore quota */
  }
}

export default function LocationPrompt({
  location,
  onLocation,
  loading,
}: LocationPromptProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const triedAuto = useRef(false);

  const applyCoords = useCallback(
    (lat: number, lng: number, city = "Your location") => {
      const optimistic: UserLocation = { lat, lng, city };
      onLocation(optimistic);
      cacheLocation(optimistic);

      fetch("/api/geocode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat, lng }),
      })
        .then((res) => res.json())
        .then((data) => {
          const resolved: UserLocation = {
            lat,
            lng,
            city: data.city ?? city,
            region: data.region,
            country: data.country,
          };
          onLocation(resolved);
          cacheLocation(resolved);
        })
        .catch(() => {
          /* keep optimistic coords */
        });
    },
    [onLocation]
  );

  const requestLocation = useCallback(
    (fromAuto = false) => {
      if (!navigator.geolocation) {
        if (!fromAuto) {
          setStatus("error");
          setErrorMsg("Geolocation is not supported in this browser.");
        }
        return;
      }

      if (!fromAuto) setStatus("loading");
      setErrorMsg("");

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          applyCoords(pos.coords.latitude, pos.coords.longitude);
          setStatus("idle");
        },
        (err) => {
          if (fromAuto && err.code === 1) return;
          setStatus("error");
          setErrorMsg(
            err.code === 1
              ? "Location permission denied. Enable it in browser settings to plan from your city."
              : "Could not detect location. Try again or type your city in the trip request."
          );
        },
        {
          enableHighAccuracy: false,
          timeout: 5000,
          maximumAge: 600000,
        }
      );
    },
    [applyCoords]
  );

  // Restore cache instantly, then refresh from browser if permission already granted
  useEffect(() => {
    if (triedAuto.current || location) return;
    triedAuto.current = true;

    const cached = readCachedLocation();
    if (cached) {
      onLocation(cached);
      return;
    }

    if (!navigator.geolocation) return;

    const tryAuto = () => requestLocation(true);

    if ("permissions" in navigator) {
      navigator.permissions
        .query({ name: "geolocation" })
        .then((perm) => {
          if (perm.state === "granted") tryAuto();
        })
        .catch(() => tryAuto());
    } else {
      tryAuto();
    }
  }, [location, onLocation, requestLocation]);

  if (location) {
    return (
      <div className="flex items-center justify-center gap-2 text-sm px-4 py-2 rounded-full glass border border-emerald-500/20 bg-emerald-500/5">
        <MapPin className="w-4 h-4 shrink-0 text-emerald-400" />
        <span className="text-white/70">
          Departing from{" "}
          <strong className="text-emerald-300">{location.city}</strong>
          {location.region ? `, ${location.region}` : ""}
        </span>
        <button
          type="button"
          onClick={() => requestLocation(false)}
          className="text-xs text-white/40 hover:text-white/70 underline ml-1"
        >
          Update
        </button>
      </div>
    );
  }

  return (
    <div className="glass-elevated rounded-2xl p-5 max-w-lg mx-auto text-center border border-rook-400/15">
      <div className="w-12 h-12 rounded-xl bg-rook-500/15 border border-rook-400/20 flex items-center justify-center mx-auto mb-3">
        <Navigation className="w-6 h-6 text-rook-400" />
      </div>
      <h3 className="text-sm font-semibold text-white">Set your departure point</h3>
      <p className="text-xs text-white/50 mt-1 mb-4">
        {status === "loading"
          ? "Using your browser location (already allowed)…"
          : "We use your location for real flight distances and departure costs."}
      </p>
      {status === "loading" ? (
        <div className="inline-flex items-center gap-2 text-sm text-white/60">
          <Loader2 className="w-4 h-4 animate-spin" />
          Detecting location…
        </div>
      ) : (
        <button
          type="button"
          onClick={() => requestLocation(false)}
          disabled={loading}
          className={clsx(
            "inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-all",
            "bg-gradient-to-r from-rook-500 to-rook-600 hover:from-rook-400 hover:to-rook-500 text-white disabled:opacity-50 cursor-pointer shadow-rook"
          )}
        >
          <MapPin className="w-4 h-4" />
          Use my current location
        </button>
      )}
      {status === "error" && (
        <p className="text-xs text-amber-400 mt-3">{errorMsg}</p>
      )}
      <p className="text-[10px] text-white/30 mt-3">
        Or include &quot;from Boston&quot; in your trip description
      </p>
    </div>
  );
}
