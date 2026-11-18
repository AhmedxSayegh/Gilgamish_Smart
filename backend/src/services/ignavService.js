import { AppError } from "../utils/errors.js";
import { flightCodeFor } from "../../../shared/demoCities.mjs";

const markets = {
  SAR: "SA",
  USD: "US",
  EUR: "FR",
  GBP: "GB",
  AED: "AE",
  TRY: "TR",
};

export function createIgnavService(config, fetchImpl = fetch) {
  const airportCache = new Map();

  async function request(path, body) {
    if (!config.ignavKey) {
      throw new AppError(
        503,
        "IGNAV_NOT_CONFIGURED",
        "Ignav API key is missing."
      );
    }

    let response;

    try {
      response = await fetchImpl(
        `https://ignav.com/api${path}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Api-Key": config.ignavKey,
          },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(60000),
        }
      );
    } catch (error) {
      const causeCodes = [error?.cause?.code, ...(error?.cause?.errors || []).map(item => item?.code)];
      const timeout = error?.name === "TimeoutError" || causeCodes.some(code => ["ETIMEDOUT", "UND_ERR_CONNECT_TIMEOUT"].includes(code));
      const blocked = causeCodes.some(code => ["EACCES", "EPERM"].includes(code));
      const dns = causeCodes.some(code => ["ENOTFOUND", "EAI_AGAIN"].includes(code));
      const code = blocked ? "IGNAV_CONNECTION_BLOCKED" : timeout ? "IGNAV_TIMEOUT" : dns ? "IGNAV_DNS_ERROR" : "IGNAV_NETWORK_ERROR";
      // Record only classified diagnostics, never headers, credentials or passenger data.
      console.error(JSON.stringify({ level: "warn", provider: "ignav", code }));
      throw new AppError(
        timeout ? 504 : 502,
        code,
        blocked ? "The server environment blocked the flight provider connection."
          : timeout ? "The flight provider took too long to respond. Please retry."
          : dns ? "The server could not resolve the flight provider hostname."
          : "Flight provider is temporarily unavailable."
      );
    }

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      throw new AppError(
        response.status === 429 ? 503 : 502,
        "IGNAV_UPSTREAM_ERROR",
        "Unable to retrieve flight data.",
        { upstreamStatus: response.status }
      );
    }

    if (!data) {
      throw new AppError(
        502,
        "IGNAV_INVALID_RESPONSE",
        "Flight provider returned invalid data."
      );
    }

    return data;
  }

  function normalizeFlight(it, observedAt, t) {
    const outbound = it.outbound;
    const inbound = it.inbound;
    const price = it.price;

    if (
      !it.ignav_id ||
      !outbound?.segments?.length ||
      (t.endDate && !inbound?.segments?.length) ||
      price?.status !== "verified" ||
      !Number.isFinite(price.amount) ||
      price.amount <= 0 ||
      price.currency !== t.currency
    ) {
      return null;
    }

    const first = outbound.segments[0];
    const last = outbound.segments.at(-1);

    return {
      id: `ignav-flight-${it.ignav_id}`,
      provider: "ignav",
      providerOfferId: it.ignav_id,

      airlineCode: first.marketing_carrier_code,
      airlineName: outbound.carrier,

      origin: first.departure_airport,
      destination: last.arrival_airport,

      departureTime: first.departure_time_local,
      arrivalTime: last.arrival_time_local,

      returnDepartureTime:
        inbound?.segments?.[0]?.departure_time_local ?? null,

      returnArrivalTime:
        inbound?.segments?.at(-1)?.arrival_time_local ?? null,

      duration: `PT${outbound.duration_minutes}M`,

      durationMinutes:
        outbound.duration_minutes +
        (inbound?.duration_minutes || 0),

      stops: outbound.segments.length - 1,

      returnStops: inbound
        ? inbound.segments.length - 1
        : 0,

      price: price.amount,
      currency: price.currency,

      priceScope: t.endDate
        ? "all_travelers_round_trip"
        : "all_travelers_one_way",

      bookingUrl: null,
      bookingLinkType: "api_lookup_required",

      observedAt,
      priceStatus: price.status,
      requiresSelfTransfer: it.requires_self_transfer,
      bags: it.bags ?? null,
    };
  }

  return {
    async searchAirports(query) {
      const key = query.trim().toLocaleLowerCase();
      const cached = airportCache.get(key);
      if (cached && cached.expiresAt > Date.now()) return cached.results;
      const url = new URL("https://ignav.com/api/airports");
      url.searchParams.set("q", query.trim());
      url.searchParams.set("limit", "10");
      let response;
      try {
        response = await fetchImpl(url, {
          headers: { "X-Api-Key": config.ignavKey },
          signal: AbortSignal.timeout(15000),
        });
      } catch {
        throw new AppError(502, "IGNAV_NETWORK_ERROR", "Flight provider is temporarily unavailable.");
      }
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new AppError(response.status === 429 ? 503 : 502, "IGNAV_UPSTREAM_ERROR", "Unable to search airports.", { upstreamStatus: response.status });
      if (!Array.isArray(data)) throw new AppError(502, "IGNAV_INVALID_RESPONSE", "Flight provider returned invalid airport data.");
      const results = data
        .filter(item => /^[A-Z]{3}$/.test(item.code || "") && item.city && item.name)
        .map(item => ({ id: `airport-${item.code}`, code: item.code, cityCode: item.code, name: item.city, nameAr: item.city, country: item.country || "", countryAr: item.country || "", airportName: item.name }));
      airportCache.set(key, { results, expiresAt: Date.now() + 10 * 60 * 1000 });
      if (airportCache.size > 200) airportCache.delete(airportCache.keys().next().value);
      return results;
    },
    async flights(t) {
      const market = markets[t.currency];

      if (!market) {
        throw new AppError(
          422,
          "IGNAV_CURRENCY_UNSUPPORTED",
          "Currency is not configured for Ignav."
        );
      }

      const body = {
        origin: flightCodeFor(t.originCode),
        destination: flightCodeFor(t.destinationCode),
        departure_date: t.startDate,
        adults: t.adults,
        children: t.children || 0,
        cabin_class: "economy",
        market,
      };

      if (t.endDate) {
        body.return_date = t.endDate;
      }

      const path = t.endDate
        ? "/fares/round-trip"
        : "/fares/one-way";

      const data = await request(path, body);

      const itineraries = data.itineraries || [];

      const offers = itineraries
        .map(it => normalizeFlight(it, data.observed_at, t))
        .filter(Boolean);

      if (
        itineraries.length &&
        !offers.length &&
        itineraries.some(
          it => it.price?.currency !== t.currency
        )
      ) {
        throw new AppError(
          502,
          "IGNAV_CURRENCY_MISMATCH",
          "The provider returned prices in a different currency."
        );
      }

      return offers;
    },

    async bookingLinks(ignavId) {
      const data = await request("/fares/booking-links", {
        ignav_id: ignavId,
      });
      const options = (Array.isArray(data.booking_options) ? data.booking_options : []).map(option => ({
        legs: Array.isArray(option.legs) ? option.legs.filter(leg => ["outbound", "inbound"].includes(leg)) : [],
        links: (Array.isArray(option.links) ? option.links : []).filter(link => {
          try { const url = new URL(link.url); return url.protocol === "https:" && !url.username && !url.password; } catch { return false; }
        }).map(link => ({ url: link.url, providerName: link.provider_name || "Booking provider", specificity: link.specificity || null })),
      }));
      // Do not present partial purchase coverage as a complete trip.
      return { options: options.length && options.every(option => option.links.length) ? options : [] };
    },
  };
}
