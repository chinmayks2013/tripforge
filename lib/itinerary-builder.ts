import { ParsedRequest, ItineraryDay, ItineraryStop, TripRoute, DayWeather } from "./types";
import {
  getDestinationProfile,
  PlaceOfInterest,
  STOP_ICONS,
} from "./locations";
import { enrichPerk } from "./deals/verify-links";

function haversineMi(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 3959;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function estimateTravelMin(distanceMi: number, hasCar: boolean): number {
  if (distanceMi < 0.3) return Math.round(distanceMi * 20);
  if (hasCar) return Math.round((distanceMi / 25) * 60);
  return Math.round((distanceMi / 12) * 60);
}

function transportMode(
  distanceMi: number,
  hasCar: boolean
): ItineraryStop["transportMode"] {
  if (distanceMi < 0.5) return "walk";
  if (hasCar) return "drive";
  if (distanceMi < 3) return "rideshare";
  return "transit";
}

const TIMES = [
  "8:00 AM", "9:30 AM", "10:30 AM", "12:00 PM",
  "1:30 PM", "3:00 PM", "4:30 PM", "6:00 PM", "7:30 PM",
];

class PlacePool {
  private used = new Set<string>();

  constructor(private places: PlaceOfInterest[]) {}

  takeNext(category: PlaceOfInterest["category"]): PlaceOfInterest | undefined {
    const next = this.places.find(
      (p) => p.category === category && !this.used.has(p.id)
    );
    if (next) this.used.add(next.id);
    return next;
  }

  markUsed(id: string) {
    this.used.add(id);
  }

  isUsed(id: string): boolean {
    return this.used.has(id);
  }
}

function buildDayWeather(
  day: number,
  profile: ReturnType<typeof getDestinationProfile>,
  request?: ParsedRequest
): DayWeather {
  const live = request?.scrapedData?.weather;
  const base = live
    ? {
        tempF: live.tempF,
        condition: live.condition,
        icon: live.icon,
        humidity: live.humidity,
        windMph: live.windMph,
      }
    : profile.weatherProfile;
  const variance = (day - 1) * 2;
  return {
    date: `Day ${day}`,
    dayLabel: `Day ${day}`,
    highF: base.tempF + variance,
    lowF: base.tempF + variance - 12,
    condition: day === 3 ? "Light Rain" : base.condition,
    icon: day === 3 ? "🌦️" : base.icon,
    humidity: base.humidity + (day % 2 === 0 ? 5 : -3),
    windMph: base.windMph + (day % 3),
    precipitation: day === 3 ? 30 : 5,
    uvIndex: day === 3 ? 3 : 6,
    packingTip:
      day === 3
        ? "Pack a compact umbrella — light rain expected"
        : base.tempF > 70
          ? "Sunscreen & light layers recommended"
          : "Layer up — mornings are cool",
  };
}

function buildPerks(
  place: PlaceOfInterest,
  request: ParsedRequest
): { perks?: ItineraryStop["perks"]; cost: number; originalCost?: number } {
  const perks: NonNullable<ItineraryStop["perks"]> = [];
  let cost = place.cost;

  if (place.category === "gas") {
    perks.push({ title: "GasBuddy cheapest within 2 mi", savings: 4 });
    cost = Math.max(0, cost - 4);
    if (request.hasMemberships.includes("AAA")) {
      perks.push({ title: "AAA Fuel Discount", savings: 6 });
      cost = Math.max(0, cost - 6);
    }
    if (request.hasMemberships.includes("COSTCO")) {
      perks.push({ title: "Costco 2% Cash Back", savings: 3 });
      cost = Math.max(0, cost - 3);
    }
  }

  if (place.category === "attraction" && cost > 0) {
    const passSave = Math.round(cost * 0.3);
    perks.push({ title: "City Pass entry included", savings: passSave });
    cost = Math.max(0, cost - passSave);
  }

  if (place.category === "food" && request.hasMemberships.includes("AMEX")) {
    perks.push({ title: "Amex Dining Credit", savings: 10 });
    cost = Math.max(0, cost - 10);
  }

  if (place.category === "attraction" && request.hasMemberships.includes("STUDENT")) {
    perks.push({ title: "Student ID Discount", savings: 8 });
    cost = Math.max(0, cost - 8);
  }

  if (place.category === "perk") {
    return {
      perks: [{ title: "Bundle vs individual tickets", savings: 40 * request.groupSize }],
      cost: place.cost,
      originalCost: place.cost + 40 * request.groupSize,
    };
  }

  return {
    perks: perks.length ? perks : undefined,
    cost,
    originalCost: perks.length ? place.cost : undefined,
  };
}

function makeCityPassStop(
  profile: ReturnType<typeof getDestinationProfile>,
  request: ParsedRequest,
  day: number
): PlaceOfInterest {
  return {
    id: `citypass-day${day}`,
    name: `${profile.name} City Pass Pickup`,
    lat: profile.center.lat + 0.002,
    lng: profile.center.lng + 0.002,
    category: "perk",
    description: `Collect bundled pass — ${profile.attractions.length} attractions + transit included`,
    durationMin: 15,
    cost: 89 * request.groupSize,
  };
}

function placeToStop(
  place: PlaceOfInterest,
  order: number,
  time: string,
  request: ParsedRequest,
  prevLat?: number,
  prevLng?: number
): ItineraryStop {
  let distanceMi: number | undefined;
  let travelMin: number | undefined;
  let mode: ItineraryStop["transportMode"] | undefined;

  if (prevLat != null && prevLng != null) {
    distanceMi = Math.round(haversineMi(prevLat, prevLng, place.lat, place.lng) * 10) / 10;
    travelMin = estimateTravelMin(distanceMi, request.hasCar);
    mode = transportMode(distanceMi, request.hasCar);
  }

  const { perks, cost, originalCost } = buildPerks(place, request);
  const enrichedPerks = perks?.map((p) => enrichPerk(p, request));

  const tips: Record<string, string> = {
    gas: "Cheapest fuel within 2 mi · loyalty & AAA discounts auto-applied",
    rest: "Clean restrooms · coffee, snacks & EV charging available",
    attraction: "Pre-book online · City Pass accepted · free-entry days flagged",
    food: "Peak hours 12–1 PM — arrive early or after 2 PM",
    lodging: "Early check-in with city pass bundle",
    transit: "Allow extra time for security & baggage claim",
    perk: "Show confirmation email · pass activates immediately",
  };

  return {
    id: `${place.id}-stop`,
    order,
    time,
    title: place.name,
    description: place.description,
    category: place.category === "perk" ? "perk" : place.category,
    cost,
    originalCost,
    durationMin: place.durationMin,
    lat: place.lat,
    lng: place.lng,
    distanceMi,
    travelMin,
    transportMode: mode,
    tips: tips[place.category] ?? tips.perk,
    perks: enrichedPerks,
  };
}

function pickDayPlaces(
  pool: PlacePool,
  allPlaces: PlaceOfInterest[],
  day: number,
  totalDays: number,
  request: ParsedRequest,
  profile: ReturnType<typeof getDestinationProfile>
): PlaceOfInterest[] {
  const picked: PlaceOfInterest[] = [];
  const transit = allPlaces.find((p) => p.category === "transit");

  const skipLodging = request.durationHours != null && request.durationHours < 18;
  const attractionIntensity = request.attractionIntensity ?? "normal";
  const isMinimal = attractionIntensity === "minimal";
  const isLow = attractionIntensity === "low";

  if (day === 1) {
    if (transit) {
      pool.markUsed(`${transit.id}-arrival`);
      picked.push({
        ...transit,
        id: `${transit.id}-arrival`,
        description: transit.description,
      });
    }

    if (!skipLodging) {
      const lodging = pool.takeNext("lodging");
      if (lodging) picked.push(lodging);
    }

    pool.markUsed(`citypass-day${day}`);
    picked.push(makeCityPassStop(profile, request, day));

    const a1 = pool.takeNext("attraction");
    if (a1) picked.push(a1);
    if (!isMinimal) {
      const lunch = pool.takeNext("food");
      if (lunch) picked.push(lunch);
    }
    if (!isMinimal && !isLow) {
      const a2 = pool.takeNext("attraction");
      if (a2) picked.push(a2);
    }
    if (isMinimal) {
      const food = pool.takeNext("food");
      if (food) picked.push(food);
    }

    const gas = pool.takeNext("gas");
    if (gas) picked.push(gas);
  } else if (day === totalDays) {
    const attraction = pool.takeNext("attraction");
    if (attraction) picked.push(attraction);

    if (!isMinimal) {
      const food = pool.takeNext("food");
      if (food) picked.push(food);
    }

    const rest = pool.takeNext("rest");
    if (rest) picked.push(rest);

    const gas = pool.takeNext("gas");
    if (gas) {
      picked.push({
        ...gas,
        description: `${gas.description} · top up before heading home`,
      });
    }

    if (transit && !pool.isUsed(`${transit.id}-departure`)) {
      pool.markUsed(`${transit.id}-departure`);
      picked.push({
        ...transit,
        id: `${transit.id}-departure`,
        name: `${transit.name} — Departure`,
        description: "Return flight check-in & security",
        durationMin: 60,
        cost: 0,
      });
    }
  } else {
    const a1 = pool.takeNext("attraction");
    if (a1) picked.push(a1);

    if (isMinimal) {
      const food = pool.takeNext("food");
      if (food) picked.push(food);
      const rest = pool.takeNext("rest");
      if (rest) picked.push(rest);
    } else {
      if (day % 2 === 0) {
        const rest = pool.takeNext("rest");
        if (rest) picked.push(rest);
      }

      const gas = pool.takeNext("gas");
      if (gas) picked.push(gas);

      const food = pool.takeNext("food");
      if (food) picked.push(food);

      if (!isLow) {
        const a2 = pool.takeNext("attraction");
        if (a2) picked.push(a2);
      }
    }
  }

  return picked;
}

export function buildTripRoute(request: ParsedRequest): TripRoute {
  const profile = getDestinationProfile(request.destination);
  const days = request.duration ?? 5;
  const pool = new PlacePool(profile.places);
  const itineraryDays: ItineraryDay[] = [];
  const allStops: ItineraryStop[] = [];
  let globalOrder = 0;
  let prevLat: number | undefined;
  let prevLng: number | undefined;

  for (let d = 1; d <= days; d++) {
    const dayPlaces = pickDayPlaces(
      pool,
      profile.places,
      d,
      days,
      request,
      profile
    );
    const stops: ItineraryStop[] = [];

    dayPlaces.forEach((place, idx) => {
      const stop = placeToStop(
        place,
        globalOrder++,
        TIMES[idx] ?? TIMES[TIMES.length - 1],
        request,
        prevLat,
        prevLng
      );
      stops.push(stop);
      allStops.push(stop);
      prevLat = place.lat;
      prevLng = place.lng;
    });

    itineraryDays.push({
      day: d,
      date: `Day ${d}`,
      weather: buildDayWeather(d, profile, request),
      totalCost: stops.reduce((s, st) => s + st.cost, 0),
      totalDistanceMi:
        Math.round(
          stops.reduce((s, st) => s + (st.distanceMi ?? 0), 0) * 10
        ) / 10,
      stops,
      activities: stops.map((s) => ({
        time: s.time,
        title: s.title,
        cost: s.cost,
        category: s.category,
      })),
    });
  }

  return {
    destination: profile.name,
    destinationKey: request.destination,
    center: profile.center,
    zoom: profile.zoom,
    origin: request.origin,
    totalDays: days,
    totalStops: allStops.length,
    totalDistanceMi:
      Math.round(
        allStops.reduce((s, st) => s + (st.distanceMi ?? 0), 0) * 10
      ) / 10,
    days: itineraryDays,
    allStops,
  };
}

export { STOP_ICONS };
