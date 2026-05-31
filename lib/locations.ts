export interface LatLng {
  lat: number;
  lng: number;
}

export interface PlaceOfInterest {
  id: string;
  name: string;
  lat: number;
  lng: number;
  category: "attraction" | "food" | "lodging" | "transit" | "gas" | "rest" | "perk";
  description: string;
  durationMin: number;
  cost: number;
}

export interface DestinationProfile {
  name: string;
  center: LatLng;
  zoom: number;
  airport: string;
  airportCoords: LatLng;
  baseCost: number;
  attractions: string[];
  places: PlaceOfInterest[];
  /** Typical weather by season for demo */
  weatherProfile: {
    tempF: number;
    condition: string;
    icon: string;
    humidity: number;
    windMph: number;
  };
}

const DESTINATIONS: Record<string, DestinationProfile> = {
  "new york": {
    name: "New York City",
    center: { lat: 40.758, lng: -73.9855 },
    zoom: 13,
    airport: "JFK/LGA/EWR",
    airportCoords: { lat: 40.6413, lng: -73.7781 },
    baseCost: 2800,
    attractions: ["Statue of Liberty", "Met Museum", "Central Park", "Broadway"],
    weatherProfile: { tempF: 72, condition: "Partly Cloudy", icon: "⛅", humidity: 58, windMph: 8 },
    places: [
      { id: "jfk", name: "JFK Airport", lat: 40.6413, lng: -73.7781, category: "transit", description: "Arrival terminal", durationMin: 45, cost: 0 },
      { id: "hotel-ny", name: "Midtown Hotel", lat: 40.7549, lng: -73.984, category: "lodging", description: "Check-in & drop bags", durationMin: 30, cost: 0 },
      { id: "central-park", name: "Central Park", lat: 40.7829, lng: -73.9654, category: "attraction", description: "Morning walk & Bethesda Fountain", durationMin: 90, cost: 0 },
      { id: "met", name: "Met Museum", lat: 40.7794, lng: -73.9632, category: "attraction", description: "World-class art collection", durationMin: 120, cost: 30 },
      { id: "gas-1", name: "Shell — West 96th St", lat: 40.793, lng: -73.972, category: "gas", description: "Fuel stop · $3.89/gal · AAA discount", durationMin: 10, cost: 42 },
      { id: "times-square", name: "Times Square", lat: 40.758, lng: -73.9855, category: "attraction", description: "Iconic lights & street performers", durationMin: 60, cost: 0 },
      { id: "broadway", name: "Broadway District", lat: 40.759, lng: -73.9845, category: "attraction", description: "Evening show (discounted TKTS)", durationMin: 150, cost: 85 },
      { id: "statue", name: "Statue of Liberty", lat: 40.6892, lng: -74.0445, category: "attraction", description: "Ferry + crown access", durationMin: 180, cost: 25 },
      { id: "lunch-ny", name: "Joe's Pizza — Greenwich", lat: 40.7308, lng: -74.002, category: "food", description: "Classic NYC slice", durationMin: 45, cost: 15 },
      { id: "rest-1", name: "Rest Stop — Holland Tunnel Plaza", lat: 40.7282, lng: -74.033, category: "rest", description: "Restroom & snacks", durationMin: 15, cost: 8 },
    ],
  },
  paris: {
    name: "Paris",
    center: { lat: 48.8566, lng: 2.3522 },
    zoom: 13,
    airport: "CDG/ORY",
    airportCoords: { lat: 49.0097, lng: 2.5479 },
    baseCost: 3200,
    attractions: ["Louvre", "Eiffel Tower", "Versailles", "Montmartre"],
    weatherProfile: { tempF: 68, condition: "Sunny", icon: "☀️", humidity: 52, windMph: 6 },
    places: [
      { id: "cdg", name: "Charles de Gaulle Airport", lat: 49.0097, lng: 2.5479, category: "transit", description: "Arrival & RER B to city", durationMin: 60, cost: 12 },
      { id: "hotel-paris", name: "Le Marais Boutique Hotel", lat: 48.8566, lng: 2.3622, category: "lodging", description: "Check-in near city center", durationMin: 30, cost: 0 },
      { id: "louvre", name: "Louvre Museum", lat: 48.8606, lng: 2.3376, category: "attraction", description: "Mona Lisa & Egyptian wing", durationMin: 180, cost: 22 },
      { id: "eiffel", name: "Eiffel Tower", lat: 48.8584, lng: 2.2945, category: "attraction", description: "Summit access at sunset", durationMin: 120, cost: 35 },
      { id: "gas-paris", name: "TotalEnergies — Porte de Versailles", lat: 48.832, lng: 2.289, category: "gas", description: "Fuel · €1.72/L · rental return prep", durationMin: 10, cost: 38 },
      { id: "montmartre", name: "Montmartre & Sacré-Cœur", lat: 48.8867, lng: 2.3431, category: "attraction", description: "Hilltop views & artists' square", durationMin: 90, cost: 0 },
      { id: "versailles", name: "Palace of Versailles", lat: 48.8049, lng: 2.1204, category: "attraction", description: "Day trip · gardens included", durationMin: 240, cost: 28 },
      { id: "bistro", name: "Bistro Paul Bert", lat: 48.8534, lng: 2.3845, category: "food", description: "Classic French lunch", durationMin: 75, cost: 45 },
      { id: "rest-paris", name: "Aire de Service — Autoroute A10", lat: 48.52, lng: 2.18, category: "rest", description: "Highway rest area", durationMin: 20, cost: 10 },
    ],
  },
  tokyo: {
    name: "Tokyo",
    center: { lat: 35.6762, lng: 139.6503 },
    zoom: 12,
    airport: "NRT/HND",
    airportCoords: { lat: 35.772, lng: 140.3929 },
    baseCost: 3500,
    attractions: ["Senso-ji", "TeamLab", "Shibuya", "Mt. Fuji day trip"],
    weatherProfile: { tempF: 75, condition: "Clear", icon: "🌤️", humidity: 65, windMph: 5 },
    places: [
      { id: "nrt", name: "Narita Airport", lat: 35.772, lng: 140.3929, category: "transit", description: "Narita Express to Tokyo Station", durationMin: 70, cost: 30 },
      { id: "hotel-tokyo", name: "Shinjuku Hotel", lat: 35.6938, lng: 139.7034, category: "lodging", description: "Check-in near transit hub", durationMin: 30, cost: 0 },
      { id: "sensoji", name: "Senso-ji Temple", lat: 35.7148, lng: 139.7967, category: "attraction", description: "Asakusa temple & Nakamise street", durationMin: 90, cost: 0 },
      { id: "shibuya", name: "Shibuya Crossing", lat: 35.6595, lng: 139.7004, category: "attraction", description: "World's busiest intersection", durationMin: 60, cost: 0 },
      { id: "teamlab", name: "teamLab Planets", lat: 35.649, lng: 139.789, category: "attraction", description: "Immersive digital art", durationMin: 120, cost: 38 },
      { id: "gas-tokyo", name: "ENEOS — Shibuya", lat: 35.658, lng: 139.698, category: "gas", description: "Fuel stop · ¥165/L", durationMin: 10, cost: 35 },
      { id: "fuji", name: "Mt. Fuji Viewpoint", lat: 35.3606, lng: 138.7274, category: "attraction", description: "Day trip · Lake Kawaguchi", durationMin: 300, cost: 55 },
      { id: "ramen", name: "Ichiran Ramen — Shibuya", lat: 35.661, lng: 139.701, category: "food", description: "Famous tonkotsu ramen", durationMin: 45, cost: 12 },
      { id: "rest-tokyo", name: "SA Fujikawa — Tomei Expressway", lat: 35.28, lng: 138.62, category: "rest", description: "Highway service area · Mt. Fuji views", durationMin: 25, cost: 15 },
    ],
  },
  london: {
    name: "London",
    center: { lat: 51.5074, lng: -0.1278 },
    zoom: 13,
    airport: "LHR/LGW",
    airportCoords: { lat: 51.47, lng: -0.4543 },
    baseCost: 3000,
    attractions: ["British Museum", "Tower of London", "West End", "Hyde Park"],
    weatherProfile: { tempF: 62, condition: "Overcast", icon: "☁️", humidity: 72, windMph: 12 },
    places: [
      { id: "lhr", name: "Heathrow Airport", lat: 51.47, lng: -0.4543, category: "transit", description: "Elizabeth line to Paddington", durationMin: 50, cost: 15 },
      { id: "hotel-london", name: "Covent Garden Hotel", lat: 51.5115, lng: -0.122, category: "lodging", description: "Central London base", durationMin: 30, cost: 0 },
      { id: "british-museum", name: "British Museum", lat: 51.5194, lng: -0.127, category: "attraction", description: "Rosetta Stone & Elgin Marbles", durationMin: 150, cost: 0 },
      { id: "tower", name: "Tower of London", lat: 51.5081, lng: -0.0759, category: "attraction", description: "Crown Jewels & Beefeaters", durationMin: 120, cost: 38 },
      { id: "hyde", name: "Hyde Park", lat: 51.5073, lng: -0.1657, category: "attraction", description: "Serpentine & Speaker's Corner", durationMin: 75, cost: 0 },
      { id: "gas-london", name: "BP — Cromwell Road", lat: 51.494, lng: -0.188, category: "gas", description: "Fuel · £1.48/L · Costco discount", durationMin: 10, cost: 48 },
      { id: "west-end", name: "West End Theatre", lat: 51.5117, lng: -0.129, category: "attraction", description: "Matinee show (day seats)", durationMin: 150, cost: 65 },
      { id: "pub", name: "The Churchill Arms", lat: 51.501, lng: -0.194, category: "food", description: "Traditional pub lunch", durationMin: 60, cost: 22 },
      { id: "rest-london", name: "Motorway Services — Cobham", lat: 51.32, lng: -0.41, category: "rest", description: "M25 rest stop", durationMin: 15, cost: 9 },
    ],
  },
  barcelona: {
    name: "Barcelona",
    center: { lat: 41.3874, lng: 2.1686 },
    zoom: 13,
    airport: "BCN",
    airportCoords: { lat: 41.2974, lng: 2.0833 },
    baseCost: 2400,
    attractions: ["Sagrada Familia", "Park Güell", "Gothic Quarter", "Beach"],
    weatherProfile: { tempF: 78, condition: "Sunny", icon: "☀️", humidity: 55, windMph: 7 },
    places: [
      { id: "bcn", name: "Barcelona El Prat", lat: 41.2974, lng: 2.0833, category: "transit", description: "Aerobús to Plaça Catalunya", durationMin: 40, cost: 8 },
      { id: "hotel-bcn", name: "Gothic Quarter Hotel", lat: 41.3834, lng: 2.176, category: "lodging", description: "Boutique stay in El Gòtic", durationMin: 30, cost: 0 },
      { id: "sagrada", name: "Sagrada Familia", lat: 41.4036, lng: 2.1744, category: "attraction", description: "Gaudí masterpiece · pre-booked entry", durationMin: 120, cost: 32 },
      { id: "park-guell", name: "Park Güell", lat: 41.4145, lng: 2.1527, category: "attraction", description: "Mosaic terraces & city views", durationMin: 90, cost: 12 },
      { id: "gothic", name: "Gothic Quarter", lat: 41.3834, lng: 2.176, category: "attraction", description: "Medieval streets & cathedral", durationMin: 90, cost: 0 },
      { id: "beach", name: "Barceloneta Beach", lat: 41.378, lng: 2.192, category: "attraction", description: "Mediterranean swim & chiringuito", durationMin: 120, cost: 0 },
      { id: "gas-bcn", name: "Repsol — Diagonal Mar", lat: 41.41, lng: 2.215, category: "gas", description: "Fuel · €1.65/L", durationMin: 10, cost: 36 },
      { id: "tapas", name: "La Boqueria Market", lat: 41.3816, lng: 2.1719, category: "food", description: "Fresh tapas & jamón", durationMin: 60, cost: 25 },
      { id: "rest-bcn", name: "Área de Servicio — AP-7", lat: 41.45, lng: 2.05, category: "rest", description: "Highway rest area", durationMin: 15, cost: 7 },
    ],
  },
  "san francisco": {
    name: "San Francisco",
    center: { lat: 37.7749, lng: -122.4194 },
    zoom: 12,
    airport: "SFO/OAK",
    airportCoords: { lat: 37.6213, lng: -122.379 },
    baseCost: 2600,
    attractions: ["Golden Gate", "Alcatraz", "Fisherman's Wharf", "Muir Woods"],
    weatherProfile: { tempF: 65, condition: "Foggy AM, Sunny PM", icon: "🌁", humidity: 70, windMph: 14 },
    places: [
      { id: "sfo", name: "SFO Airport", lat: 37.6213, lng: -122.379, category: "transit", description: "BART to Embarcadero", durationMin: 45, cost: 10 },
      { id: "hotel-sf", name: "Union Square Hotel", lat: 37.7879, lng: -122.4075, category: "lodging", description: "Downtown base", durationMin: 30, cost: 0 },
      { id: "golden-gate", name: "Golden Gate Bridge", lat: 37.8199, lng: -122.4783, category: "attraction", description: "Walk/bike the iconic span", durationMin: 90, cost: 0 },
      { id: "alcatraz", name: "Alcatraz Island", lat: 37.8267, lng: -122.423, category: "attraction", description: "Ferry + audio tour", durationMin: 180, cost: 45 },
      { id: "fishermans", name: "Fisherman's Wharf", lat: 37.808, lng: -122.4177, category: "attraction", description: "Pier 39 sea lions & clam chowder", durationMin: 75, cost: 20 },
      { id: "muir", name: "Muir Woods", lat: 37.895, lng: -122.581, category: "attraction", description: "Redwood forest day trip", durationMin: 180, cost: 15 },
      { id: "gas-sf", name: "Chevron — Van Ness Ave", lat: 37.795, lng: -122.423, category: "gas", description: "Fuel · $4.89/gal · before Muir Woods", durationMin: 10, cost: 52 },
      { id: "rest-sf", name: "Rest Stop — Marin Headlands", lat: 37.827, lng: -122.499, category: "rest", description: "Scenic overlook & restrooms", durationMin: 15, cost: 0 },
      { id: "dinner-sf", name: "Tadich Grill", lat: 37.7935, lng: -122.402, category: "food", description: "Historic seafood dinner", durationMin: 90, cost: 55 },
    ],
  },
  chicago: {
    name: "Chicago",
    center: { lat: 41.8781, lng: -87.6298 },
    zoom: 13,
    airport: "ORD/MDW",
    airportCoords: { lat: 41.9742, lng: -87.9073 },
    baseCost: 2200,
    attractions: ["Art Institute", "Millennium Park", "Navy Pier", "Architecture tour"],
    weatherProfile: { tempF: 70, condition: "Windy, Clear", icon: "💨", humidity: 50, windMph: 18 },
    places: [
      { id: "ord", name: "O'Hare Airport", lat: 41.9742, lng: -87.9073, category: "transit", description: "Blue Line to Loop", durationMin: 55, cost: 5 },
      { id: "hotel-chi", name: "Loop Hotel", lat: 41.8819, lng: -87.6278, category: "lodging", description: "Downtown Chicago", durationMin: 30, cost: 0 },
      { id: "art-inst", name: "Art Institute of Chicago", lat: 41.8796, lng: -87.6237, category: "attraction", description: "American Gothic & Impressionists", durationMin: 150, cost: 28 },
      { id: "millennium", name: "Millennium Park", lat: 41.8826, lng: -87.6226, category: "attraction", description: "Cloud Gate (The Bean)", durationMin: 60, cost: 0 },
      { id: "navy-pier", name: "Navy Pier", lat: 41.8919, lng: -87.605, category: "attraction", description: "Lakefront ferris wheel", durationMin: 90, cost: 18 },
      { id: "arch-tour", name: "Architecture River Cruise", lat: 41.888, lng: -87.623, category: "attraction", description: "Chicago River boat tour", durationMin: 75, cost: 48 },
      { id: "gas-chi", name: "Shell — Lake Shore Dr", lat: 41.895, lng: -87.615, category: "gas", description: "Fuel · $3.75/gal", durationMin: 10, cost: 40 },
      { id: "deep-dish", name: "Lou Malnati's Pizzeria", lat: 41.89, lng: -87.62, category: "food", description: "Deep dish pizza", durationMin: 60, cost: 28 },
      { id: "rest-chi", name: "Rest Stop — I-90 Oasis", lat: 42.05, lng: -88.02, category: "rest", description: "Tollway oasis", durationMin: 15, cost: 8 },
    ],
  },
  boston: {
    name: "Boston",
    center: { lat: 42.3601, lng: -71.0589 },
    zoom: 13,
    airport: "BOS",
    airportCoords: { lat: 42.3656, lng: -71.0096 },
    baseCost: 2100,
    attractions: ["Freedom Trail", "Fenway Park", "Harvard", "New England Aquarium"],
    weatherProfile: { tempF: 66, condition: "Crisp & Clear", icon: "🍂", humidity: 48, windMph: 10 },
    places: [
      { id: "bos", name: "Logan Airport", lat: 42.3656, lng: -71.0096, category: "transit", description: "Silver Line to downtown", durationMin: 35, cost: 2 },
      { id: "hotel-bos", name: "Back Bay Hotel", lat: 42.3505, lng: -71.0753, category: "lodging", description: "Historic Back Bay", durationMin: 30, cost: 0 },
      { id: "freedom", name: "Freedom Trail", lat: 42.3555, lng: -71.0636, category: "attraction", description: "2.5-mile historic walk", durationMin: 180, cost: 0 },
      { id: "fenway", name: "Fenway Park", lat: 42.3467, lng: -71.0972, category: "attraction", description: "Red Sox game or tour", durationMin: 150, cost: 55 },
      { id: "harvard", name: "Harvard Yard", lat: 42.3744, lng: -71.1169, category: "attraction", description: "Cambridge campus walk", durationMin: 90, cost: 0 },
      { id: "aquarium", name: "New England Aquarium", lat: 42.3591, lng: -71.0498, category: "attraction", description: "Giant ocean tank & penguins", durationMin: 120, cost: 35 },
      { id: "gas-bos", name: "Mobil — Storrow Dr", lat: 42.358, lng: -71.07, category: "gas", description: "Fuel · $3.65/gal · AAA discount", durationMin: 10, cost: 38 },
      { id: "lobster", name: "Legal Sea Foods", lat: 42.353, lng: -71.05, category: "food", description: "New England lobster roll", durationMin: 60, cost: 32 },
      { id: "rest-bos", name: "Rest Stop — Mass Pike Service Plaza", lat: 42.24, lng: -71.48, category: "rest", description: "Highway service plaza", durationMin: 15, cost: 9 },
    ],
  },
};

export function getDestinationProfile(destination: string): DestinationProfile {
  const key = destination.toLowerCase();
  const profile = DESTINATIONS[key] ?? {
    ...DESTINATIONS["new york"],
    name: destination.charAt(0).toUpperCase() + destination.slice(1),
  };
  return { ...profile, places: enrichPlaces(profile.places) };
}

export function getDestinationData(destination: string) {
  const profile = getDestinationProfile(destination);
  return {
    baseCost: profile.baseCost,
    airport: profile.airport,
    attractions: profile.attractions,
  };
}

export const STOP_ICONS: Record<string, string> = {
  attraction: "🎭",
  food: "🍽️",
  lodging: "🏨",
  transit: "✈️",
  gas: "⛽",
  rest: "🛑",
  perk: "🎫",
};

export const STOP_COLORS: Record<string, string> = {
  attraction: "#f59e0b",
  food: "#ef4444",
  lodging: "#8b5cf6",
  transit: "#6366f1",
  gas: "#64748b",
  rest: "#06b6d4",
  perk: "#10b981",
};

/** Add alternate gas/rest stops so multi-day trips never revisit the same station */
function enrichPlaces(places: PlaceOfInterest[]): PlaceOfInterest[] {
  const extras: PlaceOfInterest[] = [];
  const gasStations = places.filter((p) => p.category === "gas");
  const restStops = places.filter((p) => p.category === "rest");

  gasStations.forEach((g, i) => {
    extras.push({
      ...g,
      id: `${g.id}-route-${i + 2}`,
      name: g.name.replace("—", `#${i + 2} —`),
      lat: g.lat + 0.015 * (i + 1),
      lng: g.lng + 0.012 * (i + 1),
      description: `${g.description} · en-route option ${i + 2}`,
    });
  });

  restStops.forEach((r, i) => {
    extras.push({
      ...r,
      id: `${r.id}-route-${i + 2}`,
      name: `${r.name} (Alt ${i + 2})`,
      lat: r.lat + 0.02 * (i + 1),
      lng: r.lng + 0.015 * (i + 1),
      description: `${r.description} · alternate highway stop`,
    });
  });

  return [...places, ...extras];
}
