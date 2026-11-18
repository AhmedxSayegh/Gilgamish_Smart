import { fetchJson } from "../providers/http.js";
import { distanceKm } from "./rankingService.js";
import { demoCities, demoCityByCode } from "../../../shared/demoCities.mjs";
// Conservative planning area around Damascus, not an administrative boundary.
// Text matches alone can return businesses named Damascus in other countries.
const damascusArea = {
  low: { latitude: 33.46, longitude: 36.20 },
  high: { latitude: 33.57, longitude: 36.37 },
};
// Planning centers, not claimed administrative boundaries. No dataset lookup is used.
const centers = Object.fromEntries(demoCities.map((city) => [city.code, [city.latitude, city.longitude]]));
const interestQueries = {
  history: "historical landmarks", culture: "cultural landmarks", museums: "museums", cafes: "cafes",
  shopping: "shopping markets", nature: "parks", beaches: "beaches", photography: "scenic viewpoints",
  adventure: "outdoor recreation", family: "family attractions", nightlife: "nightlife venues",
  relaxation: "gardens", architecture: "historic architecture", local: "local markets", food: "restaurants",
};
function destinationScope(trip) {
  return trip.destinationCode === "DAM" || /^(damascus|دمشق)$/i.test(trip.destination?.trim() || "")
    ? { name: "Damascus, Syria", rectangle: damascusArea } : null;
}
function withinArea(place, area) {
  const { latitude, longitude } = place.location || {};
  return Number.isFinite(latitude) && Number.isFinite(longitude)
    && latitude >= area.low.latitude && latitude <= area.high.latitude
    && longitude >= area.low.longitude && longitude <= area.high.longitude;
}
const fields = [
  "id",
  "displayName",
  "types",
  "primaryType",
  "formattedAddress",
  "location",
  "rating",
  "userRatingCount",
  "regularOpeningHours",
  "priceLevel",
  "websiteUri",
  "googleMapsUri",
  "attributions",
  "businessStatus",
];
export function normalizePlace(p) {
  return {
    id: p.id,
    provider: "google",
    name: p.displayName?.text || null,
    types: p.types || [],
    type: p.primaryType || p.types?.[0] || "place",
    address: p.formattedAddress || null,
    latitude: p.location?.latitude ?? null,
    longitude: p.location?.longitude ?? null,
    rating: p.rating ?? null,
    reviewCount: p.userRatingCount ?? null,
    openingHours: p.regularOpeningHours?.periods ?? null,
    openingDescriptions: p.regularOpeningHours?.weekdayDescriptions || [],
    priceLevel: p.priceLevel || null,
    estimatedCost: null,
    currency: null,
    website: p.websiteUri || null,
    mapsUrl: p.googleMapsUri || null,
    attributions: p.attributions || [],
    observedAt: new Date().toISOString(),
    businessStatus: p.businessStatus || null,
  };
}
export function createGooglePlacesService(config, fetchImpl = fetch) {
  const request = (url, options, fieldMask) =>
    fetchJson(
      url,
      {
        ...options,
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": config.googleKey,
          "X-Goog-FieldMask": fieldMask,
        },
      },
      { provider: "GOOGLE_PLACES", fetchImpl },
    );
  return {
    async search(t, { allPages = false } = {}) {
      const scope = destinationScope(t);
      const catalogCity = demoCityByCode(t.destinationCode);
      const center = centers[t.destinationCode];
      const anchor = center && { latitude: center[0], longitude: center[1] };
      const oldCityQuery = "historic landmarks and souks in the Old City of Damascus";
      const oldCity = scope && t.interests.includes("oldDamascus");
      // Limit this search to the historic core around the Umayyad Mosque and Straight Street.
      const historicCore = { low: {latitude:33.5075, longitude:36.3005}, high: {latitude:33.5138, longitude:36.314} };
      const selectedQueries = [...new Set([...(oldCity ? [oldCityQuery] : []), ...t.interests.map((i) => interestQueries[i]).filter(Boolean)])];
      const categories = [...new Set([
        ...(t.destinationCode === "QCA" ? ["Masjid al-Haram"] : []),
        ...selectedQueries,
        "tourist attractions",
        "restaurants",
        ...(allPages && t.destinationCode === "RUH" ? Object.values(interestQueries) : []),
      ])];
      const queries = allPages ? categories : categories.slice(0, 6);
      const fieldMask = fields.map((x) => `places.${x}`).join(",") + (allPages ? ",nextPageToken" : "");
      async function searchCategory(category) {
        const body = {
                  textQuery: `${category} in ${scope?.name || (catalogCity ? `${catalogCity.name}, ${catalogCity.country}` : t.destination)}`,
                  ...(scope ? { locationRestriction: { rectangle: category === oldCityQuery ? historicCore : scope.rectangle } } : {}),
                  ...(!scope && anchor ? { locationBias: { circle: { center: anchor, radius: 35000 } } } : {}),
                  languageCode: t.language,
          pageSize: allPages ? 20 : 15,
        };
        const places = [];
        const seenTokens = new Set();
        let pageToken;
        do {
          const result = await request("https://places.googleapis.com/v1/places:searchText", {
            method: "POST", body: JSON.stringify({ ...body, pageToken }),
          }, fieldMask);
          places.push(...(result.places || []));
          pageToken = allPages && result.nextPageToken;
          if (seenTokens.has(pageToken)) break;
          seenTokens.add(pageToken);
        } while (pageToken);
        return places;
      }
      const groups = [];
      for (let i = 0; i < queries.length; i += 6) {
        groups.push(...await Promise.all(queries.slice(i, i + 6).map(searchCategory)));
      }
      // Show a choice from each selected interest before the next result from the same search.
      const historicIds = new Set(oldCity ? groups[0].filter(p => withinArea(p, historicCore)).map(p => p.id) : []);
      const selected = groups.slice(0, selectedQueries.length);
      const candidates = [];
      for (let i = 0; selected.some((group) => i < group.length); i++) {
        for (const group of selected) if (group[i]) candidates.push(group[i]);
      }
      candidates.push(...groups.slice(selected.length).flat());
      return [
        ...new Map(
          candidates
            .filter((p) => !["CLOSED_PERMANENTLY", "CLOSED_TEMPORARILY"].includes(p.businessStatus))
            .filter((p) => !scope || withinArea(p, scope.rectangle))
            .filter((p) => !anchor || (distanceKm(anchor, p.location) !== null && distanceKm(anchor, p.location) <= 50))
            .map((p) => [p.id, historicIds.has(p.id) ? {...normalizePlace(p), oldDamascus: true} : normalizePlace(p)]),
        ).values(),
      ];
    },
    async details(id, language = "en") {
      return normalizePlace(
        await request(
          `https://places.googleapis.com/v1/places/${encodeURIComponent(id)}?languageCode=${encodeURIComponent(language)}`,
          { method: "GET" },
          fields.join(","),
        ),
      );
    },
  };
}
