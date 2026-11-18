import { timingSafeEqual } from "node:crypto";
import { AppError } from "../utils/errors.js";
export function authMiddleware(auth) {
  return async (req, res, next) => {
    const session = await auth.authenticate(req.cookies.gilgamish_session);
    if (!session)
      throw new AppError(401, "UNAUTHENTICATED", "Please sign in to continue.");
    req.user = session.user;
    req.csrfToken = session.csrfToken;
    if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
      const actual = Buffer.from(req.get("X-CSRF-Token") || ""),
        expected = Buffer.from(session.csrfToken);
      if (
        actual.length !== expected.length ||
        !timingSafeEqual(actual, expected)
      )
        throw new AppError(
          403,
          "CSRF_INVALID",
          "The request could not be verified. Refresh and retry.",
        );
    }
    next();
  };
}
