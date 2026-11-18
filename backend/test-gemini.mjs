
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

async function testAttractionPrice() {
  try {
    console.log("Searching for admission prices...\n");

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",

      contents: `
        Search Google for the official admission price
        of the Louvre Museum in Paris, France.

        Visit date: November 20, 2026.
        Visitor: 1 adult, non-EU resident.

        Requirements:
        - Find the standard entrance ticket price.
        - Prefer the attraction's official website.
        - Do not use guided tour prices.
        - Return the attraction name.
        - Return the price and currency.
        - Return the source URL.
        - If the price cannot be verified, return null.
        - Never invent prices.

        Answer in JSON format.
      `,

      config: {
        tools: [{ googleSearch: {} }]
      }
    });

    console.log("GEMINI RESULT:");
    console.log(response.text);

    console.log("\nGROUNDING SOURCES:");

    const chunks =
      response.candidates?.[0]
        ?.groundingMetadata
        ?.groundingChunks ?? [];

    if (chunks.length === 0) {
      console.log("No grounding sources returned.");
    }

    for (const chunk of chunks) {
      if (chunk.web) {
        console.log(chunk.web.title);
        console.log(chunk.web.uri);
      }
    }

  } catch (error) {
    console.error("Gemini API Error:");
    console.error(error.message);
    process.exitCode = 1;
  }
}

testAttractionPrice();
