import { fetchJson } from "../providers/http.js";
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
    async search(t) {
      const categories = [
        "tourist attractions",
        ...(t.interests.includes("food") ? ["restaurants"] : []),
        ...(t.interests.includes("cafes") ? ["cafes"] : []),
        ...(t.interests.includes("nature") ? ["parks"] : []),
        ...(t.interests.includes("museums") || t.interests.includes("history")
          ? ["museums"]
          : []),
      ];
      const results = await Promise.all(
        categories
          .slice(0, 4)
          .map((category) =>
            request(
              "https://places.googleapis.com/v1/places:searchText",
              {
                method: "POST",
                body: JSON.stringify({
                  textQuery: `${category} in ${t.destination}`,
                  languageCode: t.language,
                  pageSize: 15,
                }),
              },
              fields.map((x) => `places.${x}`).join(","),
            ),
          ),
      );
      return [
        ...new Map(
          results
            .flatMap((r) => r.places || [])
            .filter((p) => p.businessStatus !== "CLOSED_PERMANENTLY")
            .map((p) => [p.id, normalizePlace(p)]),
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
