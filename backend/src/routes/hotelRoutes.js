import { Router } from "express";
import { z } from "zod";
import { idSchema } from "../validators/schemas.js";
import { tripInput } from "../services/tripPlannerService.js";
import { hotelTokenSchema } from "../services/serpapiHotelsService.js";
import { AppError, success } from "../utils/errors.js";

const contextSchema = z
  .object({ tripId: idSchema.optional(), planId: idSchema.optional() })
  .strict()
  .refine(
    (value) => Boolean(value.tripId) !== Boolean(value.planId),
    "Supply exactly one tripId or planId.",
  );

export function hotelRoutes({ repository, providers, hotelLimiter }) {
  const router = Router();
  router.use(hotelLimiter);
  async function context(req) {
    const { tripId, planId } = contextSchema.parse(req.query);
    // Saved versions use their original dates/occupancy, even if the trip was edited later.
    return tripInput(
      planId
        ? (await repository.getPlan(req.user.id, planId)).input
        : await repository.getTrip(req.user.id, tripId),
    );
  }
  router.get("/search", async (req, res) =>
    success(res, {
      mode: providers.modes
        ? providers.modes.hotels === "mock"
          ? "mock"
          : "live"
        : providers.mode,
      offers: await providers.travel.hotels(await context(req)),
    }),
  );
  for (const [suffix, method] of [
    ["", "details"],
    ["/prices", "prices"],
    ["/booking-links", "bookingLinks"],
  ]) {
    router.get(`/:propertyToken${suffix}`, async (req, res) => {
      const token = hotelTokenSchema.parse(req.params.propertyToken);
      const trip = await context(req);
      if (!providers.hotels)
        throw new AppError(
          503,
          "HOTEL_DETAILS_UNAVAILABLE",
          "Hotel details and prices are not available with the selected provider.",
        );
      success(res, await providers.hotels[method](token, trip));
    });
  }
  return router;
}
