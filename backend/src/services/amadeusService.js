import { fetchJson, TtlCache } from "../providers/http.js";
import { AppError } from "../utils/errors.js";
import { cents, amount } from "../utils/currency.js";
const durationMinutes = (value) => {
  const m = /PT(?:(\d+)H)?(?:(\d+)M)?/.exec(value || "");
  return m ? Number(m[1] || 0) * 60 + Number(m[2] || 0) : 0;
};
export function flightSearchLink(t) {
  const url = new URL("https://www.google.com/travel/flights");
  url.searchParams.set(
    "q",
    `Flights from ${t.originCode} to ${t.destinationCode} on ${t.startDate} returning ${t.endDate} ${t.adults} adults ${t.children} children`,
  );
  return url.href;
}
export function hotelSearchLink(t, name) {
  const url = new URL("https://www.booking.com/searchresults.html");
  url.searchParams.set("ss", `${name} ${t.destination}`);
  url.searchParams.set("checkin", t.startDate);
  url.searchParams.set("checkout", t.endDate);
  url.searchParams.set("group_adults", String(t.adults));
  url.searchParams.set("group_children", String(t.children));
  return url.href;
}
export function normalizeFlight(offer, dictionaries, t) {
  const outbound = offer.itineraries?.[0],
    inbound = offer.itineraries?.[1];
  if (!outbound?.segments?.length || !inbound?.segments?.length) return null;
  const first = outbound.segments[0],
    last = outbound.segments.at(-1);
  const carrier = first.carrierCode;
  return {
    id: `amadeus-flight-${offer.id}`,
    provider: "amadeus",
    providerOfferId: offer.id,
    airlineCode: carrier,
    airlineName: dictionaries?.carriers?.[carrier] || carrier,
    origin: first.departure.iataCode,
    destination: last.arrival.iataCode,
    departureTime: first.departure.at,
    arrivalTime: last.arrival.at,
    returnDepartureTime: inbound.segments[0].departure.at,
    returnArrivalTime: inbound.segments.at(-1).arrival.at,
    duration: outbound.duration,
    durationMinutes:
      durationMinutes(outbound.duration) + durationMinutes(inbound.duration),
    stops: outbound.segments.length - 1,
    returnStops: inbound.segments.length - 1,
    price: amount(cents(offer.price.grandTotal || offer.price.total)),
    currency: offer.price.currency,
    priceScope: "all_travelers_round_trip",
    bookingUrl: flightSearchLink(t),
    bookingLinkType: "provider_search",
    observedAt: new Date().toISOString(),
    itineraries: offer.itineraries,
  };
}
export function createAmadeusService(config, fetchImpl = fetch) {
  let token,
    expires = 0,
    pending;
  const cache = new TtlCache();
  async function accessToken() {
    if (token && Date.now() < expires) return token;
    if (!pending)
      pending = (async () => {
        const r = await fetchJson(
          `${config.amadeusBase}/v1/security/oauth2/token`,
          {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              grant_type: "client_credentials",
              client_id: config.amadeusId,
              client_secret: config.amadeusSecret,
            }).toString(),
          },
          { provider: "AMADEUS", fetchImpl },
        );
        if (!r.access_token)
          throw new AppError(
            502,
            "AMADEUS_AUTH_FAILED",
            "The flight and hotel provider did not return an access token.",
          );
        token = r.access_token;
        expires = Date.now() + Math.max(0, Number(r.expires_in) - 60) * 1000;
        return token;
      })().finally(() => {
        pending = null;
      });
    return pending;
  }
  async function get(path, params, ttl = 0, retry = true) {
    const url = new URL(config.amadeusBase + path);
    for (const [k, v] of Object.entries(params))
      if (v !== undefined) url.searchParams.set(k, String(v));
    const key = url.href,
      cached = cache.get(key);
    if (cached) return cached;
    try {
      const data = await fetchJson(
        url.href,
        { headers: { Authorization: `Bearer ${await accessToken()}` } },
        { provider: "AMADEUS", fetchImpl },
      );
      if (ttl) cache.set(key, data, ttl);
      return data;
    } catch (error) {
      if (error.details?.upstreamStatus === 401 && retry) {
        token = null;
        expires = 0;
        return get(path, params, ttl, false);
      }
      throw error;
    }
  }
  return {
    async destinations(keyword) {
      const r = await get(
        "/v1/reference-data/locations",
        { subType: "CITY,AIRPORT", keyword, "page[limit]": 10 },
        3600000,
      );
      return (r.data || []).map((x) => ({
        id: x.id,
        name: x.name,
        code: x.iataCode,
        cityCode: x.address?.cityCode || x.iataCode,
        country: x.address?.countryName,
        latitude: x.geoCode?.latitude,
        longitude: x.geoCode?.longitude,
      }));
    },
    async flights(t) {
      const r = await get(
        "/v2/shopping/flight-offers",
        {
          originLocationCode: t.originCode,
          destinationLocationCode: t.destinationCode,
          departureDate: t.startDate,
          returnDate: t.endDate,
          adults: t.adults,
          children: t.children || undefined,
          currencyCode: t.currency,
          max: 20,
        },
        30000,
      );
      return (r.data || [])
        .map((x) => normalizeFlight(x, r.dictionaries, t))
        .filter(Boolean);
    },
    async hotels(t) {
      if (t.children)
        throw new AppError(
          422,
          "HOTEL_CHILD_OCCUPANCY_UNSUPPORTED",
          "This hotel adapter cannot verify child occupancy. Search the hotel provider directly or use an adults-only search.",
        );
      const locations = await get(
        "/v1/reference-data/locations/hotels/by-city",
        { cityCode: t.destinationCode },
        3600000,
      );
      const hotels = (locations.data || []).slice(0, 30);
      if (!hotels.length) return [];
      const r = await get(
        "/v3/shopping/hotel-offers",
        {
          hotelIds: hotels.map((x) => x.hotelId).join(","),
          adults: t.adults,
          roomQuantity: 1,
          checkInDate: t.startDate,
          checkOutDate: t.endDate,
          currency: t.currency,
          bestRateOnly: true,
        },
        30000,
      );
      return (r.data || []).flatMap((x) =>
        (x.offers || []).map((offer) => ({
          id: `amadeus-hotel-${offer.id}`,
          provider: "amadeus",
          providerHotelId: x.hotel.hotelId,
          providerOfferId: offer.id,
          name: x.hotel.name,
          latitude: x.hotel.latitude ?? null,
          longitude: x.hotel.longitude ?? null,
          rating: null,
          stars: null,
          checkIn: offer.checkInDate,
          checkOut: offer.checkOutDate,
          price: amount(cents(offer.price.total)),
          currency: offer.price.currency,
          priceScope: "one_room_full_stay",
          adults: t.adults,
          rooms: 1,
          bookingUrl: hotelSearchLink(t, x.hotel.name),
          bookingLinkType: "provider_search",
          observedAt: new Date().toISOString(),
          conditions: offer.policies || {},
          roomDescription: offer.room?.description?.text || null,
        })),
      );
    },
  };
}
