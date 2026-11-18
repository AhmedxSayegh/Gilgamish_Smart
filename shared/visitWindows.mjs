const minutes = (time) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
const clock = (value) => `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;

// Destination-local minutes relative to the itinerary's first calendar day.
export function umrahSlot(input, flight) {
  const offset = timestamp => (Date.parse(timestamp.slice(0, 10)) - Date.parse(input.startDate)) / 86400000 * 1440
    + minutes(timestamp.slice(11, 16));
  const start = offset(flight.arrivalTime) + 120;
  const end = start + 180;
  return { start, end, startTime: clock(start % 1440), endTime: clock(end % 1440),
    fitsStay: end <= offset(flight.returnDepartureTime) - 180 };
}

// Flight times are destination-local times, matching the itinerary's date and clock fields.
export function dailyWindows(input, flight, onlyDay) {
  const count = Math.round((Date.parse(input.endDate) - Date.parse(input.startDate)) / 86400000) + 1;
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(Date.parse(input.startDate) + index * 86400000).toISOString().slice(0, 10);
    let start = 9 * 60, end = 20 * 60;
    const arrivalDate = flight.arrivalTime.slice(0, 10);
    const departureDate = flight.returnDepartureTime.slice(0, 10);
    if (date < arrivalDate || date > departureDate) start = end;
    if (date === arrivalDate) start = Math.max(start, minutes(flight.arrivalTime.slice(11, 16)) + 120);
    if (date === departureDate) end = Math.min(end, minutes(flight.returnDepartureTime.slice(11, 16)) - 180);
    if (input.destinationCode === "QCA" && index > 0) start = Math.max(start, umrahSlot(input, flight).end + 30 - index * 1440);
    return { dayNumber: index + 1, date, startTime: clock(Math.min(start, 1439)), endTime: clock(Math.max(0, end)), canVisit: start < end };
  }).filter((day) => !onlyDay || day.dayNumber === onlyDay);
}

export function nextActivitySlot(window, items) {
  if (!window?.canVisit) return null;
  const start = Math.max(minutes(window.startTime), ...items.map((item) => minutes(item.endTime) + 30));
  const end = Math.min(start + 90, minutes(window.endTime));
  if (end - start < 30) return null;
  return { startTime: clock(start), endTime: clock(end) };
}
