"use client";

import { useState, useCallback } from "react";
import { MapPin, Loader2, Navigation } from "lucide-react";
import { UserLocation } from "@/lib/types";
import clsx from "clsx";

interface LocationPromptProps {
  location: UserLocation | null;
  onLocation: (loc: UserLocation) => void;
  loading?: boolean;
}

export default function LocationPrompt({
  location,
  onLocation,
  loading,
}: LocationPromptProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const requestLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      setStatus("error");
      setErrorMsg("Geolocation is not supported in this browser.");
      return;
    }

    setStatus("loading");
    setErrorMsg("");

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch("/api/geocode", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
            }),
          });
          const data = await res.json();
          onLocation({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            city: data.city ?? "Your location",
            region: data.region,
            country: data.country,
          });
          setStatus("idle");
        } catch {
          onLocation({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            city: "Your location",
          });
          setStatus("idle");
        }
      },
      (err) => {
        setStatus("error");
        setErrorMsg(
          err.code === 1
            ? "Location permission denied. Enable it in browser settings to plan from your city."
            : "Could not detect location. Try again or type your city in the trip request."
        );
      },
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 300000 }
    );
  }, [onLocation]);

  if (location) {
    return (
      <div className="flex items-center justify-center gap-2 text-sm text-emerald-400/90">
        <MapPin className="w-4 h-4 shrink-0" />
        <span>
          Departing from <strong className="text-emerald-300">{location.city}</strong>
          {location.region ? `, ${location.region}` : ""}
        </span>
        <button
          type="button"
          onClick={requestLocation}
          className="text-xs text-white/40 hover:text-white/70 underline ml-1"
        >
          Update
        </button>
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl p-5 max-w-lg mx-auto text-center border border-brand-500/20">
      <Navigation className="w-8 h-8 text-brand-400 mx-auto mb-2" />
      <h3 className="text-sm font-semibold text-white">Where are you now?</h3>
      <p className="text-xs text-white/50 mt-1 mb-4">
        We use your location to calculate real flight distances, routes, and local
        departure costs — not generic guesses.
      </p>
      <button
        type="button"
        onClick={requestLocation}
        disabled={status === "loading" || loading}
        className={clsx(
          "inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-all",
          "bg-brand-600 hover:bg-brand-500 text-white disabled:opacity-50 cursor-pointer"
        )}
      >
        {status === "loading" ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Detecting location…
          </>
        ) : (
          <>
            <MapPin className="w-4 h-4" />
            Use my current location
          </>
        )}
      </button>
      {status === "error" && (
        <p className="text-xs text-amber-400 mt-3">{errorMsg}</p>
      )}
      <p className="text-[10px] text-white/30 mt-3">
        Or include &quot;from Boston&quot; in your trip description
      </p>
    </div>
  );
}
