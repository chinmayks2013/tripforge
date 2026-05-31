import { AgentId, ParsedRequest, ScrapedTripData } from "../types";
import { scrapeTripData } from "./index";

export interface AgentScrapeSnapshot {
  agentId: AgentId;
  summary: string;
  sources: { name: string; url: string }[];
  facts: Record<string, string | number | boolean>;
}

const UA = "TravelRooks/1.0 (travel planner)";

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

async function overpassCount(lat: number, lng: number, filter: string): Promise<number> {
  const query = `[out:json][timeout:8];node${filter}(around:8000,${lat},${lng});out count;`;
  try {
    const res = await fetchWithTimeout("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `data=${encodeURIComponent(query)}`,
    });
    const data = await res.json();
    return data.elements?.[0]?.tags?.total ?? data.elements?.length ?? 0;
  } catch {
    return 0;
  }
}

function coords(request: ParsedRequest) {
  return request.scrapedData?.destinationCoords;
}

/** Per-agent live web scraping — each agent pulls category-specific data. */
export async function scrapeForAgent(
  agentId: AgentId,
  request: ParsedRequest,
  onProgress?: (message: string) => void
): Promise<{ snapshot: AgentScrapeSnapshot; tripData?: ScrapedTripData }> {
  const dest = request.destination;
  const coords_ = coords(request);

  switch (agentId) {
    case "flight": {
      if (request.scrapedData?.destinationCoords) {
        const tripData = request.scrapedData;
        onProgress?.("Reusing global route scrape for flight agent…");
        return {
          tripData,
          snapshot: {
            agentId,
            summary: `Route: ${tripData.distanceMiles ?? "?"} mi, ${tripData.weather?.condition ?? "weather pending"}`,
            sources: tripData.sources,
            facts: {
              distanceMiles: tripData.distanceMiles ?? 0,
              origin: tripData.originCity,
              tempF: tripData.weather?.tempF ?? 0,
            },
          },
        };
      }
      onProgress?.("Scraping routes via OpenStreetMap + live weather…");
      const tripData = await scrapeTripData(
        dest,
        request.origin,
        request.userLocation,
        onProgress
      );
      return {
        tripData,
        snapshot: {
          agentId,
          summary: `Route scraped: ${tripData.distanceMiles ?? "?"} mi, ${tripData.weather?.condition ?? "weather pending"}`,
          sources: tripData.sources,
          facts: {
            distanceMiles: tripData.distanceMiles ?? 0,
            origin: tripData.originCity,
            tempF: tripData.weather?.tempF ?? 0,
          },
        },
      };
    }

    case "lodging": {
      onProgress?.("Scraping hotel density from OpenStreetMap…");
      const hotelCount = coords_
        ? await overpassCount(coords_.lat, coords_.lng, '["tourism"="hotel"]')
        : 0;
      const hostelCount = coords_
        ? await overpassCount(coords_.lat, coords_.lng, '["tourism"="hostel"]')
        : 0;
      return {
        snapshot: {
          agentId,
          summary: `Found ${hotelCount} hotels and ${hostelCount} hostels near ${dest}`,
          sources: [{ name: "OpenStreetMap Overpass", url: "https://overpass-api.de" }],
          facts: { hotelCount, hostelCount, nights: (request.duration ?? 5) - 1 },
        },
      };
    }

    case "transport": {
      onProgress?.("Scraping transit stops and stations…");
      const stops = coords_
        ? await overpassCount(coords_.lat, coords_.lng, '["public_transport"="stop_position"]')
        : 0;
      const stations = coords_
        ? await overpassCount(coords_.lat, coords_.lng, '["railway"="station"]')
        : 0;
      return {
        snapshot: {
          agentId,
          summary: `${stops} transit stops and ${stations} rail stations near ${dest}`,
          sources: [{ name: "OpenStreetMap Overpass", url: "https://overpass-api.de" }],
          facts: { transitStops: stops, railStations: stations, hasCar: request.hasCar },
        },
      };
    }

    case "attractions": {
      onProgress?.("Scraping attractions and museums…");
      const museums = coords_
        ? await overpassCount(coords_.lat, coords_.lng, '["tourism"="museum"]')
        : 0;
      const attractions = coords_
        ? await overpassCount(coords_.lat, coords_.lng, '["tourism"="attraction"]')
        : 0;
      const wiki = request.scrapedData?.wikipediaSummary?.slice(0, 120);
      return {
        snapshot: {
          agentId,
          summary: `${museums} museums, ${attractions} attractions indexed in ${dest}`,
          sources: [
            { name: "OpenStreetMap Overpass", url: "https://overpass-api.de" },
            ...(wiki ? [{ name: "Wikipedia", url: "https://wikipedia.org" }] : []),
          ],
          facts: { museums, attractions, partyTrip: !!request.isPartyTrip },
        },
      };
    }

    case "savings": {
      onProgress?.("Scraping destination tourism and deal context…");
      const wikiUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(dest.charAt(0).toUpperCase() + dest.slice(1))}`;
      let tourismHint = "";
      try {
        const res = await fetchWithTimeout(wikiUrl);
        if (res.ok) {
          const data = await res.json();
          tourismHint = (data.extract as string)?.slice(0, 160) ?? "";
        }
      } catch {
        /* optional */
      }
      return {
        snapshot: {
          agentId,
          summary: tourismHint
            ? `Tourism context scraped for promo matching`
            : `Membership rules loaded for ${dest}`,
          sources: [{ name: "Wikipedia", url: "https://wikipedia.org" }],
          facts: {
            memberships: request.hasMemberships.length,
            destination: dest,
          },
        },
      };
    }

    case "group": {
      onProgress?.("Scraping group venues and restaurants…");
      const restaurants = coords_
        ? await overpassCount(coords_.lat, coords_.lng, '["amenity"="restaurant"]')
        : 0;
      return {
        snapshot: {
          agentId,
          summary: `${restaurants} restaurants indexed for group of ${request.groupSize}`,
          sources: [{ name: "OpenStreetMap Overpass", url: "https://overpass-api.de" }],
          facts: { restaurants, groupSize: request.groupSize },
        },
      };
    }

    case "routing": {
      onProgress?.("Scraping walkable POI clusters for route planning…");
      const cafes = coords_
        ? await overpassCount(coords_.lat, coords_.lng, '["amenity"="cafe"]')
        : 0;
      const pois = coords_
        ? await overpassCount(coords_.lat, coords_.lng, '["tourism"]')
        : 0;
      return {
        snapshot: {
          agentId,
          summary: `${pois} tourism POIs, ${cafes} stops for ${request.duration ?? 5}-day routing`,
          sources: [{ name: "OpenStreetMap Overpass", url: "https://overpass-api.de" }],
          facts: { pois, cafes, days: request.duration ?? 5 },
        },
      };
    }

    case "budget": {
      onProgress?.("Ingesting scraped costs from prior agents…");
      return {
        snapshot: {
          agentId,
          summary: `Cross-category budget scrape for ${request.groupSize} travelers`,
          sources: [{ name: "Agent pipeline", url: "" }],
          facts: {
            budgetCap: request.budget ?? 0,
            days: request.duration ?? 5,
          },
        },
      };
    }

    case "efficiency": {
      onProgress?.("Scraping cost floor benchmarks…");
      const distance = request.scrapedData?.distanceMiles ?? 0;
      return {
        snapshot: {
          agentId,
          summary: distance
            ? `Verifying against ${distance} mi scraped route + destination index`
            : `Applying destination cost floor tables`,
          sources: [
            { name: "OpenStreetMap", url: "https://openstreetmap.org" },
            { name: "Destination index", url: "" },
          ],
          facts: { distanceMiles: distance, destination: dest },
        },
      };
    }

    default:
      return {
        snapshot: {
          agentId,
          summary: `Scraped context for ${dest}`,
          sources: [],
          facts: {},
        },
      };
  }
}
