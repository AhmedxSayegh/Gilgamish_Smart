import { AppError } from "../utils/errors.js";
export async function fetchJson(
  url,
  options = {},
  { provider = "PROVIDER", fetchImpl = fetch, timeout = 15000 } = {},
) {
  try {
    const response = await fetchImpl(url, {
      ...options,
      signal: AbortSignal.timeout(timeout),
      redirect: "error",
    });
    if (!response.ok) {
      const error = new AppError(
        response.status === 429 ? 503 : 502,
        `${provider}_UNAVAILABLE`,
        `${provider} is temporarily unavailable.`,
        {
          upstreamStatus: response.status,
          retryAfter: response.headers.get("retry-after"),
        },
      );
      throw error;
    }
    return await response.json();
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      502,
      `${provider}_UNAVAILABLE`,
      `${provider} could not complete the request. Please retry.`,
    );
  }
}
export class TtlCache {
  constructor(limit = 200) {
    this.map = new Map();
    this.limit = limit;
  }
  get(key) {
    const x = this.map.get(key);
    if (!x || x.until < Date.now()) {
      this.map.delete(key);
      return undefined;
    }
    return structuredClone(x.value);
  }
  set(key, value, ttl) {
    if (this.map.size >= this.limit)
      this.map.delete(this.map.keys().next().value);
    this.map.set(key, {
      value: structuredClone(value),
      until: Date.now() + ttl,
    });
  }
}
