import test from "node:test";
import assert from "node:assert/strict";
import { dailyWindows, nextActivitySlot } from "../../shared/visitWindows.mjs";
import { validateItinerary } from "../src/services/itineraryService.js";

const input = { startDate: "2026-11-15", endDate: "2026-11-20" };
const flight = { id: "flight", arrivalTime: "2026-11-15T13:00:00", returnDepartureTime: "2026-11-20T15:00:00" };

test("arrival and return days expose the same flight buffers used by validation", () => {
  const windows = dailyWindows(input, flight);
  assert.equal(windows[0].startTime, "15:00");
  assert.equal(windows[5].endTime, "12:00");
  assert.equal(windows[1].startTime, "09:00");
  assert.deepEqual(nextActivitySlot(windows[0], []), { startTime: "15:00", endTime: "16:30" });
});

test("new activities follow the latest activity and stop at the available end time", () => {
  const window = dailyWindows(input, flight)[0];
  assert.deepEqual(nextActivitySlot(window, [{ endTime: "18:30" }, { endTime: "16:00" }]), { startTime: "19:00", endTime: "20:00" });
  assert.equal(nextActivitySlot(window, [{ endTime: "19:30" }]), null);
});

test("late arrivals, early returns and days before arrival cannot receive new activities", () => {
  for (const window of [
    dailyWindows(input, { ...flight, arrivalTime: "2026-11-15T23:00:00" })[0],
    dailyWindows(input, { ...flight, returnDepartureTime: "2026-11-20T07:00:00" })[5],
    dailyWindows(input, { ...flight, arrivalTime: "2026-11-16T08:00:00" })[0],
  ]) {
    assert.equal(window.canVisit, false);
    assert.equal(nextActivitySlot(window, []), null);
  }
});

test("manual edits before arrival include the allowed window and preserve validation", () => {
  const context = { input, flight, hotel: { id: "hotel" }, onlyDay: 1, places: [{ id: "place", name: "Old Damascus" }] };
  const plan = { selectedFlightId: "flight", selectedHotelId: "hotel", days: [{ dayNumber: 1, date: input.startDate, items: [{ placeId: "place", startTime: "10:00", endTime: "11:30", reason: "" }] }] };
  assert.throws(() => validateItinerary(plan, context), (error) => {
    assert.equal(error.code, "FLIGHT_TIME_CONFLICT");
    assert.equal(error.details.window.startTime, "15:00");
    return true;
  });
  Object.assign(plan.days[0].items[0], nextActivitySlot(dailyWindows(input, flight)[0], []));
  assert.equal(validateItinerary(plan, context)[0].items[0].startTime, "15:00");
});
