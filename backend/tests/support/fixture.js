import { parseNewTrip } from "../../src/validators/schemas.js";
import { addDays } from "../../src/utils/dates.js";
export function tripFixture(patch = {}) {
  const start = addDays(new Date().toISOString().slice(0, 10), 30);
  return parseNewTrip({
    origin: "Jeddah",
    destination: "Istanbul",
    originCode: "JED",
    destinationCode: "IST",
    startDate: start,
    endDate: addDays(start, 4),
    adults: 2,
    children: 0,
    totalBudget: "12000.00",
    currency: "SAR",
    interests: ["history", "food"],
    language: "en",
    preferences: {
      foodDaily: "80",
      transportDaily: "60",
      otherCosts: "100",
      pace: "balanced",
      hotelStars: 3,
      flightOption: "cheapest",
      directPreferred: false,
    },
    ...patch,
  });
}
