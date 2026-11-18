export function arabicSpeechText(answer) {
  const currencies = { SAR: "ريال سعودي", USD: "دولار أمريكي", EUR: "يورو", AED: "درهم إماراتي", GBP: "جنيه إسترليني", TRY: "ليرة تركية" };
  const airports = { DAM: "دمشق", JED: "جدّة", RUH: "الرياض", DXB: "دبي", IST: "إسطنبول", CAI: "القاهرة", MED: "المدينة المنوّرة", AMM: "عمّان", ALG: "الجزائر العاصمة" };
  return answer.replace(/\b([A-Z]{3})\s+([0-9][\d,]*(?:\.\d+)?)\b/g, (match, code, amount) =>
    currencies[code] ? amount + " " + currencies[code] : match)
    .replace(/\b[A-Z]{3}\b/g, code => currencies[code] || airports[code] || code)
    .replace(/→/g, " إلى ").replace(/[·•]/g, "، ");
}
