import { AppError } from "../utils/errors.js";

const hotels = [
  ["afamia",3,"Afamia Hotel","فندق أفاميا","Near the historic Hejaz railway station in central Damascus.","قريب من محطة الحجاز التاريخية في وسط دمشق."],
  ["damascus-international",3,"Damascus International Hotel","فندق دمشق الدولي","An economical option in our Damascus collection. Ask about the available room types when booking.","من خيارات الإقامة الاقتصادية في دليل دمشق. يمكنك الاستفسار عن أنواع الغرف المتاحة عند الحجز."],
  ["cham",3,"Cham International Hotel","فندق الشام الدولي","A central Damascus option near the start of Al Salihiyah Street.","خيار للإقامة وسط دمشق قرب بداية شارع الصالحية."],
  ["caesar",4,"Caesar Palace Hotel","فندق القيصر","On Al Thawra Street, a convenient starting point for exploring the city centre.","يقع في شارع الثورة، وهو نقطة انطلاق للتجول في وسط المدينة."],
  ["four-seasons",5,"Four Seasons Damascus","فندق فور سيزون دمشق","A prominent hotel beside the Barada River in the modern city centre.","فندق بارز على ضفاف نهر بردى في وسط دمشق الحديث."],
  ["dama-rose",5,"Dama Rose Hotel","فندق الداما روز","On Shoukry Al Quwatli Street near Umayyad Square.","يقع في شارع شكري القوتلي قرب ساحة الأمويين."]
];
let rates;
async function usdRate(currency) {
  if (currency === "USD") return 1;
  if (!rates || rates.expires < Date.now()) {
    rates = {expires:Date.now()+3600000, data:fetch("https://open.er-api.com/v6/latest/USD",{signal:AbortSignal.timeout(6000)})
      .then(async r => r.ok ? (await r.json()).rates : null).catch(()=>null)};
  }
  const value = (await rates.data)?.[currency];
  if (!(value > 0)) { rates = null; throw new AppError(503,"FX_UNAVAILABLE","Hotel estimate conversion is temporarily unavailable."); }
  return value;
}
export async function damascusHotels(trip, options) {
  const stars = trip.preferences.hotelStars;
  const usd = {3:65,4:95,5:135}[stars];
  const rate = await usdRate(trip.currency);
  const nightlyPrice = (usd * rate).toFixed(2);
  const nights = Math.max(1,(Date.parse(trip.endDate)-Date.parse(trip.startDate))/86400000);
  const rooms = Math.max(1, Math.ceil((trip.adults + trip.children)/2));
  return hotels.filter(([,s,en,ar]) => s === stars && (!options?.hotelName || (en+" "+ar).toLowerCase().includes(options.hotelName.toLowerCase())))
    .map(([slug,,name,nameAr,description,descriptionAr])=>({
      id:"damascus-"+slug, providerHotelId:slug, provider:"damascus_local", name,nameAr,description,descriptionAr,stars,
      checkIn:trip.startDate,checkOut:trip.endDate, rooms, adults:trip.adults, children:trip.children,
      price:(Number(nightlyPrice)*rooms*nights).toFixed(2),nightlyPrice,currency:trip.currency,
      observedAt:new Date().toISOString(), bookingUrl:"https://wa.me/message/HAUBZDFQZAX7P1"
    }));
}
