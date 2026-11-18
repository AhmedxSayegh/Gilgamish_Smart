import { z } from "zod";
import { currencies, cents } from "../utils/currency.js";
import { dayCount } from "../utils/dates.js";
export const interests = [
  "oldDamascus",
  "history",
  "culture",
  "museums",
  "food",
  "cafes",
  "shopping",
  "nature",
  "beaches",
  "photography",
  "adventure",
  "family",
  "nightlife",
  "relaxation",
  "architecture",
  "local",
];
export const idSchema = z.string().uuid();
export const moneySchema = z
  .union([z.string(), z.number()])
  .transform(String)
  .refine(
    (v) => /^\d{1,10}(\.\d{1,2})?$/.test(v),
    "Use a nonnegative amount with at most two decimal places.",
  );
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((v) => {
    const d = new Date(v);
    return !Number.isNaN(+d) && d.toISOString().slice(0, 10) === v;
  }, "Invalid date.");
const name = z.string().trim().min(2).max(100);
const email = z
  .email()
  .max(254)
  .transform((v) => v.toLowerCase());
export const registerSchema = z
  .object({
    name,
    email,
    password: z
      .string()
      .min(10)
      .max(72)
      .refine(
        (v) => Buffer.byteLength(v) <= 72,
        "Password must not exceed 72 UTF-8 bytes.",
      ),
    language: z.enum(["en", "ar"]).default("en"),
  })
  .strict();
export const loginSchema = z
  .object({ email, password: z.string().min(1).max(200) })
  .strict();
export const profileSchema = z
  .object({ name: name.optional(), language: z.enum(["en", "ar"]).optional() })
  .strict();
export const preferencesSchema = z
  .object({
    hotelStars: z.number().int().min(1).max(5).default(3),
    flightOption: z.enum(["cheapest", "shortest"]).default("cheapest"),
    pace: z.enum(["relaxed", "balanced", "busy"]).default("balanced"),
    currency: z.enum(currencies).default("SAR"),
    interests: z.array(z.enum(interests)).max(15).default([]),
  })
  .strict();
export const tripSchema = z
  .object({
    origin: z.string().trim().min(2).max(120),
    destination: z.string().trim().min(2).max(120),
    originCode: z.string().regex(/^[A-Z]{3}$/),
    destinationCode: z.string().regex(/^[A-Z]{3}$/),
    startDate: date,
    endDate: date,
    adults: z.number().int().min(1).max(9),
    children: z.number().int().min(0).max(8).default(0),
    totalBudget: moneySchema.refine(
      (v) => cents(v) > 0,
      "Budget must be positive.",
    ),
    currency: z.enum(currencies).default("SAR"),
    interests: z
      .array(z.enum(interests))
      .min(1)
      .max(15)
      .transform((v) => [...new Set(v)]),
    language: z.enum(["en", "ar"]).default("en"),
    preferences: z
      .object({
        flightOption: z.enum(["cheapest", "shortest"]).default("cheapest"),
        directPreferred: z.boolean().default(false),
        hotelStars: z.number().int().min(1).max(5).default(3),
        pace: z.enum(["relaxed", "balanced", "busy"]).default("balanced"),
        foodDaily: moneySchema.default("0"),
        transportDaily: moneySchema.default("0"),
        otherCosts: moneySchema.default("0"),
      })
      .strict()
      .default({
        flightOption: "cheapest",
        directPreferred: false,
        hotelStars: 3,
        pace: "balanced",
        foodDaily: "0",
        transportDaily: "0",
        otherCosts: "0",
      }),
  })
  .strict()
  .superRefine((v, ctx) => {
    const check = (condition, path, message) => {
      if (!condition) ctx.addIssue({ code: "custom", path: [path], message });
    };
    check(
      v.endDate > v.startDate && dayCount(v.startDate, v.endDate) <= 22,
      "endDate",
      "Choose between 1 and 21 nights.",
    );
    check(
      v.adults + v.children <= 9,
      "adults",
      "A maximum of 9 seated travelers is supported.",
    );
    check(
      v.originCode !== v.destinationCode,
      "destinationCode",
      "Origin and destination must differ.",
    );
  });
export function parseNewTrip(input) {
  const trip = tripSchema.parse(input);
  if (trip.startDate < new Date().toISOString().slice(0, 10))
    throw new z.ZodError([
      {
        code: "custom",
        path: ["startDate"],
        message: "Departure cannot be in the past.",
      },
    ]);
  return trip;
}
export const contactSchema = z
  .object({
    name,
    email,
    subject: z.string().trim().min(2).max(150),
    message: z.string().trim().min(10).max(5000),
  })
  .strict();
export const instructionSchema = z
  .object({
    instruction: z.string().trim().max(1000).default(""),
    pace: z.enum(["relaxed", "balanced", "busy"]).optional(),
    interest: z.enum(interests).optional(),
    cheaper: z.boolean().default(false),
    flightId: z.string().min(1).max(255).optional(),
    hotelId: z.string().min(1).max(255).optional(),
  })
  .strict();
export const itemSchema = z
  .object({
    placeId: z.string().min(1).max(255),
    startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    reason: z.string().max(1000),
  })
  .strict();
export const daySchema = z
  .object({
    dayNumber: z.number().int().min(1).max(22),
    date,
    items: z.array(itemSchema).max(8),
  })
  .strict();
export const itinerarySchema = z
  .object({
    selectedFlightId: z.string(),
    selectedHotelId: z.string(),
    days: z.array(daySchema).min(1).max(22),
  })
  .strict();
