import { AppError } from "../utils/errors.js";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
const audioCache = new Map();
let blockedUntil = 0;
export async function speechReply(body) {
  const { text } = z.object({text:z.string().trim().min(1).max(6000)}).parse(body);
  const saved = audioCache.get(text);
  if (saved && saved.expires > Date.now()) return saved.promise;
  if (Date.now() < blockedUntil) throw new AppError(429, "SPEECH_QUOTA", "Voice quota reached. Try later.");
  const promise = generate(text).catch(error => {
    audioCache.delete(text);
    if (error.status === 429) {
      blockedUntil = Date.now() + 60000;
      throw new AppError(429, "SPEECH_QUOTA", "Voice quota reached. Try later.");
    }
    throw new AppError(503, "SPEECH_UNAVAILABLE", "Voice service temporarily unavailable.");
  });
  if (audioCache.size >= 20) audioCache.delete(audioCache.keys().next().value);
  audioCache.set(text, {promise, expires:Date.now()+1800000});
  return promise;
}
async function generate(text) {
  const ai = new GoogleGenAI({apiKey:process.env.GEMINI_API_KEY, httpOptions:{apiVersion:"v1beta",timeout:12000,retryOptions:{attempts:1}}});
  const result = await ai.interactions.create({
    model:"gemini-3.8-flash-tts",
    input:[{type:"user_input",content:[{type:"text",text,annotations:[{type:"speech_metadata",style:"Warm, natural, clear pronunciation in the text's language."}]}]}],
    response_format:{type:"audio"},
    generation_config:{speech_config:[{voice:"Kore"}]}
  }, {timeout_ms:12000, retries:{strategy:"none"}});
  if (!result.output_audio?.data) throw new Error("Speech generation unavailable");
  return {audio:"data:audio/wav;base64,"+result.output_audio.data};
}
export async function streamSpeech(req, res) {
  const { text } = z.object({text:z.string().trim().min(1).max(6000)}).parse(req.body);
  const ai = new GoogleGenAI({apiKey:process.env.GEMINI_API_KEY,httpOptions:{apiVersion:"v1beta",timeout:12000,retryOptions:{attempts:1}}});
  if (Date.now() < blockedUntil) throw new AppError(429, "SPEECH_QUOTA", "Voice quota reached. Try later.");
  let stream;
  try {
  stream = await ai.interactions.create({
    model:"gemini-3.8-flash-tts", input:text, stream:true,
    response_format:{type:"audio"}, generation_config:{speech_config:[{voice:"Kore"}]}
  }, {timeout_ms:12000, retries:{strategy:"none"}});
  } catch (error) {
    if (error.status === 429 || error.statusCode === 429) {
      blockedUntil = Date.now() + 60000;
      throw new AppError(429, "SPEECH_QUOTA", "Voice quota reached. Try later.");
    }
    throw new AppError(503, "SPEECH_UNAVAILABLE", "Voice service temporarily unavailable.");
  }
  res.setHeader("Content-Type","application/x-ndjson");
  res.setHeader("Cache-Control","no-store");
  try {
    for await (const event of stream) {
      if (res.destroyed) break;
      if (event.event_type === "step.delta" && event.delta?.type === "audio") {
        res.write(JSON.stringify(event.delta)+"\n");
      }
    }
    if (!res.destroyed) res.end(JSON.stringify({done:true})+"\n");
  } catch {
    if (!res.destroyed) res.end(JSON.stringify({error:true})+"\n");
  }
}
