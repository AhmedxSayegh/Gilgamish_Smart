
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

try {
  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash-lite",
    contents: "Say Hello in English."
  });

  console.log("SUCCESS:", response.text);
} catch (error) {
  console.error("ERROR:", error.message);
}


