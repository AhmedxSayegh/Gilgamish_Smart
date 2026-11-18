export const dayMs = 86400000;
export const dayCount = (start, end) =>
  Math.round((Date.parse(end) - Date.parse(start)) / dayMs) + 1;
export const addDays = (date, number) =>
  new Date(Date.parse(date) + number * dayMs).toISOString().slice(0, 10);
export const minutes = (value) =>
  Number(value.slice(0, 2)) * 60 + Number(value.slice(3, 5));
export const clock = (value) =>
  `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
