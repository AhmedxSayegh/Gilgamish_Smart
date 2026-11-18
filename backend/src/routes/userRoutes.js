import { Router } from "express";
import { profileSchema, preferencesSchema } from "../validators/schemas.js";
import { success } from "../utils/errors.js";
export function userRoutes({ repository }) {
  const router = Router();
  router.get("/me", (req, res) => success(res, req.user));
  router.patch("/me", async (req, res) =>
    success(
      res,
      await repository.updateUser(req.user.id, profileSchema.parse(req.body)),
    ),
  );
  router.get("/me/preferences", async (req, res) =>
    success(res, await repository.getPreferences(req.user.id)),
  );
  router.patch("/me/preferences", async (req, res) =>
    success(
      res,
      await repository.setPreferences(
        req.user.id,
        preferencesSchema.parse(req.body),
      ),
    ),
  );
  return router;
}
