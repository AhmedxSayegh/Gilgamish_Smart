import { cents, amount, sameCurrency } from "../utils/currency.js";
import { dayCount } from "../utils/dates.js";
export function calculateBudget(input, flight, hotel, days) {
  sameCurrency(flight, input.currency);
  sameCurrency(hotel, input.currency);
  let activity = 0,
    unknown = 0;
  for (const day of days)
    for (const item of day.items) {
      const p = item.place;
      if (p.estimatedCost == null) {
        unknown++;
        continue;
      }
      sameCurrency(p, input.currency);
      activity += cents(p.estimatedCost) * (input.adults + input.children);
    }
  const duration = dayCount(input.startDate, input.endDate),
    p = input.preferences;
  const entries = [
    [
      "flights",
      cents(flight.price),
      flight.provider === "mock" ? "development_fixture" : "search_snapshot",
      Boolean(flight.conversion),
    ],
    [
      "accommodation",
      cents(hotel.price),
      hotel.provider === "mock" ? "development_fixture" : "search_snapshot",
      false,
    ],
    [
      "activities",
      activity,
      unknown ? "partial_known_costs" : "development_fixture",
      true,
    ],
    [
      "food",
      cents(p.foodDaily) * duration * (input.adults + input.children),
      "user_allowance",
      true,
    ],
    ["transport", cents(p.transportDaily) * duration, "user_allowance", true],
    ["miscellaneous", cents(p.otherCosts), "user_allowance", true],
  ];
  const total = entries.reduce((sum, [, value]) => sum + value, 0),
    remaining = cents(input.totalBudget) - total;
  return {
    currency: input.currency,
    totalBudget: amount(cents(input.totalBudget)),
    totalCost: amount(total),
    remainingBudget: amount(remaining),
    overBudget: remaining < 0,
    unknownActivityCount: unknown,
    isComplete: unknown === 0,
    items: entries.map(([category, value, sourceType, isEstimated]) => ({
      category,
      amount: amount(value),
      sourceType,
      isEstimated,
    })),
  };
}
export function budgetAlternatives(flight, hotel, candidates, currency) {
  const options = [];
  for (const [kind, selected, list] of [
    ["flight", flight, candidates.flights],
    ["hotel", hotel, candidates.hotels],
  ])
    for (const offer of list) {
      if (offer.currency !== currency) continue;
      const saving = cents(selected.price) - cents(offer.price);
      if (saving > 0)
        options.push({
          kind,
          offerId: offer.id,
          saving: amount(saving),
          currency,
          observedAt: offer.observedAt,
        });
    }
  return options.sort((a, b) => cents(b.saving) - cents(a.saving)).slice(0, 5);
}
