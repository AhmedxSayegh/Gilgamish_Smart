import { itinerarySchema } from "../validators/schemas.js";
import { AppError, requireCondition } from "../utils/errors.js";
import { minutes } from "../utils/dates.js";
import { haramMinutes, isGrandMosque } from "./makkahVisit.js";
import { dailyWindows, umrahSlot } from "../../../shared/visitWindows.mjs";
export { dailyWindows };
export function isOpen(place, date, start, end) {
  if (place.openingHours === null || place.openingHours === undefined)
    return true;
  const week = 10080,
    day = new Date(date + "T00:00:00Z").getUTCDay(),
    a = day * 1440 + start,
    b = day * 1440 + end;
  return place.openingHours.some((p) => {
    if (!p.open) return false;
    if (!p.close) return true;
    const o =
      p.open.day * 1440 + (p.open.hour || 0) * 60 + (p.open.minute || 0);
    let c =
      p.close.day * 1440 + (p.close.hour || 0) * 60 + (p.close.minute || 0);
    if (c <= o) c += week;
    return [-week, 0, week].some((shift) => a >= o + shift && b <= c + shift);
  });
}
export function transferMinutes(a, b) {
  if (
    [a?.latitude, a?.longitude, b?.latitude, b?.longitude].some(
      (v) => v == null,
    )
  )
    return 30;
  const rad = (x) => (x * Math.PI) / 180,
    lat = rad(b.latitude - a.latitude),
    lon = rad(b.longitude - a.longitude);
  const h =
    Math.sin(lat / 2) ** 2 +
    Math.cos(rad(a.latitude)) *
      Math.cos(rad(b.latitude)) *
      Math.sin(lon / 2) ** 2;
  const km = 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0, 1 - h)));
  return Math.max(30, Math.ceil((km / 30) * 60));
}
export function validateItinerary(raw, context) {
  const parsed = itinerarySchema.safeParse(raw);
  if (!parsed.success)
    throw new AppError(
      422,
      "INVALID_ITINERARY",
      "The itinerary has invalid fields or times.",
      parsed.error.flatten(),
    );
  const result = parsed.data;
  requireCondition(
    result.selectedFlightId === context.flight.id,
    "UNKNOWN_FLIGHT",
    "The itinerary selected an unavailable flight.",
  );
  requireCondition(
    result.selectedHotelId === context.hotel.id,
    "UNKNOWN_HOTEL",
    "The itinerary selected an unavailable hotel.",
  );
  const windows = dailyWindows(context.input, context.flight, context.onlyDay);
  requireCondition(
    result.days.length === windows.length,
    "INVALID_DAYS",
    "The itinerary must contain each requested day exactly once.",
  );
  const places = new Map(context.places.map((p) => [p.id, p])),
    seenDays = new Set();
  const days = result.days
    .map((day) => {
      const window = windows.find(
        (d) => d.dayNumber === day.dayNumber && d.date === day.date,
      );
      requireCondition(
        window && !seenDays.has(day.dayNumber),
        "INVALID_DAY",
        "The itinerary contains an invalid or duplicate day.",
      );
      seenDays.add(day.dayNumber);
      const seenPlaces = new Set();
      let previous;
      const items = [...day.items]
        .sort((a, b) => a.startTime.localeCompare(b.startTime))
        .map((item) => {
          const place = places.get(item.placeId);
          requireCondition(
            place,
            "UNKNOWN_PLACE",
            "The itinerary contains a place outside the supplied candidates.",
          );
          requireCondition(!["CLOSED_PERMANENTLY", "CLOSED_TEMPORARILY"].includes(place.businessStatus), "CLOSED_PLACE", "An activity is marked closed by its provider.");
          requireCondition(
            !seenPlaces.has(place.id),
            "DUPLICATE_PLACE",
            "A place cannot be scheduled twice in one day.",
          );
          seenPlaces.add(place.id);
          const start = minutes(item.startTime),
            end = minutes(item.endTime);
          const umrah = context.input.destinationCode === "QCA" && day.dayNumber === 1 && !previous && isGrandMosque(place)
            ? umrahSlot(context.input, context.flight) : null;
          if (umrah?.fitsStay && item.startTime === umrah.startTime && item.endTime === umrah.endTime) {
            previous = { ...item, place };
            return previous;
          }
          requireCondition(
            start < end,
            "INVALID_TIME",
            "An activity must end after it starts.",
          );
          if (!window.canVisit || start < minutes(window.startTime) || end > minutes(window.endTime)) {
            throw new AppError(422, "FLIGHT_TIME_CONFLICT",
              window.canVisit
                ? `Activities on ${day.date} must be between ${window.startTime} and ${window.endTime} (destination local time).`
                : `No sightseeing time is available on ${day.date} after allowing for flight arrivals and departures.`,
              { window, placeId: item.placeId });
          }
          requireCondition(
            isOpen(place, day.date, start, end),
            "CLOSED_PLACE",
            "An activity falls outside known opening hours.",
          );
          requireCondition(
            !previous ||
              start >=
                (context.input.destinationCode === "QCA" && day.dayNumber === 1 && isGrandMosque(previous.place)
                  ? Math.max(umrahSlot(context.input, context.flight).end, minutes(previous.endTime)) : minutes(previous.endTime)) +
                  Math.max(transferMinutes(previous.place, place), context.routeTransfers?.get(`${day.dayNumber}:${previous.placeId}:${place.id}`) || 0),
            "SCHEDULE_OVERLAP",
            "Activities overlap or leave too little time for transfers.",
          );
          previous = { ...item, place };
          return previous;
        });
      if (context.input.destinationCode === "QCA" && day.dayNumber === 1) {
        const first = items[0];
        const slot = umrahSlot(context.input, context.flight);
        requireCondition(first && isGrandMosque(first.place) && ((first.startTime === slot.startTime && first.endTime === slot.endTime) || minutes(first.endTime) - minutes(first.startTime) >= haramMinutes),
          "HARAM_REQUIRED", "The first activity in Makkah must be Masjid al-Haram for at least three hours.");
      }
      return { ...day, items };
    })
    .sort((a, b) => a.dayNumber - b.dayNumber);
  return days;
}
