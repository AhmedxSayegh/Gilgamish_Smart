import { cents } from "../utils/currency.js";
import { calculateBudget } from "./budgetService.js";

// Rank only observed offers; never ask the language model to invent inventory.
export function recommendOffers(candidates, input) {
  const valid = (offers) => [...new Map(offers.filter((offer) => {
    if (!offer.id || offer.currency !== input.currency) return false;
    try { cents(offer.price); return true; } catch { return false; }
  }).map((offer) => [offer.id, offer])).values()];
  const flights = valid(candidates.flights), hotels = valid(candidates.hotels);
  const price = (offer) => cents(offer.price);
  const cheapest = (offers) => [...offers].sort((a, b) => price(a) - price(b))[0];
  const known = (value) => typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : Infinity;
  const compare = (a, b) => a === b ? 0 : a < b ? -1 : 1;
  const rank = (offers, kind, companion) => offers.map((offer) => {
    const overBudget = companion ? calculateBudget(input,
      kind === "flight" ? offer : companion,
      kind === "hotel" ? offer : companion, []).overBudget : null;
    const reasons = [];
    if (overBudget === true) reasons.push("overBudget");
    if (overBudget === false) reasons.push("budgetPossible");
    if (kind === "flight") {
      reasons.push(input.preferences.flightOption === "shortest" ? "durationPriority" : "pricePriority");
      if (input.preferences.directPreferred) reasons.push("stopsPriority");
    } else reasons.push("starsPriority");
    return { ...offer, recommendation: { overBudget, reasons } };
  }).sort((a, b) => {
    const budgetOrder = Number(a.recommendation.overBudget === true) - Number(b.recommendation.overBudget === true);
    if (budgetOrder) return budgetOrder;
    if (kind === "flight") {
      if (input.preferences.directPreferred) {
        const stops = compare(known(a.stops) + known(a.returnStops), known(b.stops) + known(b.returnStops));
        if (stops) return stops;
      }
      if (input.preferences.flightOption === "shortest") {
        const duration = compare(known(a.durationMinutes), known(b.durationMinutes));
        if (duration) return duration;
      }
    } else {
      const distance = (offer) => offer.stars == null ? Infinity : Math.abs(known(offer.stars) - input.preferences.hotelStars);
      const stars = compare(distance(a), distance(b));
      if (stars) return stars;
    }
    return price(a) - price(b) || String(a.id).localeCompare(String(b.id));
  }).slice(0, 3).map((offer, index) => ({ ...offer, recommendation: { ...offer.recommendation, rank: index + 1 } }));
  return { flights: rank(flights, "flight", cheapest(hotels)), hotels: rank(hotels, "hotel", cheapest(flights)) };
}
