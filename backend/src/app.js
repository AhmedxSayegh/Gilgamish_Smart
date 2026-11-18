import { speechReply, streamSpeech } from "./services/speechService.js";
import { priceChat } from "./services/priceChat.js";
import { answerChat } from "./services/homeChat.js";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import { randomUUID } from "node:crypto";
import { AppError, success, missing } from "./utils/errors.js";
import { contactSchema } from "./validators/schemas.js";
import { createAuthService } from "./services/authService.js";
import { createTripPlannerService } from "./services/tripPlannerService.js";
import { authMiddleware } from "./middleware/auth.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { authRoutes } from "./routes/authRoutes.js";
import { userRoutes } from "./routes/userRoutes.js";
import { tripRoutes } from "./routes/tripRoutes.js";
import { searchRoutes } from "./routes/searchRoutes.js";
import { planRoutes } from "./routes/planRoutes.js";
import { hotelRoutes } from "./routes/hotelRoutes.js";
import attractionPricesRouter from "../routes/attraction-prices.mjs";
export function createApp({ repository, providers, config }) {
  const app = express();
  app.disable("x-powered-by");
  if (config.trustProxy) app.set("trust proxy", 1);
  app.use((req, res, next) => {
    req.requestId = randomUUID();
    res.setHeader("X-Request-Id", req.requestId);
    next();
  });
  app.use(helmet({ contentSecurityPolicy: { directives: { mediaSrc: ["'self'", "data:"] } } }));
  const clientOrigins = new Set([config.clientOrigin]);
  // The local site is opened under both loopback names. Keep the same protocol
  // and port; production and non-loopback origins retain an exact allowlist.
  if (!config.production) {
    const localOrigin = new URL(config.clientOrigin);
    if (localOrigin.origin === config.clientOrigin && localOrigin.protocol === "http:" &&
      ["localhost", "127.0.0.1"].includes(localOrigin.hostname)) {
      for (const hostname of ["localhost", "127.0.0.1"]) {
        const alias = new URL(localOrigin);
        alias.hostname = hostname;
        clientOrigins.add(alias.origin);
      }
    }
  }
  app.use((req, res, next) => {
    const origin = req.get("Origin");
    if (origin && !clientOrigins.has(origin))
      throw new AppError(403, "ORIGIN_DENIED", "This origin is not allowed.");
    next();
  });
  app.use(cors({ origin: [...clientOrigins], credentials: true }));
  const limit = (max, windowMs) =>
    rateLimit({
      windowMs,
      limit: max,
      standardHeaders: "draft-8",
      legacyHeaders: false,
      message: {
        success: false,
        error: {
          code: "RATE_LIMITED",
          message: "Too many requests. Please retry later.",
        },
      },
    });
  app.use("/api", limit(300, 15 * 60000));
  app.use(express.json({ limit: "100kb" }), cookieParser());
  app.use("/api", (req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    if (
      ["POST", "PATCH", "PUT"].includes(req.method) &&
      req.get("content-length") !== "0" &&
      !req.is("application/json")
    )
      throw new AppError(
        415,
        "JSON_REQUIRED",
        "Send JSON with Content-Type: application/json.",
      );
    next();
  });
  const auth = createAuthService(repository, config),
    protect = authMiddleware(auth),
    planner = createTripPlannerService(repository, providers);
  const deps = {
    repository,
    providers,
    config,
    auth,
    protect,
    planner,
    authLimiter: limit(30, 15 * 60000),
    generationLimiter: limit(20, 15 * 60000),
    hotelLimiter: rateLimit({
      windowMs: 15 * 60000, limit: 30, keyGenerator: req => req.user.id,
      standardHeaders: "draft-8", legacyHeaders: false,
      message: { success: false, error: { code: "HOTEL_RATE_LIMITED", message: "Too many hotel requests. Retry later." } },
    }),
  };
  app.get("/api/health", async (req, res) => {
    await repository.ping();
    success(res, { status: "ok", mode: providers.mode, services: providers.modes, aiMode: providers.aiMode, plannerEngine: providers.plannerMode || "mock", planningMode: "agent", chatbot: "enabled" });
  });
  app.post("/api/chat/speech-stream", limit(20, 60000), streamSpeech);
  app.post("/api/chat/speech", limit(20, 60000), async (req, res) => success(res, await speechReply(req.body)));
  app.post("/api/chat", limit(20, 60000), async (req, res) => success(res, await priceChat(req.body, providers) ?? await answerChat(req.body, config)));
  app.use("/api/auth", authRoutes(deps));
  app.post("/api/contact", limit(5, 3600000), async (req, res) =>
    success(
      res,
      await repository.createContact(contactSchema.parse(req.body)),
      201,
    ),
  );
  app.use("/api/users", protect, userRoutes(deps));
  app.use("/api/trips", protect, tripRoutes(deps));
  app.use("/api/plans", protect, planRoutes(deps));
  app.use("/api/hotels", protect, hotelRoutes(deps));

  app.use(
    "/api/attractions",
    ...(config.production ? [protect] : []),
    (req, res, next) => {
      res.locals.googlePlaces = providers.places;
      next();
    },
    attractionPricesRouter
  );
    app.get("/api/favorites", protect, async (req, res) =>
    success(res, await repository.listFavorites(req.user.id)),
  );
  app.use("/api", protect, searchRoutes(deps));
  app.use(() => {
    throw missing();
  });
  app.use(errorHandler);
  return app;
}
