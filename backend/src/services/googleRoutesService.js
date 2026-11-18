import { z } from "zod";
import { fetchJson } from "../providers/http.js";
import { AppError } from "../utils/errors.js";

const point = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
}).strict();
export const routeSchema = z.object({
  origin: point,
  destination: point,
  intermediates: z.array(point).max(25).default([]),
  travelMode: z.enum(["DRIVE", "WALK", "BICYCLE"]).default("DRIVE"),
}).strict();
const waypoint = (p) => ({ location: { latLng: p } });

export function createGoogleRoutesService(config, fetchImpl = fetch) {
  return {
    async compute(raw) {
      const input = routeSchema.parse(raw);
      const data = await fetchJson("https://routes.googleapis.com/directions/v2:computeRoutes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": config.googleRoutesKey,
          "X-Goog-FieldMask": "routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline,routes.legs.distanceMeters,routes.legs.duration",
        },
        body: JSON.stringify({
          origin: waypoint(input.origin), destination: waypoint(input.destination),
          intermediates: input.intermediates.map(waypoint),
          travelMode: input.travelMode,
          ...(input.travelMode === "DRIVE" ? { routingPreference: "TRAFFIC_UNAWARE" } : {}),
        }),
      }, { provider: "GOOGLE_ROUTES", fetchImpl });
      const route = data.routes?.[0];
      if (!route) throw new AppError(422, "NO_ROUTE", "No route was found for these stops.");
      const seconds = (value) => {
        if (typeof value !== "string" || !/^\d+(\.\d+)?s$/.test(value))
          throw new AppError(502, "INVALID_ROUTE_RESPONSE", "Route duration is unavailable.");
        return Number(value.slice(0, -1));
      };
      return {
        provider: "google", isMock: false, travelMode: input.travelMode,
        distanceMeters: route.distanceMeters, durationSeconds: seconds(route.duration),
        encodedPolyline: route.polyline?.encodedPolyline || null,
        legs: (route.legs || []).map((leg) => ({
          distanceMeters: leg.distanceMeters, durationSeconds: seconds(leg.duration),
        })),
      };
    },
  };
}

