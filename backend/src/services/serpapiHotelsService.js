import { createHash } from "node:crypto";
import { z } from "zod";
import { currencies } from "../utils/currency.js";
import { AppError } from "../utils/errors.js";
import { TtlCache } from "../providers/http.js";
import { demoCityByCode } from "../../../shared/demoCities.mjs";

export const hotelTokenSchema = z
  .string()
  .min(1)
  .max(512)
  .regex(/^[A-Za-z0-9_=-]+$/);
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const parsed = new Date(value);
    return (
      Number.isFinite(+parsed) && parsed.toISOString().slice(0, 10) === value
    );
  });
const staySchema = z
  .object({
    destination: z.string().trim().min(2).max(120),
    destinationCode: z.string().regex(/^[A-Z]{3}$/).optional(),
    startDate: date,
    endDate: date,
    adults: z.number().int().min(1).max(9),
    children: z.number().int().min(0).max(8),
    currency: z.enum(currencies),
    language: z.enum(["en", "ar"]),
  })
  .refine(
    (t) => {
      const nights =
        (Date.parse(t.endDate) - Date.parse(t.startDate)) / 86400000;
      return (
        t.startDate >= new Date().toISOString().slice(0, 10) &&
        nights >= 1 &&
        nights <= 21
      );
    },
    {
      message: "Choose current/future dates for 1–21 nights.",
      path: ["startDate"],
    },
  );

const numeric = (value, min, max) =>
  typeof value === "number" &&
  Number.isFinite(value) &&
  value >= min &&
  value <= max
    ? value
    : null;
const text = (value, limit = 500) =>
  typeof value === "string" ? value.slice(0, limit) : null;
const list = (value) => (Array.isArray(value) ? value : []);

// Provider URLs are data. Never follow them on the server or expose API/credential links.
export function safeHotelUrl(value, secret = "", depth = 0) {
  if (typeof value !== "string" || value.length > 8192 || depth > 3)
    return null;
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      (url.port && url.port !== "443") ||
      host === "serpapi.com" ||
      host.endsWith(".serpapi.com") ||
      host === "localhost" ||
      !host.includes(".") ||
      /^(?:\d{1,3}\.){3}\d{1,3}$/.test(host) ||
      host.includes(":") ||
      /\.(?:localhost|local|internal|test|invalid)$/.test(host)
    )
      return null;
    let decoded = value;
    for (let i = 0; i < 3; i++) {
      if (secret && decoded.includes(secret)) return null;
      try {
        decoded = decodeURIComponent(decoded);
      } catch {
        break;
      }
    }
    if (secret && decoded.includes(secret)) return null;
    if (
      /(?:[?&#]|%26)(?:api[_-]?key|serpapi[_-]?api[_-]?key|access[_-]?token|authorization)(?:=|%3d)/i.test(
        decoded,
      )
    )
      return null;
    for (const [key, target] of url.searchParams) {
      if (
        /^(?:url|q|pcurl|redirect|redirect_url|redirect_uri|continue|destination|target)$/i.test(
          key,
        ) &&
        /^(?:https?:|javascript:|data:|\/\/)/i.test(target) &&
        !safeHotelUrl(target, secret, depth + 1)
      )
        return null;
    }
    return url.href;
  } catch {
    return null;
  }
}

function rate(value) {
  if (!value || typeof value !== "object")
    return { amount: null, taxesIncluded: null };
  for (const [field, taxesIncluded] of [
    ["extracted_after_taxes_fees", true],
    ["extracted_lowest", null],
    ["extracted_display_price", null],
    ["extracted_before_taxes_fees", false],
  ]) {
    const amount = numeric(value[field], 0.01, 99999999);
    if (amount !== null) return { amount: amount.toFixed(2), taxesIncluded };
  }
  return { amount: null, taxesIncluded: null };
}

export function createSerpapiHotelsService(
  config,
  fetchImpl = fetch,
  now = Date.now,
) {
  const cache = new TtlCache(150),
    pending = new Map();
  const dailyLimit = config.serpapiDailyLimit ?? 100,
    minuteLimit = config.serpapiMinuteLimit ?? 20;
  const concurrency = config.serpapiConcurrency ?? 2;
  let day = "",
    dayCalls = 0,
    recent = [],
    active = 0,
    blockedUntil = 0;
  const ttl = 5 * 60000;
  const cleanText = (value, limit) => {
    return text(
      typeof value === "string" && config.serpapiKey
        ? value.split(config.serpapiKey).join("[redacted]")
        : value,
      limit,
    );
  };
  const safeUrl = (value) => safeHotelUrl(value, config.serpapiKey);

  function input(trip) {
    return staySchema.parse(trip);
  }
  function params(t, token) {
    const city = demoCityByCode(t.destinationCode);
    return {
      engine: "google_hotels",
      check_in_date: t.startDate,
      check_out_date: t.endDate,
      adults: String(t.adults),
      children: "0",
      currency: t.currency,
      hl: t.language,
      gl: "us",
      ...(token
        ? { property_token: token }
        : {
            q: city
              ? `Hotels in ${city.name}, ${city.country}`
              : `Hotels in ${t.destination}`,
          }),
    };
  }
  function reserve() {
    const time = now(),
      currentDay = new Date(time).toISOString().slice(0, 10);
    if (day !== currentDay) {
      day = currentDay;
      dayCalls = 0;
    }
    recent = recent.filter((at) => at > time - 60000);
    if (time < blockedUntil)
      throw new AppError(
        503,
        "SERPAPI_RATE_LIMITED",
        "Hotel provider quota is temporarily unavailable. Retry later.",
        { retryAfter: Math.ceil((blockedUntil - time) / 1000) },
      );
    if (dayCalls >= dailyLimit || recent.length >= minuteLimit)
      throw new AppError(
        429,
        "HOTEL_QUOTA_EXCEEDED",
        "The hotel's search allowance has been reached. Retry later.",
        {
          retryAfter:
            dayCalls >= dailyLimit
              ? Math.ceil(
                  (Date.parse(`${day}T00:00:00Z`) + 86400000 - time) / 1000,
                )
              : Math.ceil((recent[0] + 60000 - time) / 1000),
        },
      );
    if (active >= concurrency)
      throw new AppError(
        429,
        "HOTEL_SEARCH_BUSY",
        "Hotel search is busy. Please retry shortly.",
        { retryAfter: 2 },
      );
    dayCalls++;
    recent.push(time);
    active++;
  }
  async function request(query, normalize) {
    if (!config.serpapiKey)
      throw new AppError(
        503,
        "SERPAPI_NOT_CONFIGURED",
        "Hotel search is not configured.",
      );
    const key = JSON.stringify(query),
      hit = cache.get(key);
    if (hit !== undefined) return hit;
    if (pending.has(key)) return structuredClone(await pending.get(key));
    reserve();
    const operation = (async () => {
      try {
        const url = new URL("https://serpapi.com/search.json");
        Object.entries(query).forEach(([name, value]) =>
          url.searchParams.set(name, value),
        );
        url.searchParams.set("api_key", config.serpapiKey);
        let response, body;
        try {
          response = await fetchImpl(url, {
            signal: AbortSignal.timeout(20000),
            redirect: "error",
            headers: { Accept: "application/json" },
          });
          if (response.status === 429) {
            blockedUntil = now() + 60000;
            throw new AppError(
              503,
              "SERPAPI_RATE_LIMITED",
              "Hotel provider quota is temporarily unavailable. Retry later.",
              { retryAfter: 60 },
            );
          }
          if (!response.ok)
            throw new AppError(
              502,
              response.status === 401 || response.status === 403
                ? "SERPAPI_AUTH_FAILED"
                : "SERPAPI_UNAVAILABLE",
              "Hotel provider could not complete the request.",
            );
          body = await response.json();
        } catch (error) {
          if (error instanceof AppError) throw error;
          if (["TimeoutError", "AbortError"].includes(error?.name))
            throw new AppError(
              504,
              "SERPAPI_TIMEOUT",
              "Hotel search took too long. Please retry.",
            );
          throw new AppError(
            502,
            "SERPAPI_UNAVAILABLE",
            "Hotel search could not be completed. Please retry.",
          );
        }
        // Never forward raw provider errors, metadata, search URLs or request options.
        if (
          !body ||
          typeof body !== "object" ||
          Array.isArray(body) ||
          body.error ||
          body.search_metadata?.status === "Error"
        )
          throw new AppError(
            502,
            "SERPAPI_INVALID_RESPONSE",
            "Hotel provider returned an unsuccessful response.",
          );
        const normalized = normalize(body, new Date(now()).toISOString());
        cache.set(key, normalized, ttl);
        return normalized;
      } finally {
        active--;
      }
    })();
    pending.set(key, operation);
    try {
      return structuredClone(await operation);
    } finally {
      pending.delete(key);
    }
  }
  function hotel(property, t, observedAt, fallbackToken) {
    if (!property || typeof property !== "object") return null;
    const token = property.property_token || fallbackToken;
    if (
      typeof property.name !== "string" ||
      !property.name.trim() ||
      !hotelTokenSchema.safeParse(token).success ||
      (config.serpapiKey && token.includes(config.serpapiKey))
    )
      return null;
    const total = rate(property.total_rate),
      nightly = rate(property.rate_per_night);
    const stars = numeric(
      property.extracted_hotel_class ?? property.hotel_class,
      1,
      5,
    );
    return {
      id: `serpapi-hotel-${createHash("sha256")
        .update(
          JSON.stringify([token, t.startDate, t.endDate, t.adults, t.currency]),
        )
        .digest("hex")
        .slice(0, 32)}`,
      // Long opaque tokens stay in the JSON snapshot; the indexed SQL column is VARCHAR(100).
      provider: "serpapi",
      propertyToken: token,
      providerHotelId:
        token.length <= 100
          ? token
          : createHash("sha256").update(token).digest("hex"),
      name: cleanText(property.name, 200),
      description: cleanText(property.description, 2000),
      address: cleanText(property.address, 500),
      phone: cleanText(property.phone, 100),
      latitude: numeric(property.gps_coordinates?.latitude, -90, 90),
      longitude: numeric(property.gps_coordinates?.longitude, -180, 180),
      rating: numeric(property.overall_rating, 0, 5),
      reviewCount: numeric(property.reviews, 0, 1e9),
      stars,
      checkIn: t.startDate,
      checkOut: t.endDate,
      adults: t.adults,
      children: 0,
      rooms: 1,
      price: total.amount,
      nightlyPrice: nightly.amount,
      currency: t.currency,
      priceScope: "one_room_full_stay",
      taxesIncluded: total.taxesIncluded,
      bookingUrl: safeUrl(property.link),
      bookingLinkType: "property_website",
      amenities: list(property.amenities)
        .slice(0, 30)
        .map((value) => cleanText(value, 120))
        .filter(Boolean),
      images: list(property.images)
        .slice(0, 6)
        .map((image) => safeUrl(image?.thumbnail))
        .filter(Boolean),
      observedAt,
      expiresAt: new Date(Date.parse(observedAt) + ttl).toISOString(),
    };
  }
  function prices(body, t) {
    return [...list(body.prices), ...list(body.featured_prices)]
      .filter((item) => item && typeof item === "object")
      .slice(0, 50)
      .flatMap((item) => {
        const variants = list(item.rooms).length
          ? item.rooms.map((room) => ({ ...item, ...room }))
          : [item];
        return variants.map((item) => ({
          source: cleanText(item.source, 160) || "Hotel provider",
          url: safeUrl(item.link),
          price: rate(item.total_rate).amount,
          nightlyPrice: rate(item.rate_per_night).amount,
          taxesIncluded: rate(item.total_rate).taxesIncluded,
          currency: t.currency,
          freeCancellation:
            typeof item.free_cancellation === "boolean"
              ? item.free_cancellation
              : null,
          guests: numeric(item.num_guests, 1, 9),
          room: cleanText(item.room_type, 300),
        }));
      })
      .filter((item) => item.guests === null || item.guests === t.adults);
  }
  async function details(token, trip) {
    hotelTokenSchema.parse(token);
    const t = input(trip);
    return request(params(t, token), (body, observedAt) => {
      const normalized = hotel(body, t, observedAt, token);
      if (!normalized)
        throw new AppError(
          502,
          "SERPAPI_INVALID_RESPONSE",
          "Hotel details are unavailable.",
        );
      return { hotel: normalized, prices: prices(body, t), observedAt };
    });
  }
  return {
    async hotels(trip, { hotelName } = {}) {
      const t = input(trip);
      const query = params(t);
      if (hotelName) query.q = hotelName + ", " + t.destination;
      return request(query, (body, observedAt) => {
        if (!Array.isArray(body.properties))
          throw new AppError(
            502,
            "SERPAPI_INVALID_RESPONSE",
            "Hotel provider returned invalid search results.",
          );
        return [
          ...new Map(
            body.properties
              .slice(0, 30)
              .map((property) => hotel(property, t, observedAt))
              .filter((offer) => offer && offer.price !== null)
              .map((offer) => [offer.id, offer]),
          ).values(),
        ];
      });
    },
    details,
    async prices(token, trip) {
      const result = await details(token, trip);
      return {
        prices: result.prices,
        observedAt: result.observedAt,
        hotel: result.hotel,
      };
    },
    async bookingLinks(token, trip) {
      const result = await details(token, trip);
      const links = result.prices
        .filter((price) => price.url)
        .map((price) => ({ ...price, type: "seller_offer" }));
      if (result.hotel.bookingUrl)
        links.push({
          source: result.hotel.name,
          url: result.hotel.bookingUrl,
          price: null,
          nightlyPrice: null,
          currency: result.hotel.currency,
          type: "property_website",
        });
      return {
        links: [...new Map(links.map((link) => [link.url, link])).values()],
        hotel: result.hotel,
        observedAt: result.observedAt,
      };
    },
  };
}
