// Fixed demo destinations. QCA identifies Makkah in this catalog; it is NOT a flight airport.
// Makkah flight requests use JED, while place/hotel searches stay centered on Makkah.
const rows = [
  ["DAM", "Damascus", "دمشق", "Syria", "سوريا", "SY", 33.5138, 36.2765, ["Dimashq", "الشام"]],
  ["IST", "Istanbul", "إسطنبول", "Türkiye", "تركيا", "TR", 41.01, 28.98, ["اسطنبول", "İstanbul"]],
  ["MED", "Madinah", "المدينة المنورة", "Saudi Arabia", "السعودية", "SA", 24.47, 39.61, ["Medina", "Al Madinah", "Madinah Munawwarah", "المدينة"]],
  ["QCA", "Makkah", "مكة المكرمة", "Saudi Arabia", "السعودية", "SA", 21.4225, 39.8262, ["Mecca", "Mekka", "Makkah Mukarramah", "مكة"]],
  ["JED", "Jeddah", "جدة", "Saudi Arabia", "السعودية", "SA", 21.49, 39.19, ["Jidda"]],
  ["RUH", "Riyadh", "الرياض", "Saudi Arabia", "السعودية", "SA", 24.71, 46.68, []],
  ["AMM", "Amman", "عمّان", "Jordan", "الأردن", "JO", 31.95, 35.93, ["عمان"]],
  ["DXB", "Dubai", "دبي", "United Arab Emirates", "الإمارات", "AE", 25.2, 55.27, []],
  ["CAI", "Cairo", "القاهرة", "Egypt", "مصر", "EG", 30.04, 31.24, []],
  ["PAR", "Paris", "باريس", "France", "فرنسا", "FR", 48.85, 2.35, []],
];
export const demoCities = Object.freeze(rows.map(([code, name, nameAr, country, countryAr, countryCode, latitude, longitude, aliases]) => Object.freeze({
  id: `demo-city-${code}`, code, cityCode: code, name, nameAr, country, countryAr, countryCode, latitude, longitude,
  aliases: Object.freeze(aliases), flightCode: code === "QCA" ? "JED" : code,
  codeType: code === "QCA" ? "demo_city" : "city_or_airport",
})));
export const demoCityByCode = (code) => demoCities.find((city) => city.code === code);
export const flightCodeFor = (code) => demoCityByCode(code)?.flightCode || code;
const normalized = (value) => String(value || "").normalize("NFKD").toLowerCase()
  .replace(/[\u0300-\u036f\u064B-\u065F\u0670\u0640]/g, "").replace(/[أإآٱ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه").trim();
export function searchDemoCities(query) {
  const needle = normalized(query);
  if (!needle) return [];
  return demoCities.filter((city) => [city.name, city.nameAr, city.code, ...city.aliases].some((value) => normalized(value).includes(needle)));
}

const regionalAirports = [
  ["ALG","Algiers","الجزائر","Houari Boumediene Airport","هواري بومدين","الجزائر العاصمة"],
  ["ORN","Oran","وهران","Ahmed Ben Bella Airport","أحمد بن بلة"],
  ["CZL","Constantine","قسنطينة","Mohamed Boudiaf Airport","محمد بوضياف"],
  ["TUN","Tunis","تونس","Tunis–Carthage Airport","تونس قرطاج"],
  ["CMN","Casablanca","الدار البيضاء","Mohammed V International Airport","محمد الخامس","كازابلانكا"],
  ["BEY","Beirut","بيروت","Beirut–Rafic Hariri International Airport","رفيق الحريري"],
  ["DOH","Doha","الدوحة","Hamad International Airport","حمد الدولي"],
].map(([code,name,nameAr,airportName,...aliases]) => ({
  id: "airport-" + code, code, cityCode: code, flightCode: code, name, nameAr, airportName, aliases,
}));

export function searchAirportSuggestions(query) {
  const needle = normalized(query).replace(/^مطار\s+/u, "");
  if (!needle) return [];
  return [...searchDemoCities(needle), ...regionalAirports.filter(city =>
    [city.code, city.name, city.nameAr, city.airportName, ...city.aliases].some(value => normalized(value).includes(needle))
  )];
}
