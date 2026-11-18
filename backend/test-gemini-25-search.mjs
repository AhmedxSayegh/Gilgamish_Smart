
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

const model = "gemini-2.5-flash-lite";

try {
  // First: Check if model is accessible
  console.log("STEP 1: Testing model access...");

  const basic = await ai.models.generateContent({
    model,
    contents: "Reply with OK only."
  });

  console.log("BASIC TEST:", basic.text);

  // Second: Test Google Search Grounding
  console.log("\nSTEP 2: Searching for ticket price...");

  const response = await ai.models.generateContent({
    model,

    contents: `
Search Google for the official Louvre Museum
admission price in Paris, France.

Visit date: November 20, 2026.
Visitor: One adult, non-EEA resident.

Find the standard admission ticket price.

Return:
- Price
- Currency
- Ticket type
- Official pricing page URL

Never invent prices.
If the price cannot be verified, return null.
    `,

    config: {
      tools: [{ googleSearch: {} }]
    }
  });

  console.log("\nGEMINI RESULT:");
  console.log(response.text);

  const sources =
    response.candidates?.[0]
      ?.groundingMetadata?.groundingChunks ?? [];

  console.log("\nGROUNDING SOURCES:");

  for (const source of sources) {
    if (source.web) {
      console.log(source.web.title, source.web.uri);
    }
  }

} catch (error) {
  console.error("\nAPI ERROR:", error.message);
  process.exitCode = 1;
}
