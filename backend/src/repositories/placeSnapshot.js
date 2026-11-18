// Dataset records are local static content. Google details stay request-scoped;
// only IDs and provenance links are persisted, then rehydrated through Google.
export function placeSnapshot(place) {
  if (["mock", "dataset"].includes(place.provider)) return JSON.stringify(place);
  if (place.provider === "google" && place.datasetMatches?.length) return JSON.stringify({
    id: place.id, provider: "google", name: null, dataStatus: "requires_refresh",
    sources: ["google", "dataset"], datasetMatches: place.datasetMatches,
  });
  return null;
}
