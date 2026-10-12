import { cents } from "../utils/currency.js";
import { AppError } from "../utils/errors.js";
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
export function rankPlaces(places, input) {
  return places
    .map((p) => ({
      ...p,
      rankScore:
        input.interests.reduce(
          (score, interest) =>
            score +
            (matching[interest] || []).some((tag) =>
              (p.types || [p.type]).some((type) => type.includes(tag)),
            ) *
              10,
          0,
        ) + (p.rating || 0),
    }))
    .sort((a, b) => b.rankScore - a.rankScore)
    .slice(0, 45);
}
export function selectOffers(
  candidates,
  input,
  { cheaper = false, flightId, hotelId } = {},
) {
  let flights = candidates.flights.filter((x) => x.currency === input.currency),
    hotels = candidates.hotels.filter((x) => x.currency === input.currency);
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
  const flight = flightId
    ? flights.find((f) => f.id === flightId)
    : cheaper
      ? [...flights].sort(cheapest)[0]
      : flights[0];
  const hotel = hotelId
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
  return { flight, hotel };
}
