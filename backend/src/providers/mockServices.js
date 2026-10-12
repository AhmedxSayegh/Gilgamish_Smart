import { amount } from "../utils/currency.js";
import { dayCount, minutes, clock } from "../utils/dates.js";
import {
  dailyWindows,
  isOpen,
  transferMinutes,
} from "../services/itineraryService.js";
import {
  flightSearchLink,
  hotelSearchLink,
} from "../services/amadeusService.js";
import { AppError } from "../utils/errors.js";
export const mockCities = [
  ["JED", "Jeddah", 21.49, 39.19],
  ["RUH", "Riyadh", 24.71, 46.68],
  ["IST", "Istanbul", 41.01, 28.98],
  ["PAR", "Paris", 48.85, 2.35],
  ["DXB", "Dubai", 25.2, 55.27],
  ["LON", "London", 51.51, -0.12],
  ["AMM", "Amman", 31.95, 35.93],
].map(([code, name, latitude, longitude]) => ({
  id: `mock-city-${code}`,
  code,
  cityCode: code,
  name,
  latitude,
  longitude,
}));
const bases = {
  SAR: 140000,
  USD: 37500,
  EUR: 34000,
  GBP: 29500,
  AED: 138000,
  TRY: 1400000,
};
function placesFor(t) {
  const city = mockCities.find((x) => x.code === t.destinationCode);
  if (!city)
    throw new AppError(
      422,
      "MOCK_DESTINATION_UNSUPPORTED",
      "Choose a destination from the development city list.",
    );
  const types = [
    "museum",
    "historical_landmark",
    "park",
    "restaurant",
    "cafe",
    "shopping_mall",
    "art_gallery",
    "tourist_attraction",
    "museum",
    "park",
    "restaurant",
    "historical_landmark",
  ];
  return types.map((type, i) => ({
    id: `mock-place-${city.code}-${i + 1}`,
    provider: "mock",
    name:
      t.language === "ar"
        ? `موقع تجريبي ${i + 1} — ${city.name}`
        : `Development ${type.replaceAll("_", " ")} ${i + 1} — ${city.name}`,
    type,
    types: [type],
    latitude: Number((city.latitude + i * 0.001).toFixed(6)),
    longitude: Number((city.longitude + i * 0.001).toFixed(6)),
    address: `Development fixture, ${city.name}`,
    rating: 4 + (i % 9) / 10,
    reviewCount: 100 + i * 31,
    openingHours: Array.from({ length: 7 }, (_, day) => ({
      open: { day, hour: 9, minute: 0 },
      close: { day, hour: 20, minute: 0 },
    })),
    estimatedCost:
      i % 4 === 0
        ? null
        : amount(Math.round((bases[t.currency] * (i % 3)) / 50)),
    currency: t.currency,
    mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(city.name)}`,
    attributions: [],
    observedAt: new Date().toISOString(),
  }));
}
export function createMockServices() {
  return {
    mode: "mock",
    travel: {
      async destinations(keyword) {
        return mockCities.filter((c) =>
          `${c.code} ${c.name}`.toLowerCase().includes(keyword.toLowerCase()),
        );
      },
      async flights(t) {
        return [0, 1, 2].map((i) => ({
          id: `mock-flight-${i + 1}`,
          provider: "mock",
          providerOfferId: `fixture-${i + 1}`,
          airlineCode: "XX",
          airlineName: `Development airline ${i + 1}`,
          origin: t.originCode,
          destination: t.destinationCode,
          departureTime: `${t.startDate}T08:00:00`,
          arrivalTime: `${t.startDate}T12:00:00`,
          returnDepartureTime: `${t.endDate}T18:00:00`,
          returnArrivalTime: `${t.endDate}T22:00:00`,
          duration: "PT4H",
          durationMinutes: 480 - i * 60,
          stops: i === 0 ? 1 : 0,
          returnStops: i === 0 ? 1 : 0,
          price: amount(
            (bases[t.currency] + i * Math.round(bases[t.currency] / 8)) *
              (t.adults + t.children),
          ),
          currency: t.currency,
          priceScope: "all_travelers_round_trip",
          bookingUrl: flightSearchLink(t),
          bookingLinkType: "provider_search",
          observedAt: new Date().toISOString(),
        }));
      },
      async hotels(t) {
        return [0, 1, 2].map((i) => ({
          id: `mock-hotel-${i + 1}`,
          provider: "mock",
          providerHotelId: `fixture-hotel-${i + 1}`,
          name: `Development hotel ${i + 1}`,
          stars: i + 3,
          rating: 4 + i * 0.2,
          price: amount(
            Math.round(bases[t.currency] * (0.18 + i * 0.08)) *
              (dayCount(t.startDate, t.endDate) - 1) *
              Math.ceil((t.adults + t.children) / 2),
          ),
          currency: t.currency,
          checkIn: t.startDate,
          checkOut: t.endDate,
          priceScope: "all_rooms_full_stay",
          rooms: Math.ceil((t.adults + t.children) / 2),
          bookingUrl: hotelSearchLink(t, "hotel"),
          bookingLinkType: "provider_search",
          observedAt: new Date().toISOString(),
        }));
      },
    },
    places: {
      async search(t) {
        return placesFor(t);
      },
      async details(id, language = "en") {
        const match = /^mock-place-([A-Z]{3})-(\d+)$/.exec(id);
        if (!match) throw new AppError(404, "NOT_FOUND", "Unknown fixture.");
        const p = placesFor({
          destinationCode: match[1],
          currency: "SAR",
          language,
        }).find((p) => p.id === id);
        if (!p) throw new AppError(404, "NOT_FOUND", "Unknown fixture.");
        return p;
      },
    },
    ai: {
      async generate(context) {
        const { input, flight, hotel, places, variant = 0 } = context;
        const max = { relaxed: 2, balanced: 3, busy: 5 }[
          input.preferences.pace
        ];
        const windows = dailyWindows(input, flight, context.onlyDay);
        return {
          selectedFlightId: flight.id,
          selectedHotelId: hotel.id,
          days: windows.map((w) => {
            const items = [];
            let start = minutes(w.startTime);
            const end = minutes(w.endTime);
            const rotated = places.map(
              (_, i) =>
                places[(i + (w.dayNumber - 1) * max + variant) % places.length],
            );
            for (const place of rotated) {
              if (items.length >= max || !w.canVisit) break;
              if (items.length)
                start = Math.max(
                  start,
                  minutes(items.at(-1).endTime) +
                    transferMinutes(items.at(-1).place, place),
                );
              while (
                start + 90 <= end &&
                !isOpen(place, w.date, start, start + 90)
              )
                start += 30;
              if (start + 90 > end) continue;
              items.push({
                placeId: place.id,
                startTime: clock(start),
                endTime: clock(start + 90),
                reason:
                  input.language === "ar"
                    ? "اقتراح تجريبي لاختبار تخطيط الرحلة."
                    : "Development suggestion for testing the planning flow.",
                place,
              });
              start += 90;
            }
            return {
              dayNumber: w.dayNumber,
              date: w.date,
              items: items.map(({ place, ...item }) => item),
            };
          }),
        };
      },
    },
  };
}
