import { Router } from "express";
import { registerSchema, loginSchema } from "../validators/schemas.js";
import { success } from "../utils/errors.js";
export function authRoutes({ auth, protect, config, authLimiter }) {
  const router = Router();
  const cookieOptions = {
    httpOnly: true,
    secure: config.production || config.clientOrigin.startsWith("https://"),
    sameSite: "lax",
    path: "/",
  };
  const finish = async (req, res, result, status) => {
    await auth.logout(req.cookies.gilgamish_session);
    res.cookie("gilgamish_session", result.token, {
      ...cookieOptions,
      expires: result.expiresAt,
    });
    return success(
      res,
      { user: result.user, csrfToken: result.csrfToken },
      status,
    );
  };
  router.post("/register", authLimiter, async (req, res) =>
    finish(req, res, await auth.register(registerSchema.parse(req.body)), 201),
  );
  router.post("/login", authLimiter, async (req, res) =>
    finish(req, res, await auth.login(loginSchema.parse(req.body)), 200),
  );
  router.get("/me", protect, (req, res) =>
    success(res, { user: req.user, csrfToken: req.csrfToken }),
  );
  router.post("/logout", protect, async (req, res) => {
    await auth.logout(req.cookies.gilgamish_session);
    res.clearCookie("gilgamish_session", cookieOptions);
    success(res, { loggedOut: true });
  });
  return router;
}
