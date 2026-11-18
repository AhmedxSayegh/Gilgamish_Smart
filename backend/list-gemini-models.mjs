
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

try {
  const models = await ai.models.list();

  console.log("AVAILABLE GEMINI MODELS:\n");

  for await (const model of models) {
    if (model.name?.includes("gemini")) {
      console.log(model.name);
    }
  }
} catch (error) {
  console.error("ERROR:", error.message);
}
