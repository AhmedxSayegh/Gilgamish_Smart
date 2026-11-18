
import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { GoogleGenAI } from "@google/genai";

const router = Router();
const cache = new Map();

const limiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false
});

function clean(value) {
  return typeof value === "string"
    ? value.trim()
    : "";
}

router.post("/prices", limiter, async (req, res) => {
  const attraction = clean(req.body?.attraction);
  const city = clean(req.body?.city);
  const country = clean(req.body?.country);
  const visitDate = clean(req.body?.visitDate);
  const visitorCategory = clean(req.body?.visitorCategory);
  const ticketType = clean(req.body?.ticketType) || "Standard admission";

  if (
    !attraction || !city || !country ||
    !visitorCategory ||
    !/^\d{4}-\d{2}-\d{2}$/.test(visitDate) ||
    [attraction, city, country, visitorCategory, ticketType]
      .some(v => v.length > 150)
  ) {
    return res.status(400).json({
      error: "Invalid attraction pricing request"
    });
  }

  const key = JSON.stringify([
    attraction, city, country,
    visitDate, visitorCategory, ticketType
  ]);

  const cached = cache.get(key);

  if (cached && cached.expires > Date.now()) {
    return res.json({
      ...cached.data,
      cached: true
    });
  }

  const base = {
    attraction,
    city,
    country,
    visitDate,
    visitorCategory,
    ticketType,
    price: null,
    candidatePrice: null,
    currency: null,
    sourceUrl: null,
    verified: false,
    status: "unavailable"
  };

  // Keep Google Search disabled until billing is approved.
  if (process.env.GEMINI_PRICE_SEARCH_ENABLED !== "true") {
    return res.json({
      ...base,
      reason: "google_search_disabled"
    });
  }

  if (!process.env.GEMINI_API_KEY) {
    return res.status(503).json({
      error: "Gemini API is not configured"
    });
  }

  try {
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY
    });

    const response = await ai.models.generateContent({
      model: process.env.GEMINI_PRICE_MODEL ||
        "gemini-3.5-flash-lite",

      contents: `
Find the official admission price for:
Attraction: ${attraction}
City: ${city}
Country: ${country}
Visit date: ${visitDate}
Visitor: ${visitorCategory}
Ticket: ${ticketType}

Use Google Search and official pricing pages.

Rules:
- Verify ticket type and visitor eligibility.
- Never guess prices.
- Exclude guided tours and packages.
- Prefer the exact pricing page.
- Return null if the price is unavailable.
- Do not claim verification without evidence.

Return ONLY valid JSON:
{
  "price": null,
  "currency": null,
  "ticket_type": null,
  "source_url": null
}
      `,

      config: {
        tools: [{ googleSearch: {} }]
      }
    });

    const sources =
      response.candidates?.[0]
        ?.groundingMetadata
        ?.groundingChunks
        ?.filter(x => x.web?.uri)
        .map(x => ({
          title: x.web.title || "",
          url: x.web.uri
        })) ?? [];

    if (sources.length === 0) {
      return res.json({
        ...base,
        reason: "no_grounding_sources"
      });
    }

    const raw = (response.text || "")
      .trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "");

    const data = JSON.parse(raw);

    const candidatePrice =
      typeof data.price === "number" &&
      Number.isFinite(data.price) &&
      data.price >= 0
        ? data.price
        : null;

    const currency =
      typeof data.currency === "string" &&
      /^[A-Z]{3}$/.test(data.currency)
        ? data.currency
        : null;

    const sourceUrl =
      typeof data.source_url === "string" &&
      /^https:\/\//i.test(data.source_url)
        ? data.source_url
        : null;

    const usable =
      candidatePrice !== null &&
      currency !== null &&
      sourceUrl !== null;

    const result = {
      ...base,
      candidatePrice: usable ? candidatePrice : null,
      currency,
      sourceUrl,
      status: usable ? "unverified" : "unavailable",
      reason: usable
        ? "requires_independent_verification"
        : "price_not_confirmed",
      groundingSources: sources
    };

    cache.set(key, {
      data: result,
      expires: Date.now() + 6 * 60 * 60 * 1000
    });

    return res.json(result);

  } catch (error) {
    const message = String(error.message || "");

    const status = /429|RESOURCE_EXHAUSTED/.test(message)
      ? 429
      : /503|UNAVAILABLE/.test(message)
        ? 503
        : 502;

    console.error("Attraction pricing failed:", status);

    return res.status(status).json({
      error: "Attraction price lookup failed",
      price: null,
      status: "unavailable"
    });
  }
});

export default router;
