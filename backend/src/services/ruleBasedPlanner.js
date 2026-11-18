import { dailyWindows, isOpen, transferMinutes } from "./itineraryService.js";
import { matchedInterests, distanceKm } from "./rankingService.js";
import { calculateBudget } from "./budgetService.js";
import { minutes, clock } from "../utils/dates.js";
import { cents } from "../utils/currency.js";
import { AppError } from "../utils/errors.js";
import { isGrandMosque } from "./makkahVisit.js";
import { umrahSlot } from "../../../shared/visitWindows.mjs";

const interestNames = {
  history: "التاريخ", culture: "الثقافة", museums: "المتاحف", food: "الطعام", cafes: "المقاهي",
  shopping: "التسوق", nature: "الطبيعة", beaches: "الشواطئ", photography: "التصوير",
  adventure: "المغامرة", family: "العائلة", nightlife: "الحياة الليلية", relaxation: "الاسترخاء",
  architecture: "العمارة", local: "التجارب المحلية",
};
const available = (place) => place.id && place.name && !["CLOSED_PERMANENTLY", "CLOSED_TEMPORARILY"].includes(place.businessStatus)
  && [place.latitude, place.longitude].every(Number.isFinite) && Math.abs(place.latitude) <= 90 && Math.abs(place.longitude) <= 180;
// These are explicit planning assumptions, not provider-verified visit durations.
export const visitDurationMinutes = (place) => (place.types || [place.type]).some((type) => /museum|art_gallery|zoo|aquarium/.test(type || "")) ? 90 : 60;

function visitSlot(place, earliest, window, duration = visitDurationMinutes(place)) {
  const end = minutes(window.endTime);
  for (let start = earliest; start + duration <= end; start += 15) {
    if (isOpen(place, window.date, start, start + duration)) return { start, end: start + duration };
  }
  return null;
}

function knownCost(place, input) {
  if (place.estimatedCost == null) return null;
  if (place.currency !== input.currency) return undefined;
  try { return cents(place.estimatedCost) * (input.adults + input.children); } catch { return undefined; }
}

function explanation(place, input, nearby) {
  const matches = matchedInterests(place, input.interests);
  const ar = input.language === "ar";
  const parts = [matches.length
    ? ar ? `مطابق لاهتماماتك: ${matches.map((i) => interestNames[i] || i).join("، ")}.` : `Matches your interests: ${matches.join(", ")}.`
    : ar ? "يضيف تنوعاً إلى أنشطة الرحلة." : "Adds variety to the available activities."];
  if (nearby !== null) parts.push(ar ? `المسافة المباشرة من المحطة السابقة نحو ${nearby.toFixed(1)} كم.` : `About ${nearby.toFixed(1)} km in a straight line from the previous stop.`);
  return parts.join(" ");
}

export function createRuleBasedPlanner() {
  return {
    async generate(context) {
      const { input, flight, hotel } = context;
      if (context.instruction?.trim()) throw new AppError(422, "FREE_TEXT_NOT_SUPPORTED", "Use the pace, interest and cheaper-offer controls to change this rule-based plan.");
      const windows = dailyWindows(input, flight, context.onlyDay);
      const places = [...new Map(context.places.filter(available).map((p) => [p.id, p])).values()];
      const kept = context.keptDays || [];
      const used = new Set(kept.flatMap((day) => day.items.map((item) => item.placeId)));
      const covered = new Set(kept.flatMap((day) => day.items.flatMap((item) => matchedInterests(item.place, input.interests))));
      const typeCounts = new Map();
      const base = calculateBudget(input, flight, hotel, kept);
      let remaining = Math.max(0, cents(input.totalBudget) - cents(base.totalCost));
      const max = { relaxed: 2, balanced: 3, busy: 5 }[input.preferences.pace];
      const attempt = context.planningAttempt || 1;
      const strategy = context.planningHints?.strategy || (attempt === 2 ? "coverage" : attempt === 3 ? "compact" : "balanced");
      const routeTransfers = context.planningHints?.routeTransfers || new Map();
      const scarceDays = new Map(places.map((place) => [place.id, windows.filter((w) => w.canVisit && visitSlot(place, minutes(w.startTime), w)).length]));
      const days = [];
      for (const window of windows) {
        const selections = [], selectedPlaces = [], dailyTypes = new Map();
        let cursor = minutes(window.startTime);
        if (input.destinationCode === "QCA" && window.dayNumber === 1) {
          const mosque = places.find(isGrandMosque);
          if (!mosque) throw new AppError(422, "HARAM_UNAVAILABLE", "The Grand Mosque could not be verified for this trip. Please retry.");
          const slot = umrahSlot(input, flight);
          if (!slot.fitsStay) throw new AppError(422, "HARAM_TIME_CONFLICT", "There is not enough time for Umrah before the return flight.");
          selections.push({ placeId: mosque.id, startTime: slot.startTime, endTime: slot.endTime,
            reason: input.language === "ar" ? "أداء العمرة في الحرم المكي" : "Perform Umrah at Masjid al-Haram" });
          selectedPlaces.push(mosque);
          used.add(mosque.id);
          remaining -= knownCost(mosque, input) || 0;
          matchedInterests(mosque, input.interests).forEach(i => covered.add(i));
          cursor = Math.max(cursor, slot.end);
        }
        while (window.canVisit && selections.length < max) {
          const previous = selectedPlaces.at(-1);
          const candidates = [];
          for (const place of places) {
            if (used.has(place.id)) continue;
            const cost = knownCost(place, input);
            if (cost === undefined || (cost !== null && cost > remaining)) continue;
            const pair = `${window.dayNumber}:${previous?.id}:${place.id}`;
            const gap = previous ? Math.max(transferMinutes(previous, place), routeTransfers.get(pair) || 0) : 0;
            const slot = visitSlot(place, cursor + gap, window);
            if (!slot) continue;
            const matches = matchedInterests(place, input.interests);
            const fresh = matches.filter((i) => !covered.has(i)).length;
            const distance = distanceKm(previous || hotel, place);
            const quality = Number.isFinite(place.rating) ? Math.max(0, Math.min(5, place.rating)) : 0;
            const scarcity = 1 / Math.max(1, scarceDays.get(place.id));
            const costPenalty = cost === null ? 1 : 10 * cost / Math.max(1, remaining);
            const modelPreference = context.modelRank?.[place.id];
            const modelBonus = Number.isInteger(modelPreference) ? Math.max(0, 12 - modelPreference) * 3 : 0;
            const wait = slot.start - cursor - gap;
            const score = fresh * (strategy === "coverage" ? 80 : 45) + matches.length * 10 + scarcity * 20 + quality
              + modelBonus
              - (dailyTypes.get(place.type) || 0) * 12 - (typeCounts.get(place.type) || 0) * 2
              - (distance === null ? 0 : distance * (strategy === "compact" ? 2 : 0.7)) - wait / 30 - costPenalty;
            const variant = Number.isInteger(context.variant) ? context.variant : 0;
            // Rotate exact-score ties on regeneration, never randomize constraints or prices.
            const index = places.indexOf(place);
            const tieOrder = (index - variant % Math.max(1, places.length) + places.length) % Math.max(1, places.length);
            candidates.push({ place, slot, cost, score, distance, tieOrder });
          }
          candidates.sort((a, b) => b.score - a.score || a.tieOrder - b.tieOrder || a.place.id.localeCompare(b.place.id));
          const chosen = candidates[0];
          if (!chosen) break;
          const { place, slot, cost } = chosen;
          selections.push({ placeId: place.id, startTime: clock(slot.start), endTime: clock(slot.end), reason: explanation(place, input, chosen.distance) });
          selectedPlaces.push(place); used.add(place.id);
          matchedInterests(place, input.interests).forEach((interest) => covered.add(interest));
          dailyTypes.set(place.type, (dailyTypes.get(place.type) || 0) + 1);
          typeCounts.set(place.type, (typeCounts.get(place.type) || 0) + 1);
          if (cost !== null) remaining -= cost;
          cursor = slot.end;
        }
        days.push({ dayNumber: window.dayNumber, date: window.date, items: selections });
      }
      return { selectedFlightId: flight.id, selectedHotelId: hotel.id, days };
    },
  };
}
