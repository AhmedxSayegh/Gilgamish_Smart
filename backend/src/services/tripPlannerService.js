import { tripSchema } from "../validators/schemas.js";
import { AppError, requireCondition } from "../utils/errors.js";
import { dailyWindows, validateItinerary } from "./itineraryService.js";
import { calculateBudget, budgetAlternatives } from "./budgetService.js";
import { rankPlaces, selectOffers } from "./rankingService.js";
import { TtlCache } from "../providers/http.js";
import { createJourneyAgent } from "./journeyAgent.js";
import { flightCodeFor } from "../../../shared/demoCities.mjs";
export function tripInput(trip) {
  const {
    origin,
    destination,
    originCode,
    destinationCode,
    startDate,
    endDate,
    adults,
    children,
    totalBudget,
    currency,
    language,
    interests,
    preferences,
  } = trip;
  return tripSchema.parse({
    origin,
    destination,
    originCode,
    destinationCode,
    startDate,
    endDate,
    adults,
    children,
    totalBudget,
    currency,
    language,
    interests,
    preferences,
  });
}
export function createTripPlannerService(repository, providers) {
  const agent = createJourneyAgent(providers, { maxDrafts: providers.aiMode === "qwen" ? 2 : 3 });
  const cached = new TtlCache(50),
    inFlight = new Set();
  const key = (userId, tripId, input) =>
    JSON.stringify([userId, tripId, input]);
  async function candidates(userId, tripId, input, refresh = false) {
    const cacheKey = key(userId, tripId, input),
      saved = cached.get(cacheKey);
    if (saved && !refresh) return saved;
    const result = await Promise.allSettled([
      providers.travel.flights(input),
      providers.travel.hotels(input),
      providers.places.search(input),
    ]);
    const names = ["flights", "hotels", "places"],
      data = {};
    result.forEach((r, i) => {
      data[names[i]] = r.status === "fulfilled" ? r.value : [];
    });
    const errors = result.flatMap((r, i) =>
      r.status === "rejected"
        ? [
            {
              service: names[i],
              code: r.reason.code || "PROVIDER_UNAVAILABLE",
              message: r.reason.message,
            },
          ]
        : [],
    );
    if (errors.length)
      throw new AppError(
        502,
        "TRAVEL_DATA_UNAVAILABLE",
        "Some travel data could not be retrieved. Your trip is saved; retry the failed search.",
        { tripId, errors, available: data },
      );
    if (!data.places.length)
      throw new AppError(
        422,
        "NO_PLACES",
        "No places were found for this destination.",
        { tripId, available: data },
      );
    // Only development fixtures are retained here; live Places content stays request-scoped.
    if (providers.mode === "mock") cached.set(cacheKey, data, 60000);
    return data;
  }
  function assemble(input, selected, days, warnings = []) {
    const budget = calculateBudget(
      input,
      selected.flight,
      selected.hotel,
      days,
    );
    const list = [...warnings];
    for (const place of days.flatMap(d => d.items.map(i => i.place))) list.push(...(place.sourceWarnings || []));
    if (days.some(d => d.items.some(i => i.place.provider === "dataset"))) list.push("DATASET_DETAILS_UNVERIFIED");
    if (flightCodeFor(input.originCode) !== input.originCode || flightCodeFor(input.destinationCode) !== input.destinationCode) list.push("CITY_AIRPORT_TRANSFER_UNQUOTED");
    if (selected.flight.conversion) list.push("ESTIMATED_CURRENCY_CONVERSION");
    if (providers.mode !== "live") list.push("DEVELOPMENT_FIXTURES");
    list.push(
      "PRICES_ARE_SNAPSHOTS",
      "PROVIDER_LINKS_OPEN_SEARCH",
      "TRANSFER_TIMES_ARE_ESTIMATES",
    );
    if (budget.overBudget) list.push("OVER_BUDGET");
    if (!budget.isComplete) list.push("ACTIVITY_PRICES_UNKNOWN");
    if (days.some((d) => d.items.some((i) => i.place.openingHours == null)))
      list.push("OPENING_HOURS_UNVERIFIED");
    if (selected.hotel.stars == null)
      list.push("HOTEL_STAR_RATING_UNAVAILABLE");
    return {
      input,
      title:
        input.language === "ar"
          ? `رحلة إلى ${input.destination}`
          : `Your journey to ${input.destination}`,
      mode: providers.mode,
      flight: selected.flight,
      hotel: selected.hotel,
      days,
      budget,
      warnings: [...new Set(list)],
    };
  }
  async function hydrate(userId, id) {
    const plan = await repository.getPlan(userId, id);
    const ids = [
      ...new Set(
        plan.days.flatMap((d) =>
          d.items
            .filter((i) => i.place.provider === "google")
            .map((i) => i.placeId),
        ),
      ),
    ];
    const details = new Map();
    let quotaExceeded = false;
    // Bound provider concurrency and keep saved schedules available on refresh failures.
    for (let i = 0; i < ids.length; i += 5) {
      const batch = ids.slice(i, i + 5);
      const results = await Promise.allSettled(
        batch.map((id) => providers.places.details(id, plan.input.language)),
      );
      results.forEach((r, j) => {
        if (r.status === "fulfilled") details.set(batch[j], r.value);
        else if (r.reason?.details?.upstreamStatus === 429) quotaExceeded = true;
      });
      if (quotaExceeded) break;
    }
    for (const d of plan.days)
      for (const i of d.items) {
        if (details.has(i.placeId)) i.place = {
          ...details.get(i.placeId),
          ...(i.place.datasetMatches?.length ? { sources: ["google", "dataset"], datasetMatches: i.place.datasetMatches } : {}),
        };
      }
    if (ids.some((id) => !details.has(id)))
      plan.warnings = [
        ...new Set([...plan.warnings, "PLACE_DETAILS_UNAVAILABLE"]),
      ];
    if (quotaExceeded) plan.warnings = [...new Set([...plan.warnings, "PLACE_DETAILS_QUOTA_EXCEEDED"])];
    return plan;
  }
  async function locked(userId, tripId, work) {
    const lock = `${userId}:${tripId}`;
    if (inFlight.has(lock))
      throw new AppError(
        409,
        "GENERATION_IN_PROGRESS",
        "This trip is already being generated.",
      );
    inFlight.add(lock);
    try {
      return await work();
    } finally {
      inFlight.delete(lock);
    }
  }
  async function persist(userId, tripId, plan) {
    const saved = await repository.createPlan(userId, tripId, plan);
    return { ...saved, days: plan.days };
  }
  return {
    hydrate,
    async generate(userId, tripId, changes = {}, oldPlan = null) {
      const trip = await repository.getTrip(userId, tripId);
      return locked(userId, tripId, async () => {
        const input = structuredClone(oldPlan?.input || tripInput(trip));
        if (changes.pace) input.preferences.pace = changes.pace;
        if (changes.interest)
          input.interests = [
            changes.interest,
            ...input.interests.filter((i) => i !== changes.interest),
          ];
        const selection = oldPlan && !changes.cheaper ? { ...changes,
          flightId: changes.flightId || oldPlan.flight.id, hotelId: changes.hotelId || oldPlan.hotel.id } : changes;
        const found = await candidates(userId, tripId, input, !!oldPlan),
          selected = selectOffers(found, input, selection),
          places = rankPlaces(found.places, { ...input, anchor: selected.hotel });
        if (!places.length) throw new AppError(422, "NO_PLACES", "No valid open places with coordinates were found for this destination.");
        const context = {
          input,
          ...selected,
          places,
          instruction: changes.instruction || "",
          variant: oldPlan?.version || 0,
          refreshPlaces: (interests) => providers.places.search({ ...input, interests }),
        };
        let result;
        try {
          result = await agent.plan(context);
        } catch (error) {
          error.details = { ...error.details, tripId, available: found };
          throw error;
        }
        const plan = assemble(input, selected, result.days, result.warnings);
        plan.agent = { ...result.report, scope: "full_plan" };
        const saved = await persist(userId, tripId, plan);
        return {
          ...saved,
          alternatives: budgetAlternatives(
            selected.flight,
            selected.hotel,
            found,
            input.currency,
          ),
        };
      });
    },
    async regenerateDay(userId, planId, dayNumber, changes) {
      requireCondition(
        !changes.flightId && !changes.hotelId && !changes.cheaper,
        "DAY_SELECTION_UNCHANGED",
        "Change flight/hotel selection using full-plan regeneration; day regeneration preserves them.",
      );
      const old = await hydrate(userId, planId);
      return locked(userId, old.tripId, async () => {
        requireCondition(
          old.days.some((d) => d.dayNumber === dayNumber),
          "INVALID_DAY",
          "This plan does not contain that day.",
        );
        const input = structuredClone(old.input);
        if (changes.pace) input.preferences.pace = changes.pace;
        if (changes.interest)
          input.interests = [changes.interest, ...input.interests.filter((i) => i !== changes.interest)];
        const places = rankPlaces(await providers.places.search(input), input),
          context = {
            input,
            flight: old.flight,
            hotel: old.hotel,
            places,
            onlyDay: dayNumber,
            keptDays: old.days.filter((day) => day.dayNumber !== dayNumber),
            instruction: changes.instruction,
            variant: old.version,
            refreshPlaces: (interests) => providers.places.search({ ...input, interests }),
          };
        const result = await agent.plan(context), [day] = result.days;
        const days = old.days.map((d) => (d.dayNumber === dayNumber ? day : d));
        return persist(
          userId,
          old.tripId,
          assemble(input, old, days, ["UNCHANGED_DAYS_KEEP_PREVIOUS_SCHEDULE"]),
        );
      });
    },
    async modifyDay(userId, planId, dayNumber, day) {
      const old = await hydrate(userId, planId);
      return locked(userId, old.tripId, async () => {
        requireCondition(
          day.dayNumber === dayNumber,
          "INVALID_DAY",
          "The day number must match the URL.",
        );
        const fresh = await providers.places.search(old.input, { allPages: true }),
          places = [
            ...new Map(
              [
                ...old.days
                  .flatMap((d) => d.items.map((i) => i.place))
                  .filter((p) => p.name),
                ...fresh,
              ].map((p) => [p.id, p]),
            ).values(),
          ];
        const [validated] = validateItinerary(
          {
            selectedFlightId: old.flight.id,
            selectedHotelId: old.hotel.id,
            days: [day],
          },
          {
            input: old.input,
            flight: old.flight,
            hotel: old.hotel,
            places,
            onlyDay: dayNumber,
          },
        );
        return persist(
          userId,
          old.tripId,
          assemble(
            old.input,
            old,
            old.days.map((d) => (d.dayNumber === dayNumber ? validated : d)),
          ),
        );
      });
    },
    async updateBudget(userId, planId, patch) {
      const old = await hydrate(userId, planId),
        input = structuredClone(old.input);
      if (patch.totalBudget !== undefined)
        input.totalBudget = patch.totalBudget;
      for (const k of ["foodDaily", "transportDaily", "otherCosts"])
        if (patch[k] !== undefined) input.preferences[k] = patch[k];
      tripSchema.parse(input);
      return locked(userId, old.tripId, () =>
        persist(userId, old.tripId, assemble(input, old, old.days)),
      );
    },
  };
}
