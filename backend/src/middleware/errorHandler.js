import { ZodError } from "zod";
import { AppError } from "../utils/errors.js";
export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  if (error instanceof ZodError)
    return res
      .status(422)
      .json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Please check the submitted fields.",
          details: error.flatten(),
        },
      });
  if (error instanceof SyntaxError && error.status === 400)
    return res
      .status(400)
      .json({
        success: false,
        error: {
          code: "INVALID_JSON",
          message: "The request must contain valid JSON.",
        },
      });
  if (error.type === "entity.too.large")
    return res
      .status(413)
      .json({
        success: false,
        error: {
          code: "REQUEST_TOO_LARGE",
          message: "The request is too large.",
        },
      });
  const known = error instanceof AppError;
  if (known && /^(HOTEL_|SERPAPI_)/.test(error.code) && Number.isInteger(error.details?.retryAfter) && error.details.retryAfter > 0)
    res.setHeader("Retry-After", Math.min(86400, error.details.retryAfter));
  if (!known)
    console.error(
      JSON.stringify({
        level: "error",
        requestId: req.requestId,
        code: error.code || "INTERNAL_ERROR",
      }),
    );
  res
    .status(known ? error.status : 500)
    .json({
      success: false,
      error: {
        code: known ? error.code : "INTERNAL_ERROR",
        message: known
          ? error.message
          : "The request could not be completed. Please retry.",
        ...(known && error.details ? { details: error.details } : {}),
      },
      requestId: req.requestId,
    });
}
