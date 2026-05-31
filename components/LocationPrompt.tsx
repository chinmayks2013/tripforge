"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { MapPin, Loader2, Navigation } from "lucide-react";
import { UserLocation } from "@/lib/types";
import clsx from "clsx";

const STORAGE_KEY = "travelrooks-user-location";
const CACHE_MS = 60 * 60 * 1000;

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
    /* ignore */
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
        .catch(() => {});
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
              ? "Location permission denied."
              : "Could not detect location."
          );
        },
        { enableHighAccuracy: false, timeout: 5000, maximumAge: 600000 }
      );
    },
    [applyCoords]
  );

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
      <div className="flex items-center justify-center gap-2 text-sm">
        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-emerald-500/20 bg-emerald-500/5 text-white/65">
          <MapPin className="w-3.5 h-3.5 text-emerald-400" />
          Departing from{" "}
          <span className="font-medium text-emerald-300">{location.city}</span>
          {location.region ? `, ${location.region}` : ""}
        </span>
        <button
          type="button"
          onClick={() => requestLocation(false)}
          className="text-xs text-white/35 hover:text-white/60 transition-colors"
        >
          Change
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <div className="inline-flex items-center gap-2 text-xs text-white/40">
        <Navigation className="w-3.5 h-3.5" />
        Set departure point for accurate flight estimates
      </div>
      {status === "loading" ? (
        <div className="inline-flex items-center gap-2 text-sm text-white/50">
          <Loader2 className="w-4 h-4 animate-spin" />
          Detecting location…
        </div>
      ) : (
        <button
          type="button"
          onClick={() => requestLocation(false)}
          disabled={loading}
          className="btn-secondary text-xs"
        >
          <MapPin className="w-3.5 h-3.5" />
          Use current location
        </button>
      )}
      {status === "error" && (
        <p className="text-xs text-amber-400/90 max-w-sm">{errorMsg}</p>
      )}
      <p className="text-[11px] text-white/25">
        Or include &quot;from Boston&quot; in your trip description
      </p>
    </div>
  );
}
