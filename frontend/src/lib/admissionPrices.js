import { useEffect, useMemo, useState } from "react";
import { demoCityByCode } from "../../../shared/demoCities.mjs";
import { api } from "./api";

// Share recent results and active requests when a plan is reopened.
const recent = new Map();
const active = new Map();
function lookup(body) {
  const key = JSON.stringify(body);
  const cached = recent.get(key);
  if (cached?.expires > Date.now()) return Promise.resolve(cached.quote);
  if (active.has(key)) return active.get(key);
  const request = api("/attractions/prices", { method: "POST", body, raw: true })
    .then(quote => {
      if (quote.price != null && (quote.currency === body.targetCurrency || quote.convertedPrice != null)) {
        if (recent.size >= 500) recent.delete(recent.keys().next().value);
        recent.set(key, { quote, expires: Date.now() + 15 * 60000 });
      }
      return quote;
    })
    .finally(() => active.delete(key));
  active.set(key, request);
  return request;
}

export function useAdmissionPrices(input, days) {
  const requests = useMemo(() => {
    const result = new Map();
    if (!input || !days) return result;
    for (const day of days) for (const { place, placeId } of day.items) {
      if (place.estimatedCost != null || !place.name) continue;
      const country = demoCityByCode(input.destinationCode)?.country ||
        place.address?.split(/[,،]/).at(-1)?.trim();
      if (!country) continue;
      for (const [category, count] of [["Adult", input.adults], ["Child (2–11)", input.children]]) {
        if (!count) continue;
        result.set(JSON.stringify([day.date, placeId, category]), {
          attraction: place.name, city: input.destination, country, visitDate: day.date,
          visitorCategory: category, targetCurrency: input.currency,
          placeId: place.provider === "google" ? placeId : undefined,
        });
      }
    }
    return result;
  }, [input, days]);
  const [state, setState] = useState(null);
  useEffect(() => {
    const controller = new AbortController();
    const queue = [...requests];
    async function worker() {
      while (queue.length && !controller.signal.aborted) {
        const [key, body] = queue.shift();
        let quote = null;
        try {
          quote = await lookup(body);
        } catch (error) {
          quote = { reason: error.status === 429 ? "price_lookup_rate_limited" : "price_provider_error" };
        }
        if (!controller.signal.aborted) setState(previous => ({
          requests, values: { ...(previous?.requests === requests && previous.values), [key]: quote },
        }));
      }
    }
    for (let i = 0; i < Math.min(4, requests.size); i++) worker();
    return () => controller.abort();
  }, [requests]);
  return (day, item) => {
    const p = item.place;
    return [["Adult", input.adults], ["Child (2–11)", input.children]].filter(([,count]) => count).map(([category, count]) => {
      const key = JSON.stringify([day.date, item.placeId, category]);
      const values = state?.requests === requests ? state.values : {};
      const quote = values[key];
      const price = p.estimatedCost ?? quote?.price;
      const currency = p.estimatedCost != null ? p.currency : quote?.currency;
      const unit = currency === input.currency ? price : quote?.convertedPrice;
      return { category, count, price, currency, unit, reason: quote?.reason, pending: requests.has(key) && !(key in values) };
    });
  };
}
