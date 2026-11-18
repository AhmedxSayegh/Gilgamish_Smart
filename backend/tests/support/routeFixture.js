import { routeSchema } from "../../src/services/googleRoutesService.js";
export function createMockRoutesService(reason = "MOCK_MODE") {
  return {
    async compute(raw) {
      const input = routeSchema.parse(raw);
      const stops = [input.origin, ...input.intermediates, input.destination];
      const rad = (n) => n * Math.PI / 180;
      const speed = { DRIVE: 30, WALK: 5, BICYCLE: 15 }[input.travelMode];
      const legs = stops.slice(1).map((b, i) => {
        const a = stops[i];
        const h = Math.sin(rad(b.latitude - a.latitude) / 2) ** 2 +
          Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) *
          Math.sin(rad(b.longitude - a.longitude) / 2) ** 2;
        const distanceMeters = Math.round(6371000 * 2 * Math.asin(Math.sqrt(Math.min(1, h))));
        return { distanceMeters, durationSeconds: Math.ceil(distanceMeters / (speed * 1000 / 3600)) };
      });
      return {
        provider: "mock", isMock: true, fallbackReason: reason,
        warning: "Straight-line estimates; not navigable routes.",
        travelMode: input.travelMode, encodedPolyline: null, legs,
        distanceMeters: legs.reduce((sum, leg) => sum + leg.distanceMeters, 0),
        durationSeconds: legs.reduce((sum, leg) => sum + leg.durationSeconds, 0),
      };
    },
  };
}
