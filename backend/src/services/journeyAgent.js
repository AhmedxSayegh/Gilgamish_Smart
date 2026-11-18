import { dailyWindows, validateItinerary, isOpen, transferMinutes } from "./itineraryService.js";
import { calculateBudget } from "./budgetService.js";
import { matchedInterests, rankPlaces } from "./rankingService.js";
import { cents } from "../utils/currency.js";
import { minutes, clock } from "../utils/dates.js";
import { AppError } from "../utils/errors.js";

// Bounded planning and repair; the active engine uses local rules, not language-model calls.
const repairable = new Set(["INVALID_ITINERARY", "UNKNOWN_FLIGHT", "UNKNOWN_HOTEL", "UNKNOWN_PLACE", "INVALID_DAYS", "INVALID_DAY", "DUPLICATE_PLACE", "INVALID_TIME", "FLIGHT_TIME_CONFLICT", "CLOSED_PLACE", "SCHEDULE_OVERLAP", "ROUTE_TIME_CONFLICT", "LOCAL_AI_INVALID_PLAN"]);
const fingerprint = (days) => JSON.stringify(days.map((d) => [d.dayNumber, d.items.map((i) => [i.placeId, i.startTime, i.endTime])]));

export function evaluateJourney(days, context) {
  const { input, flight, hotel, places } = context;
  const budget = calculateBudget(input, flight, hotel, [...(context.keptDays || []), ...days]);
  const fixed = calculateBudget(input, flight, hotel, context.keptDays || []);
  const windows = dailyWindows(input, flight, context.onlyDay);
  const supported = input.interests.filter((interest) => places.some((p) => matchedInterests(p, [interest]).length));
  const covered = new Set(days.flatMap((day) => day.items.flatMap((item) => matchedInterests(item.place, input.interests))));
  const missing = supported.filter((i) => !covered.has(i));
  const emptyDays = days.filter((day) => !day.items.length && windows.find((w) => w.dayNumber === day.dayNumber)?.canVisit).map((d) => d.dayNumber);
  const visits = days.flatMap((d) => d.items.map((i) => i.placeId));
  const repeatedVisits = visits.length - new Set(visits).size;
  const exceededByActivities = budget.overBudget && !fixed.overBudget;
  const issues = [
    ...(fixed.overBudget ? ["FIXED_COSTS_OVER_BUDGET"] : []),
    ...(exceededByActivities ? ["ACTIVITY_COSTS_OVER_BUDGET"] : []),
    ...(missing.length ? ["MISSING_SUPPORTED_INTERESTS"] : []),
    ...(emptyDays.length ? ["EMPTY_VISITABLE_DAYS"] : []),
    ...(repeatedVisits ? ["REPEATED_VISITS"] : []),
  ];
  // Unknown fees are not treated as zero-cost evidence of affordability.
  const score = covered.size * 20 + Math.min(new Set(visits).size, 50) - missing.length * 10 - emptyDays.length * 15 - repeatedVisits * 3 - (budget.overBudget ? 100 : 0);
  return { budget, score, issues, missingInterests: missing, unsupportedInterests: input.interests.filter((i) => !supported.includes(i)), emptyDays, repeatedVisits,
    knownCostsWithinBudget: !budget.overBudget, unknownActivityCount: budget.unknownActivityCount };
}

async function checkRoutes(raw, context, providers, cache) {
  if (providers.modes?.routes !== "google") return { raw, checkedDays: 0, uncheckedDays: raw.days.filter((d) => d.items.length > 1).length, routeTransfers: new Map() };
  const days = [], routeTransfers = new Map(); let checkedDays = 0, uncheckedDays = 0, trimmedActivities = 0;
  for (const day of raw.days) {
    const items = [...day.items].sort((a, b) => a.startTime.localeCompare(b.startTime));
    if (items.length < 2) { days.push({ ...day, items }); continue; }
    const byId = new Map(context.places.map((p) => [p.id, p]));
    const points = items.map((i) => byId.get(i.placeId));
    if (points.some((p) => ![p?.latitude, p?.longitude].every(Number.isFinite))) {
      uncheckedDays++; days.push({ ...day, items }); continue;
    }
    const key = JSON.stringify(points.map((p) => [p.id, p.latitude, p.longitude]));
    let route = cache.get(key);
    if (!route) {
      route = await providers.routes.compute({
        origin: { latitude: points[0].latitude, longitude: points[0].longitude },
        destination: { latitude: points.at(-1).latitude, longitude: points.at(-1).longitude },
        intermediates: points.slice(1, -1).map(({ latitude, longitude }) => ({ latitude, longitude })), travelMode: "DRIVE",
      });
      if (route.provider !== "google" || route.isMock || route.legs?.length !== items.length - 1 || route.legs.some((leg) => !Number.isFinite(leg.durationSeconds) || leg.durationSeconds < 0))
        throw new AppError(502, "INVALID_ROUTE_RESPONSE", "Routes did not return a verified duration for every transfer.");
      cache.set(key, route);
    }
    const window = dailyWindows(context.input, context.flight, day.dayNumber)[0];
    const adjusted = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i], place = points[i];
      // The validated arrival-day Umrah has its own round-the-clock window.
      if (!i && context.input.destinationCode === "QCA" && day.dayNumber === 1) {
        adjusted.push(item);
        continue;
      }
      let start = minutes(item.startTime);
      const duration = minutes(item.endTime) - start;
      if (i) {
        const gap = Math.max(transferMinutes(points[i - 1], place), Math.ceil(route.legs[i - 1].durationSeconds / 60));
        routeTransfers.set(`${day.dayNumber}:${items[i - 1].placeId}:${item.placeId}`, gap);
        start = Math.max(start, minutes(adjusted.at(-1).endTime) + gap);
      }
      while (start + duration <= minutes(window.endTime) && !isOpen(place, window.date, start, start + duration)) start += 15;
      if (start + duration > minutes(window.endTime)) {
        if (providers.plannerMode === "rules" || providers.aiMode === "rules") {
          // Retain only the verified prefix. Skipping into the suffix would require a new route.
          trimmedActivities += items.length - i;
          break;
        }
        throw new AppError(422, "ROUTE_TIME_CONFLICT", "The selected activities do not fit verified route durations. Choose fewer or closer places.", { routeTransfers: [...routeTransfers] });
      }
      adjusted.push({ ...item, startTime: clock(start), endTime: clock(start + duration) });
    }
    checkedDays++; days.push({ ...day, items: adjusted });
  }
  return { raw: { ...raw, days }, checkedDays, uncheckedDays, routeTransfers, trimmedActivities };
}

export function createJourneyAgent(providers, { maxDrafts = 3 } = {}) {
  const limit = Math.max(1, Math.min(3, maxDrafts));
  return {
    async plan(context) {
      context = { ...context, places: [...context.places] };
      let best, lastError, stopReason = "attempt_limit";
      let additionalPlaceSearches = 0;
      const attempts = [], seen = new Set(), routeCache = new Map();
      let feedback = [];
      const confirmedTransfers = new Map();
      for (let attempt = 1; attempt <= limit; attempt++) {
        let ranked = [...context.places];
        if (feedback.length && best) ranked.sort((a, b) => {
          const priority = (p) => matchedInterests(p, best.evaluation.missingInterests).length * 100 - (p.estimatedCost == null ? 0 : Math.min(90, cents(p.estimatedCost) / 1000));
          return priority(b) - priority(a);
        });
        try {
          const raw = await providers.ai.generate({ ...context, places: ranked, agentFeedback: feedback, planningAttempt: attempt,
            planningHints: { strategy: attempt === 2 ? "coverage" : attempt === 3 ? "compact" : "balanced", routeTransfers: confirmedTransfers },
            dailyWindows: dailyWindows(context.input, context.flight, context.onlyDay) });
          // Reject invented IDs/times before any route requests.
          validateItinerary(raw, context);
          const routeCheck = await checkRoutes(raw, context, providers, routeCache);
          routeCheck.routeTransfers.forEach((gap, pair) => confirmedTransfers.set(pair, gap));
          const days = validateItinerary(routeCheck.raw, { ...context, routeTransfers: routeCheck.routeTransfers });
          const evaluation = evaluateJourney(days, context);
          attempts.push({ attempt, valid: true, score: evaluation.score, issues: evaluation.issues });
          const affordableIsBetter = best && best.evaluation.budget.overBudget && !evaluation.budget.overBudget;
          const sameAffordability = best && best.evaluation.budget.overBudget === evaluation.budget.overBudget;
          if (!best || affordableIsBetter || (sameAffordability && evaluation.score > best.evaluation.score)) best = { days, evaluation, routeCheck };
          const missing = [...new Set([...evaluation.missingInterests, ...evaluation.unsupportedInterests])];
          let refreshed = false;
          if (attempt < limit && additionalPlaceSearches === 0 && missing.length && context.refreshPlaces) {
            additionalPlaceSearches++;
            const returned = await context.refreshPlaces(missing);
            const previousIds = new Set(context.places.map((p) => p.id));
            context.places = rankPlaces([...context.places, ...returned], { ...context.input, anchor: context.hotel });
            refreshed = context.places.some((p) => !previousIds.has(p.id));
          }
          const signature = fingerprint(days);
          if (!refreshed && seen.has(signature)) { stopReason = "repeated_result"; break; }
          seen.add(signature);
          const canImprove = evaluation.issues.some((i) => i !== "FIXED_COSTS_OVER_BUDGET");
          if (!canImprove && !refreshed) { stopReason = "goals_met"; break; }
          feedback = [
            ...(evaluation.missingInterests.length ? [`Include candidate types matching: ${evaluation.missingInterests.join(", ")}.`] : []),
            ...(evaluation.emptyDays.length ? [`Fill visitable days ${evaluation.emptyDays.join(", ")} when a valid activity fits.`] : []),
            ...(evaluation.repeatedVisits ? ["Avoid revisiting places when distinct alternatives fit."] : []),
            ...(evaluation.budget.overBudget ? ["Known costs exceed the budget. Keep selected flights/hotels unchanged; choose fewer or cheaper activities. Unknown fees remain unknown."] : []),
          ];
        } catch (error) {
          if (!repairable.has(error.code)) throw error;
          lastError = error;
          for (const [pair, gap] of error.details?.routeTransfers || []) confirmedTransfers.set(pair, gap);
          attempts.push({ attempt, valid: false, code: error.code });
          feedback = [`Repair the itinerary: ${error.code}. ${error.message} Keep the supplied flight/hotel IDs. Only use supplied places.`];
        }
      }
      if (!best) throw lastError || new AppError(502, "AGENT_NO_VALID_PLAN", "No valid plan could be generated. Your trip is preserved.");
      best.evaluation = evaluateJourney(best.days, context);
      const { evaluation, days, routeCheck } = best;
      return {
        days,
        warnings: [
          ...(evaluation.issues.length ? ["AGENT_REVIEW_REQUIRED"] : []),
          ...(evaluation.unsupportedInterests.length ? ["INTERESTS_UNAVAILABLE"] : []),
          ...(routeCheck.uncheckedDays ? ["TRANSFER_TIMES_ARE_ESTIMATES"] : []),
          ...(providers.plannerMode === "rules" || providers.aiMode === "rules" || providers.plannerMode === "qwen" || providers.aiMode === "qwen" ? ["ACTIVITY_DURATIONS_ARE_ESTIMATES"] : []),
          ...(routeCheck.trimmedActivities ? ["ROUTE_ACTIVITIES_REDUCED"] : []),
        ],
        report: {
          version: 2, mode: "bounded", plannerProvider: providers.plannerMode || providers.aiMode || providers.modes?.ai || "mock",
          status: evaluation.issues.length ? "needs_review" : "validated",
          stopReason, maxDrafts: limit, attempts, selectedFlightId: context.flight.id, selectedHotelId: context.hotel.id,
          tools: { additionalPlaceSearches, candidateCount: context.places.length },
          checks: { supportedInterestCoverage: evaluation.missingInterests.length === 0, knownCostsWithinBudget: evaluation.knownCostsWithinBudget,
            unknownActivityCount: evaluation.unknownActivityCount, emptyVisitableDays: evaluation.emptyDays.length,
            repeatedVisits: evaluation.repeatedVisits, routeCheckedDays: routeCheck.checkedDays, routeUncheckedDays: routeCheck.uncheckedDays, routeTrimmedActivities: routeCheck.trimmedActivities || 0 },
          issues: evaluation.issues, unsupportedInterests: evaluation.unsupportedInterests,
          limitations: ["Unknown activity fees remain unknown", "Validated schedules do not guarantee real-world availability"],
        },
      };
    },
  };
}
