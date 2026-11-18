import { cents } from "../utils/currency.js";
import { AppError } from "../utils/errors.js";
import { calculateBudget } from "./budgetService.js";
const matching = {
  history: ["museum", "historical", "landmark"],
  culture: ["museum", "art_gallery", "historical"],
  museums: ["museum"],
  food: ["restaurant", "food"],
  cafes: ["cafe"],
  shopping: ["shopping", "market"],
  nature: ["park", "natural"],
  beaches: ["beach"],
  architecture: ["historical", "landmark"],
  nightlife: ["bar", "night_club"],
  family: ["park", "zoo"],
  adventure: ["hiking", "park"],
  photography: ["landmark", "tourist_attraction"],
  relaxation: ["park", "beach"],
  local: ["market", "restaurant"],
};
export function matchedInterests(place, interests) {
  const types = (place.types?.length ? place.types : [place.type]).filter(Boolean);
  return interests.filter((interest) => interest === "oldDamascus" ? place.oldDamascus === true : (matching[interest] || []).some((tag) => types.some((type) => type.includes(tag))));
}
export function distanceKm(a, b) {
  if (![a?.latitude, a?.longitude, b?.latitude, b?.longitude].every(Number.isFinite)) return null;
  const rad = (n) => n * Math.PI / 180;
  const h = Math.sin(rad(b.latitude - a.latitude) / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(rad(b.longitude - a.longitude) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(Math.min(1, h)));
}
const normalizedName = (name) => String(name || "").normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
import { isGrandMosque } from "./makkahVisit.js";
export function rankPlaces(places, input) {
  const unique = [];
  for (const place of places) {
    if (!place.id || !place.name || ["CLOSED_PERMANENTLY", "CLOSED_TEMPORARILY"].includes(place.businessStatus)) continue;
    if (![place.latitude, place.longitude].every(Number.isFinite) || Math.abs(place.latitude) > 90 || Math.abs(place.longitude) > 180) continue;
    if (unique.some((kept) => kept.id === place.id || (normalizedName(kept.name) === normalizedName(place.name) && distanceKm(kept, place) <= 0.1))) continue;
    unique.push(place);
  }
  const pool = unique
    .map((p) => ({
      ...p,
      matchedInterests: matchedInterests(p, input.interests),
      rankScore: matchedInterests(p, input.interests).length * 10 +
        (Number.isFinite(p.rating) ? Math.max(0, Math.min(5, p.rating)) : 0) +
        Math.min(2, Math.log10(1 + Math.max(0, p.reviewCount || 0))) +
        (distanceKm(input.anchor, p) === null ? 0 : 2 / (1 + distanceKm(input.anchor, p) / 5)),
    }))
    .sort((a, b) => b.rankScore - a.rankScore || a.id.localeCompare(b.id));
  const result = [], covered = new Set(), typeCounts = new Map();
  while (pool.length && result.length < 45) {
    pool.sort((a, b) => {
      const score = (p) => p.rankScore + p.matchedInterests.filter((i) => !covered.has(i)).length * 15 - (typeCounts.get(p.type) || 0) * 2;
      return score(b) - score(a) || a.id.localeCompare(b.id);
    });
    const place = pool.shift(); result.push(place);
    place.matchedInterests.forEach((i) => covered.add(i));
    typeCounts.set(place.type, (typeCounts.get(place.type) || 0) + 1);
  }
  if (input.destinationCode === "QCA" && !result.some(isGrandMosque)) {
    const mosque = pool.find(isGrandMosque);
    if (mosque) result.push(mosque);
  }
  return result;
}
export function selectOffers(
  candidates,
  input,
  { cheaper = false, flightId, hotelId } = {},
) {
  const usable = (offer) => {
    if (!offer.id || offer.currency !== input.currency || (offer.expiresAt && (!Number.isFinite(Date.parse(offer.expiresAt)) || Date.parse(offer.expiresAt) <= Date.now()))) return false;
    try { cents(offer.price); return true; } catch { return false; }
  };
  let flights = candidates.flights.filter(usable), hotels = candidates.hotels.filter(usable);
  if (!flights.length)
    throw new AppError(
      422,
      "NO_FLIGHTS",
      "No flights were returned in the requested currency.",
    );
  if (!hotels.length)
    throw new AppError(
      422,
      "NO_HOTELS",
      "No hotels were returned in the requested currency.",
    );
  const cheapest = (a, b) => cents(a.price) - cents(b.price);
  flights.sort((a, b) =>
    !cheaper && input.preferences.directPreferred
      ? a.stops + a.returnStops - (b.stops + b.returnStops) || cheapest(a, b)
      : !cheaper && input.preferences.flightOption === "shortest"
        ? a.durationMinutes - b.durationMinutes || cheapest(a, b)
        : cheapest(a, b),
  );
  hotels.sort((a, b) =>
    !cheaper && a.stars != null && b.stars != null
      ? Math.abs(a.stars - input.preferences.hotelStars) -
          Math.abs(b.stars - input.preferences.hotelStars) || cheapest(a, b)
      : cheapest(a, b),
  );
  let flight = flightId
    ? flights.find((f) => f.id === flightId)
    : cheaper
      ? [...flights].sort(cheapest)[0]
      : flights[0];
  let hotel = hotelId
    ? hotels.find((h) => h.id === hotelId)
    : cheaper
      ? [...hotels].sort(cheapest)[0]
      : hotels[0];
  if (!flight || !hotel)
    throw new AppError(
      422,
      "OFFER_EXPIRED",
      "A selected offer is no longer in the current candidate set. Refresh the search and select again.",
    );
  // Preserve explicit traveler choices; optimize only the categories they left open.
  if (!cheaper && (!flightId || !hotelId)) {
    const pairs = [];
    const possibleFlights = flightId ? [flight] : flights;
    const possibleHotels = hotelId ? [hotel] : hotels;
    possibleFlights.forEach((f, fi) => possibleHotels.forEach((h, hi) => {
      const budget = calculateBudget(input, f, h, []);
      pairs.push({ flight: f, hotel: h, overBudget: budget.overBudget, preferenceRank: fi + hi, cost: cents(budget.totalCost) });
    }));
    pairs.sort((a, b) => Number(a.overBudget) - Number(b.overBudget) || a.preferenceRank - b.preferenceRank || a.cost - b.cost);
    if (pairs[0]) ({ flight, hotel } = pairs[0]);
  }
  return { flight, hotel };
}
