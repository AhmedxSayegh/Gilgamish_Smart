import { Router } from "express";
import { z } from "zod";
import { idSchema } from "../validators/schemas.js";
import { tripInput } from "../services/tripPlannerService.js";
import { success } from "../utils/errors.js";
import { recommendOffers } from "../services/recommendationService.js";
import { routeSchema } from "../services/googleRoutesService.js";
import { AppError } from "../utils/errors.js";
export function searchRoutes({ repository, providers, generationLimiter, hotelLimiter = generationLimiter }) {
  const router = Router();
  router.post("/flights/booking-links", generationLimiter, async (req, res) => {
    const { offerId } = z.object({ offerId: z.string().min(1).max(255).regex(/^[a-zA-Z0-9_-]+$/) }).strict().parse(req.body);
    if (!providers.flightBookingLinks) throw new AppError(503, "BOOKING_LINKS_UNAVAILABLE", "Booking link lookup is not available.");
    success(res, await providers.flightBookingLinks(offerId));
  });
  router.post("/routes/compute", async (req, res) => success(res, await providers.routes.compute(routeSchema.parse(req.body))));
  const input = async (req) =>
    tripInput(
      await repository.getTrip(req.user.id, idSchema.parse(req.query.tripId)),
    );
  router.get("/recommendations", hotelLimiter, async (req, res) => {
    const trip = await input(req);
    const [flights, hotels] = await Promise.all([
      providers.travel.flights(trip),
      providers.travel.hotels(trip),
    ]);
    success(res, { mode: providers.mode, ...recommendOffers({ flights, hotels }, trip) });
  });
  router.get("/destinations/search", async (req, res) => {
    const query = z.string().trim().min(2).max(60).parse(req.query.q);
    const demoCities = await providers.travel.destinations(query);
    let airports = [];
    if (providers.searchAirports) {
      try {
        airports = await providers.searchAirports(query);
      } catch (error) {
        // Local city matches remain usable during a provider outage. Unknown
        // destinations still return the real error rather than an empty list.
        if (!demoCities.length) throw error;
      }
    }
    const seen = new Set(demoCities.map(city => city.code));
    success(res, [...demoCities, ...airports.filter(airport => !seen.has(airport.code))]);
  });
  router.get("/flights/search", async (req, res) =>
    success(res, {
      mode: providers.modes ? (providers.modes.flights === "mock" ? "mock" : "live") : providers.mode,
      offers: await providers.travel.flights(await input(req)),
    }),
  );
  router.get("/places/search", async (req, res) =>
    success(res, {
      mode: providers.modes ? (providers.modes.places === "mock" ? "mock" : "live") : providers.mode,

      places: await providers.places.search(await input(req)),
    }),
  );
  router.get("/places/:id", async (req, res) =>
    success(
      res,
      await providers.places.details(
        z.string().min(1).max(255).parse(req.params.id),
        req.user.language,
      ),
    ),
  );
  return router;
}
