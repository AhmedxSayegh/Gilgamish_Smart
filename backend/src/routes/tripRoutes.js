import { Router } from "express";
import { parseNewTrip, idSchema } from "../validators/schemas.js";
import { tripInput } from "../services/tripPlannerService.js";
import { success } from "../utils/errors.js";
export function tripRoutes({ repository }) {
  const router = Router();
  router.post("/", async (req, res) =>
    success(
      res,
      await repository.createTrip(req.user.id, parseNewTrip(req.body)),
      201,
    ),
  );
  router.get("/", async (req, res) =>
    success(res, await repository.listTrips(req.user.id)),
  );
  router.get("/:id", async (req, res) =>
    success(
      res,
      await repository.getTrip(req.user.id, idSchema.parse(req.params.id)),
    ),
  );
  router.patch("/:id", async (req, res) => {
    const id = idSchema.parse(req.params.id),
      old = await repository.getTrip(req.user.id, id);
    const input = parseNewTrip({ ...tripInput(old), ...req.body });
    success(res, await repository.updateTrip(req.user.id, id, input));
  });
  router.delete("/:id", async (req, res) => {
    await repository.deleteTrip(req.user.id, idSchema.parse(req.params.id));
    success(res, { deleted: true });
  });
  return router;
}
