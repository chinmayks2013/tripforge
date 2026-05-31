import { ScrapedTripData, UserLocation } from "../types";

export type { ScrapedTripData, UserLocation };

const UA = "TripForge/1.0 (hackathon travel planner)";

const WMO_ICONS: Record<number, string> = {
  0: "☀️", 1: "🌤️", 2: "⛅", 3: "☁️", 45: "🌫️", 61: "🌧️", 71: "🌨️", 95: "⛈️",
};

const WMO_LABELS: Record<number, string> = {
  0: "Clear", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
  61: "Rain", 71: "Snow", 95: "Thunderstorm",
};

function haversineMi(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 3959;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  ms = 6000
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function geocodeCity(query: string) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
  const res = await fetchWithTimeout(url, { headers: { "User-Agent": UA } });
  const data = await res.json();
  if (!data?.[0]) return null;
  return {
    lat: parseFloat(data[0].lat),
    lng: parseFloat(data[0].lon),
    display: data[0].display_name.split(",").slice(0, 2).join(","),
  };
}

async function fetchWeather(lat: number, lng: number) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&temperature_unit=fahrenheit&wind_speed_unit=mph`;
  const res = await fetchWithTimeout(url);
  const data = await res.json();
  const c = data?.current;
  if (!c) return undefined;
  const code = c.weather_code ?? 0;
  return {
    tempF: Math.round(c.temperature_2m),
    condition: WMO_LABELS[code] ?? "Variable",
    icon: WMO_ICONS[code] ?? "🌤️",
    humidity: c.relative_humidity_2m ?? 50,
    windMph: Math.round(c.wind_speed_10m ?? 5),
  };
}

async function fetchWikiSummary(city: string) {
  try {
    const title = city.charAt(0).toUpperCase() + city.slice(1);
    const res = await fetchWithTimeout(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`
    );
    if (!res.ok) return undefined;
    const data = await res.json();
    const text = data.extract ?? "";
    return text.slice(0, 280) + (text.length > 280 ? "…" : "");
  } catch {
    return undefined;
  }
}

export async function scrapeTripData(
  destination: string,
  origin?: string,
  userLocation?: UserLocation | null,
  onProgress?: (msg: string) => void
): Promise<ScrapedTripData> {
  const sources: ScrapedTripData["sources"] = [];
  onProgress?.("Geocoding destination via OpenStreetMap…");

  const destGeo = await geocodeCity(destination);
  if (!destGeo) throw new Error(`Could not geocode: ${destination}`);
  sources.push({ name: "OpenStreetMap", url: "https://nominatim.openstreetmap.org" });

  let originCity = origin ?? userLocation?.city ?? "Unknown origin";
  let originCoords = userLocation
    ? { lat: userLocation.lat, lng: userLocation.lng }
    : undefined;

  if (!originCoords && origin) {
    onProgress?.("Geocoding origin…");
    const og = await geocodeCity(origin);
    if (og) {
      originCoords = { lat: og.lat, lng: og.lng };
      originCity = og.display;
    }
  }

  onProgress?.("Fetching live weather (Open-Meteo)…");
  const [weather, wiki] = await Promise.all([
    fetchWeather(destGeo.lat, destGeo.lng).catch(() => undefined),
    fetchWikiSummary(destination).catch(() => undefined),
  ]);
  if (weather) sources.push({ name: "Open-Meteo", url: "https://open-meteo.com" });
  if (wiki) sources.push({ name: "Wikipedia", url: "https://wikipedia.org" });

  onProgress?.("AI structuring scraped data for agents…");

  const distanceMiles =
    originCoords != null
      ? haversineMi(originCoords.lat, originCoords.lng, destGeo.lat, destGeo.lng)
      : undefined;

  return {
    originCity,
    originCoords,
    destinationDisplay: destGeo.display,
    destinationCoords: { lat: destGeo.lat, lng: destGeo.lng },
    distanceMiles,
    weather,
    wikipediaSummary: wiki,
    sources,
    scrapedAt: Date.now(),
  };
}

export async function reverseGeocode(lat: number, lng: number) {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`;
  const res = await fetchWithTimeout(url, { headers: { "User-Agent": UA } });
  const data = await res.json();
  const addr = data.address ?? {};
  return {
    city: addr.city ?? addr.town ?? addr.village ?? addr.county ?? "Your location",
    region: addr.state ?? addr.region,
    country: addr.country,
  };
}
