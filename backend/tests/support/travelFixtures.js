import { amount } from "../../src/utils/currency.js";
import { dayCount, minutes, clock } from "../../src/utils/dates.js";
import {
  dailyWindows,
  isOpen,
  transferMinutes,
} from "../../src/services/itineraryService.js";
function flightSearchLink(t) {
  const url = new URL("https://www.google.com/travel/flights");
  url.searchParams.set(
    "q",
    `Flights from ${flightCodeFor(t.originCode)} to ${flightCodeFor(t.destinationCode)} on ${t.startDate} returning ${t.endDate} ${t.adults} adults ${t.children} children`,
  );
  return url.href;
}
function hotelSearchLink(t, name) {
  const url = new URL("https://www.booking.com/searchresults.html");
  url.searchParams.set("ss", `${name} ${t.destination}`);
  url.searchParams.set("checkin", t.startDate);
  url.searchParams.set("checkout", t.endDate);
  url.searchParams.set("group_adults", String(t.adults));
  url.searchParams.set("group_children", String(t.children));
  return url.href;
}

import { AppError } from "../../src/utils/errors.js";
import { demoCities, searchDemoCities, flightCodeFor } from "../../../shared/demoCities.mjs";
export const mockCities = demoCities;
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
  if (city.code === "QCA") types.push("mosque");
  return types.map((type, i) => ({
    id: `mock-place-${city.code}-${i + 1}`,
    provider: "mock",
    name: type === "mosque" ? (t.language === "ar" ? "المسجد الحرام" : "Masjid al-Haram") :
      t.language === "ar"
        ? `موقع تجريبي ${i + 1} — ${city.name}`
        : `Development ${type.replaceAll("_", " ")} ${i + 1} — ${city.name}`,
    type,
    types: [type],
    latitude: type === "mosque" ? city.latitude : Number((city.latitude + i * 0.001).toFixed(6)),
    longitude: type === "mosque" ? city.longitude : Number((city.longitude + i * 0.001).toFixed(6)),
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
        return searchDemoCities(keyword);
      },
      async flights(t) {
        if (flightCodeFor(t.originCode) === flightCodeFor(t.destinationCode)) throw new AppError(422, "GROUND_TRANSFER_REQUIRED", "These cities share the same flight gateway. Use a ground transfer; this demo does not create a flight between them.");
        return [0, 1, 2].map((i) => ({
          id: `mock-flight-${i + 1}`,
          provider: "mock",
          providerOfferId: `fixture-${i + 1}`,
          airlineCode: "XX",
          airlineName: `Development airline ${i + 1}`,
          origin: flightCodeFor(t.originCode),
          destination: flightCodeFor(t.destinationCode),
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
              if (["CLOSED_PERMANENTLY", "CLOSED_TEMPORARILY"].includes(place.businessStatus)) continue;
              // A rejected candidate must not consume the remaining day's time.
              let candidateStart = start;
              if (items.length)
                candidateStart = Math.max(
                  candidateStart,
                  minutes(items.at(-1).endTime) +
                    transferMinutes(items.at(-1).place, place),
                );
              while (
                candidateStart + 90 <= end &&
                !isOpen(place, w.date, candidateStart, candidateStart + 90)
              )
                candidateStart += 30;
              if (candidateStart + 90 > end) continue;
              items.push({
                placeId: place.id,
                startTime: clock(candidateStart),
                endTime: clock(candidateStart + 90),
                reason:
                  input.language === "ar"
                    ? "اقتراح تجريبي لاختبار تخطيط الرحلة."
                    : "Development suggestion for testing the planning flow.",
                place,
              });
              start = candidateStart + 90;
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
