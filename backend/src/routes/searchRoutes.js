import { Router } from "express";
import { z } from "zod";
import { idSchema } from "../validators/schemas.js";
import { tripInput } from "../services/tripPlannerService.js";
import { success } from "../utils/errors.js";
export function searchRoutes({ repository, providers }) {
  const router = Router();
  const input = async (req) =>
    tripInput(
      await repository.getTrip(req.user.id, idSchema.parse(req.query.tripId)),
    );
  router.get("/destinations/search", async (req, res) =>
    success(
      res,
      await providers.travel.destinations(
        z.string().trim().min(2).max(60).parse(req.query.q),
      ),
    ),
  );
  router.get("/flights/search", async (req, res) =>
    success(res, {
      mode: providers.mode,
      offers: await providers.travel.flights(await input(req)),
    }),
  );
  router.get("/hotels/search", async (req, res) =>
    success(res, {
      mode: providers.mode,
      offers: await providers.travel.hotels(await input(req)),
    }),
  );
  router.get("/places/search", async (req, res) =>
    success(res, {
      mode: providers.mode,
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
