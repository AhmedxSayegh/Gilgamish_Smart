import { Router } from "express";
import { z } from "zod";
import {
  idSchema,
  instructionSchema,
  daySchema,
  moneySchema,
} from "../validators/schemas.js";
import { success } from "../utils/errors.js";
import { AppError } from "../utils/errors.js";
export function planRoutes({ repository, planner, providers, generationLimiter }) {
  const router = Router(),
    planId = (req) => idSchema.parse(req.params.id),
    dayNumber = (req) =>
      z.coerce.number().int().min(1).max(22).parse(req.params.dayNumber);
  router.post("/generate", generationLimiter, async (req, res) => {
    const { tripId, ...selection } = z
      .object({
        tripId: idSchema,
        flightId: z.string().min(1).max(255).optional(),
        hotelId: z.string().min(1).max(255).optional(),
      })
      .strict()
      .parse(req.body);
    success(res, await planner.generate(req.user.id, tripId, selection), 201);
  });
  router.get("/:id", async (req, res) =>
    success(res, await planner.hydrate(req.user.id, planId(req))),
  );
  router.get("/:id/places", async (req, res) => {
    const plan = await repository.getPlan(req.user.id, planId(req));
    success(res, { places: await providers.places.search(plan.input, { allPages: true }) });
  });
  // Compute on demand, preserve activity order, and never persist Google route content.
  router.post("/:id/days/:dayNumber/route", generationLimiter, async (req, res) => {
    const { travelMode } = z.object({
      travelMode: z.enum(["DRIVE", "WALK", "BICYCLE"]).default("DRIVE"),
    }).strict().parse(req.body);
    const number = dayNumber(req);
    const plan = await planner.hydrate(req.user.id, planId(req));
    const day = plan.days.find((d) => d.dayNumber === number);
    if (!day) throw new AppError(404, "DAY_NOT_FOUND", "Day not found.");
    const items = [...day.items].sort((a, b) => a.startTime.localeCompare(b.startTime));
    if (items.length < 2) throw new AppError(422, "INSUFFICIENT_STOPS", "At least two activities are required.");
    const stops = items.map(({ place }) => ({ latitude: place.latitude, longitude: place.longitude }));
    if (stops.some((p) => !Number.isFinite(p.latitude) || !Number.isFinite(p.longitude)))
      throw new AppError(422, "ROUTE_COORDINATES_UNAVAILABLE", "Refresh place details before requesting this route.");
    success(res, {
      dayNumber: number, placeIds: items.map((i) => i.placeId),
      route: await providers.routes.compute({
        origin: stops[0], destination: stops.at(-1), intermediates: stops.slice(1, -1), travelMode,
      }),
    });
  });
  router.post("/:id/regenerate", generationLimiter, async (req, res) => {
    const changes = instructionSchema.parse(req.body),
      old = await repository.getPlan(req.user.id, planId(req));
    success(
      res,
      await planner.generate(req.user.id, old.tripId, changes, old),
      201,
    );
  });
  router.patch("/:id", async (req, res) => {
    const patch = z
      .object({
        title: z.string().trim().min(1).max(200).optional(),
        isSaved: z.boolean().optional(),
        isSelected: z.literal(true).optional(),
      })
      .strict()
      .parse(req.body);
    success(
      res,
      await repository.updatePlanFlags(req.user.id, planId(req), patch),
    );
  });
  router.delete("/:id", async (req, res) => {
    await repository.deletePlan(req.user.id, planId(req));
    success(res, { deleted: true });
  });
  router.patch("/:id/days/:dayNumber", async (req, res) =>
    success(
      res,
      await planner.modifyDay(
        req.user.id,
        planId(req),
        dayNumber(req),
        daySchema.parse(req.body),
      ),
      201,
    ),
  );
  router.post(
    "/:id/days/:dayNumber/regenerate",
    generationLimiter,
    async (req, res) =>
      success(
        res,
        await planner.regenerateDay(
          req.user.id,
          planId(req),
          dayNumber(req),
          instructionSchema.parse(req.body),
        ),
        201,
      ),
  );
  router.post("/:id/favorite", async (req, res) => {
    await repository.favorite(req.user.id, planId(req), true);
    success(res, { isFavorite: true });
  });
  router.delete("/:id/favorite", async (req, res) => {
    await repository.favorite(req.user.id, planId(req), false);
    success(res, { isFavorite: false });
  });
  router.get("/:id/budget", async (req, res) =>
    success(res, (await repository.getPlan(req.user.id, planId(req))).budget),
  );
  router.patch("/:id/budget", async (req, res) => {
    const patch = z
      .object({
        totalBudget: moneySchema.optional(),
        foodDaily: moneySchema.optional(),
        transportDaily: moneySchema.optional(),
        otherCosts: moneySchema.optional(),
      })
      .strict()
      .parse(req.body);
    success(
      res,
      await planner.updateBudget(req.user.id, planId(req), patch),
      201,
    );
  });
  return router;
}
