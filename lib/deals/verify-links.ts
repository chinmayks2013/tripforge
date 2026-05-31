import { HiddenOpportunity, ParsedRequest } from "../types";

export interface VerifyLink {
  url: string;
  label: string;
}

export interface DealContext {
  destination?: string;
  origin?: string;
  groupSize?: number;
}

function destKey(destination?: string): string {
  return (destination ?? "").toLowerCase().trim();
}

function displayDest(destination?: string): string {
  const key = destKey(destination);
  if (!key) return "your destination";
  return key
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function enc(value: string): string {
  return encodeURIComponent(value);
}

/** City pass checkout / pricing — not the marketing homepage. */
function cityPassDealUrl(destination?: string): string {
  const d = destKey(destination);
  const map: Record<string, { url: string; label: string }> = {
    paris: {
      url: "https://www.parispass.com/en/paris-attractions-pass",
      label: "Paris Pass — attractions + transit pricing",
    },
    london: {
      url: "https://www.londonpass.com/london-pass-prices.php",
      label: "London Pass — see what's included & price",
    },
    rome: {
      url: "https://www.romecitypass.com/rome-city-pass/",
      label: "Rome City Pass — bundle price & attractions",
    },
    barcelona: {
      url: "https://www.barcelonacard.com/barcelona-card-prices/",
      label: "Barcelona Card — transit + museums price",
    },
    amsterdam: {
      url: "https://www.iamsterdam.com/en/plan-your-trip/amsterdam-city-card/amsterdam-city-card-prices-and-discounts",
      label: "Amsterdam City Card — discounts list",
    },
    tokyo: {
      url: "https://www.japan-rail-pass.com/en/purchase.html",
      label: "JR Pass — purchase & coverage",
    },
    "new york": {
      url: "https://www.citypass.com/new-york?mv=cp.nav",
      label: "NYC CityPASS — 5 attractions bundle price",
    },
    boston: {
      url: "https://www.citypass.com/boston?mv=cp.nav",
      label: "Boston CityPASS — bundle price",
    },
    chicago: {
      url: "https://www.citypass.com/chicago?mv=cp.nav",
      label: "Chicago CityPASS — bundle price",
    },
    "san francisco": {
      url: "https://www.citypass.com/san-francisco?mv=cp.nav",
      label: "SF CityPASS — bundle price",
    },
    seattle: {
      url: "https://www.citypass.com/seattle?mv=cp.nav",
      label: "Seattle CityPASS — bundle price",
    },
    miami: {
      url: "https://www.citypass.com/miami?mv=cp.nav",
      label: "Miami CityPASS — bundle price",
    },
  };
  return map[d]?.url ?? `https://www.citypass.com/search?q=${enc(displayDest(destination))}`;
}

function cityPassDealLabel(destination?: string): string {
  const d = destKey(destination);
  const labels: Record<string, string> = {
    paris: "Paris Pass — attractions + transit pricing",
    london: "London Pass — see what's included & price",
    rome: "Rome City Pass — bundle price & attractions",
    barcelona: "Barcelona Card — transit + museums price",
    amsterdam: "Amsterdam City Card — discounts list",
    tokyo: "JR Pass — purchase & coverage",
    "new york": "NYC CityPASS — 5 attractions bundle price",
    boston: "Boston CityPASS — bundle price",
    chicago: "Chicago CityPASS — bundle price",
    "san francisco": "SF CityPASS — bundle price",
    seattle: "Seattle CityPASS — bundle price",
    miami: "Miami CityPASS — bundle price",
  };
  return labels[d] ?? `City pass deals for ${displayDest(destination)}`;
}

/** Multi-day transit pass product page per city. */
function transitPassDealUrl(destination?: string): string {
  const d = destKey(destination);
  const map: Record<string, string> = {
    paris: "https://www.ratp.fr/en/tickets-fares/mobilis",
    london: "https://tfl.gov.uk/fares/how-to-pay-and-where-to-buy-tickets-and-oyster/travelcards-and-group-tickets",
    rome: "https://www.atac.roma.it/en/tickets-and-passes/rome-24h-48h-72h-tickets",
    barcelona: "https://www.tmb.cat/en/barcelona-fares-metro-bus",
    tokyo: "https://www.japan.travel/en/plan/tokyo-transit/",
    "new york": "https://new.mta.info/fares/subway-bus-fares/7-day-unlimited-ride-metrocard",
    boston: "https://www.mbta.com/fares/charliecard-charlieticket/1-day-7-day-and-monthly-passes",
    chicago: "https://www.transitchicago.com/fares/ventra/",
    "san francisco": "https://www.clippercard.com/ClipperWeb/index.jsf",
  };
  return (
    map[d] ??
    `https://www.google.com/search?q=${enc(`${displayDest(destination)} unlimited transit pass price`)}`
  );
}

function freeMuseumDealUrl(destination?: string): string {
  const d = destKey(destination);
  const map: Record<string, string> = {
    paris: "https://www.louvre.fr/en/visit/opening-hours-and-admission",
    london: "https://www.britishmuseum.org/visit",
    rome: "https://www.museivaticani.va/content/museivaticani/en/visit/tickets.html",
    "new york": "https://www.metmuseum.org/plan-your-visit/met-fifth-avenue",
    boston: "https://www.mfa.org/visit/admission",
    chicago: "https://www.artic.edu/visit",
    "san francisco": "https://www.sftravel.com/article/free-museums-attractions-san-francisco",
    barcelona: "https://www.barcelona.de/en/barcelona-museums.html",
  };
  return (
    map[d] ??
    `https://www.google.com/search?q=${enc(`${displayDest(destination)} museum free admission day schedule`)}`
  );
}

function viatorDealUrl(destination: string | undefined, query: string): string {
  const dest = displayDest(destination);
  return `https://www.viator.com/searchResults/all?text=${enc(`${dest} ${query}`)}`;
}

function bookingSearchUrl(ctx: DealContext, extra = ""): string {
  const dest = displayDest(ctx.destination);
  const adults = ctx.groupSize ?? 2;
  return `https://www.booking.com/searchresults.html?ss=${enc(dest)}&group_adults=${adults}${extra}`;
}

function airbnbEntireHomeUrl(ctx: DealContext): string {
  const dest = displayDest(ctx.destination);
  const guests = ctx.groupSize ?? 2;
  return `https://www.airbnb.com/s/${enc(dest)}/homes?room_types[]=Entire%20home%2Fapt&adults=${guests}&min_bedrooms=1`;
}

function simplerGoogleFlights(ctx: DealContext): string {
  const q = ctx.origin
    ? `cheapest tuesday flight ${ctx.origin} to ${displayDest(ctx.destination)}`
    : `cheapest tuesday flight to ${displayDest(ctx.destination)}`;
  return `https://www.google.com/travel/flights?q=${enc(q)}`;
}

function skiplaggedUrl(ctx: DealContext): string {
  const dest = displayDest(ctx.destination).replace(/\s+/g, "-");
  const origin = (ctx.origin ?? "NYC").replace(/\s+/g, "-");
  return `https://skiplagged.com/flights/${enc(origin)}/${enc(dest)}/${new Date().toISOString().slice(0, 10)}`;
}

function numbeoCityUrl(destination?: string): string {
  const city = displayDest(destination).replace(/\s+/g, "-");
  return `https://www.numbeo.com/cost-of-living/in/${enc(city)}`;
}

function budgetTripCityUrl(destination?: string): string {
  const d = destKey(destination);
  const map: Record<string, string> = {
    paris: "https://www.budgetyourtrip.com/france/paris",
    london: "https://www.budgetyourtrip.com/united-kingdom/london",
    tokyo: "https://www.budgetyourtrip.com/japan/tokyo",
    barcelona: "https://www.budgetyourtrip.com/spain/barcelona",
    "new york": "https://www.budgetyourtrip.com/united-states-of-america/new-york-city",
    boston: "https://www.budgetyourtrip.com/united-states-of-america/boston",
    chicago: "https://www.budgetyourtrip.com/united-states-of-america/chicago",
    "san francisco": "https://www.budgetyourtrip.com/united-states-of-america/san-francisco",
  };
  return map[d] ?? `https://www.budgetyourtrip.com/search?q=${enc(displayDest(destination))}`;
}

function yelpNightlifeUrl(destination?: string): string {
  return `https://www.yelp.com/search?find_desc=nightlife+happy+hour+no+cover&find_loc=${enc(displayDest(destination))}`;
}

function parkRideUrl(destination?: string): string {
  return `https://www.google.com/maps/search/${enc(`${displayDest(destination)} park and ride lot`)}`;
}

function gasBuddyNearUrl(destination?: string): string {
  return `https://www.gasbuddy.com/home?search=${enc(displayDest(destination))}`;
}

function ctxFromRequest(req?: ParsedRequest | DealContext): DealContext {
  if (!req) return {};
  if ("rawQuery" in req) {
    return {
      destination: req.destination,
      origin: req.origin ?? req.userLocation?.city,
      groupSize: req.groupSize,
    };
  }
  return req;
}

/** Static verify links — each URL opens the specific deal, pass, or pre-filtered offer. */
function buildDealVerifyLink(
  opportunityId: string,
  ctx: DealContext
): VerifyLink | undefined {
  const dest = ctx.destination;

  switch (opportunityId) {
    case "flight-tuesday":
      return {
        url: simplerGoogleFlights(ctx),
        label: "Open Tuesday fare search for your route",
      };
    case "flight-hidden-city":
      return {
        url: skiplaggedUrl(ctx),
        label: "Search hidden-city fares on Skiplagged",
      };
    case "lodging-extended":
      return {
        url: `${bookingSearchUrl(ctx, "&selected_currency=USD")}&nflt=hotelfacility%3D16%3B`,
        label: "Extended-stay listings for your destination",
      };
    case "lodging-offpeak":
      return {
        url: bookingSearchUrl(ctx, "&order=price"),
        label: "Sorted by price — compare Sun–Thu stays",
      };
    case "transport-pass":
      return {
        url: transitPassDealUrl(dest),
        label: "Multi-day unlimited transit pass page",
      };
    case "transport-city-pass-transit":
      return {
        url: cityPassDealUrl(dest),
        label: cityPassDealLabel(dest),
      };
    case "transport-parkride":
      return {
        url: parkRideUrl(dest),
        label: "Park-and-ride lots near your destination",
      };
    case "attractions-free-day":
      return {
        url: freeMuseumDealUrl(dest),
        label: "Free / pay-what-you-wish admission schedule",
      };
    case "attractions-combo":
      return {
        url: viatorDealUrl(dest, "attraction combo ticket bundle"),
        label: "Attraction combo tickets for your city",
      };
    case "attractions-city-pass":
      return {
        url: cityPassDealUrl(dest),
        label: cityPassDealLabel(dest),
      };
    case "attractions-party-bundle":
      return {
        url: viatorDealUrl(dest, "group celebration party package"),
        label: "Group celebration packages in your city",
      };
    case "attractions-nightlife":
      return {
        url: yelpNightlifeUrl(dest),
        label: "No-cover & happy-hour venues near you",
      };
    case "savings-promo":
      return {
        url: "https://www.retailmenot.com/view/booking.com#available-offers",
        label: "Active Booking.com promo codes right now",
      };
    case "savings-student":
      return {
        url: "https://www.isic.org/discounts/travel/",
        label: "ISIC travel & transit discounts list",
      };
    case "savings-aaa":
      return {
        url: "https://www.aaa.com/tripcanvas/hotel-discounts",
        label: "AAA member hotel discount page",
      };
    case "savings-amex":
      return {
        url: "https://global.americanexpress.com/card-benefits/detail/travel-credit/platinum",
        label: "$200 Amex travel credit — eligible charges",
      };
    case "savings-costco":
      return {
        url: "https://www.costcotravel.com/Travel-Offers",
        label: "Current Costco Travel executive cash-back offers",
      };
    case "group-rate":
      return {
        url: viatorDealUrl(dest, "group discount tour 8 percent"),
        label: "Group-rate tours for your party size",
      };
    case "group-lodging":
      return {
        url: airbnbEntireHomeUrl(ctx),
        label: "Entire-home Airbnb — split by person",
      };
    case "routing-cluster":
      return {
        url: `https://www.google.com/maps/search/things+to+do+in+${enc(displayDest(dest))}`,
        label: "Map of attractions in your destination",
      };
    case "budget-reallocate":
      return {
        url: "https://www.nerdwallet.com/article/travel/how-to-save-money-on-vacation",
        label: "How to shift savings between categories",
      };
    case "budget-meals":
      return {
        url: `https://www.yelp.com/search?find_desc=lunch+special+menu&find_loc=${enc(displayDest(dest))}`,
        label: "Lunch specials & cheap eats near you",
      };
    case "efficiency-recalibration":
      return {
        url: numbeoCityUrl(dest),
        label: `Live cost index for ${displayDest(dest)}`,
      };
    case "efficiency-budget-gap":
      return {
        url: budgetTripCityUrl(dest),
        label: `Daily budget breakdown for ${displayDest(dest)}`,
      };
    case "efficiency-distance-verified":
      return {
        url: `https://www.openstreetmap.org/search?query=${enc(displayDest(dest))}`,
        label: "OpenStreetMap — route distance source",
      };
    default:
      return undefined;
  }
}

function buildPerkVerifyLink(
  perkTitle: string,
  ctx: DealContext
): VerifyLink | undefined {
  const dest = ctx.destination;

  switch (perkTitle) {
    case "GasBuddy cheapest within 2 mi":
      return {
        url: gasBuddyNearUrl(dest),
        label: "Cheapest stations near your destination",
      };
    case "AAA Fuel Discount":
      return {
        url: "https://gasprices.aaa.com/state-gas-price-averages/",
        label: "AAA fuel discount program & station map",
      };
    case "Costco 2% Cash Back":
      return {
        url: "https://www.costco.com/executive-rewards.html",
        label: "Executive 2% reward — eligible purchases",
      };
    case "City Pass entry included":
      return {
        url: cityPassDealUrl(dest),
        label: cityPassDealLabel(dest),
      };
    case "Amex Dining Credit":
      return {
        url: "https://global.americanexpress.com/card-benefits/detail/dining-credit/platinum",
        label: "$20/mo dining credit — eligible restaurants",
      };
    case "Student ID Discount":
      return {
        url: "https://www.isic.org/discounts/",
        label: "ISIC discounts — filter by your city",
      };
    case "Bundle vs individual tickets":
      return {
        url: viatorDealUrl(dest, "multi attraction pass vs individual"),
        label: "Bundle vs single-ticket prices",
      };
    default:
      return undefined;
  }
}

export function getDealVerifyLink(
  opportunityId: string,
  context?: ParsedRequest | DealContext
): VerifyLink | undefined {
  return buildDealVerifyLink(opportunityId, ctxFromRequest(context));
}

export function getPerkVerifyLink(
  perkTitle: string,
  context?: ParsedRequest | DealContext
): VerifyLink | undefined {
  return buildPerkVerifyLink(perkTitle, ctxFromRequest(context));
}

export function enrichOpportunity(
  opp: HiddenOpportunity,
  context?: ParsedRequest | DealContext
): HiddenOpportunity {
  const link = getDealVerifyLink(opp.id, context);
  if (!link) return opp;
  return { ...opp, verifyUrl: link.url, verifyLabel: link.label };
}

export function enrichOpportunities(
  opportunities: HiddenOpportunity[],
  context?: ParsedRequest | DealContext
): HiddenOpportunity[] {
  return opportunities.map((o) => enrichOpportunity(o, context));
}

export interface PerkWithVerify {
  title: string;
  savings: number;
  verifyUrl?: string;
  verifyLabel?: string;
}

export function enrichPerk(
  perk: { title: string; savings: number },
  context?: ParsedRequest | DealContext
): PerkWithVerify {
  const link = getPerkVerifyLink(perk.title, context);
  if (!link) return perk;
  return { ...perk, verifyUrl: link.url, verifyLabel: link.label };
}

export function dealContextFromRequest(request: ParsedRequest): DealContext {
  return ctxFromRequest(request);
}
