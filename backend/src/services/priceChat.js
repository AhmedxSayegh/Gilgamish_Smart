import { bookingToday } from "../../../shared/chatDates.mjs";
import { platformIntroduction } from "../../../shared/platformHelp.mjs";
import { z } from "zod";
import { demoCities, flightCodeFor } from "../../../shared/demoCities.mjs";
import { currencies } from "../utils/currency.js";

const short = z.string().trim().max(100);
const draftSchema = z.object({
  kind: z.enum(["flights","hotels"]), origin: short.default(""), destination: short.default(""),
  hotelName: short.default(""), startDate: z.string().max(10).default(""), endDate: z.string().max(10).default(""),
  adults: z.number().int().min(0).max(9).default(0), children: z.number().int().min(0).max(8).default(0),
  journey: z.enum(["","oneway","roundtrip"]).default(""), currency: z.enum(currencies).default("SAR"),
});
const norm = s => s.normalize("NFKD").replace(/\p{M}/gu,"").toLowerCase().replace(/ة/g,"ه").trim();
const digits = s => s.replace(/[٠-٩]/g,c=>String("٠١٢٣٤٥٦٧٨٩".indexOf(c)));
function cityMatch(value) {
  return demoCities.find(c => [c.code,c.name,c.nameAr,...c.aliases].some(alias=>norm(alias)===norm(value)));
}
function mentions(q) {
  return demoCities.map(c => {
    const positions = [c.name,c.nameAr,c.code,...c.aliases].map(a=>q.indexOf(norm(a))).filter(i=>i>=0);
    return {city:c,index:Math.min(...positions)};
  }).filter(m=>Number.isFinite(m.index)).sort((a,b)=>a.index-b.index).map(m=>m.city.name);
}
function readMessage(d, text, pending) {
  const q=norm(digits(text)), cities=mentions(q);
  const dates=q.match(/\b\d{4}-\d{2}-\d{2}\b/g) || [];
  if (dates.length) {
    if (dates.length===1 && d.startDate && !d.endDate && d.journey!=="oneway") d.endDate=dates[0];
    else { d.startDate=dates[0]; if(dates[1]) d.endDate=dates[1]; }
  }
  const codes = text.match(/\b[A-Z]{3}\b/g)?.filter(code=>!currencies.includes(code)) || [];
  const locations = cities.length ? cities : codes;
  // Accept non-catalog destinations in free text; prompt for an airport code if a city is ambiguous.
  const boundary = /\s+(?:on|from \d|for|check[- ]?in|departing|بتاريخ|يوم|لشخص|لمده|من تاريخ|بتكلفه|ذهاب|\d).*$/i;
  const route = q.match(/(?:^|\s)(?:from|من)\s+(.+?)\s+(?:to|الي|الى|لـ)\s+(.+)/);
  const town = q.match(/(?:^|\s)(?:in|في)\s+(.+)/);
  if(d.kind==="flights" && route) {
    d.origin=route[1].trim().slice(0,100); d.destination=route[2].replace(boundary,"").replace(/[؟?.!]+$/,"").trim().slice(0,100);
  } else if(d.kind==="hotels" && town) d.destination=town[1].replace(boundary,"").replace(/[؟?.!]+$/,"").trim().slice(0,100);
  if(d.kind==="flights" && locations.length>=2) [d.origin,d.destination]=locations;
  else if(locations.length && !(d.kind==="flights" && route)) {
    const city = cityMatch(locations[0]);
    const destinationPrefix = city && [city.nameAr, ...city.aliases].some(name => q.includes(" ل" + norm(name)));
    if(d.kind==="flights" && !d.origin && !destinationPrefix && !/(?:\bto\b|الى|الي)\s/.test(q)) d.origin=locations[0];
    else d.destination=locations[0];
  }
  if(d.kind==="hotels" && !d.hotelName) {
    const named=text.match(/(?:فندق|hotel)\s+(.+?)\s+(?:في|ب|in)\s+/i);
    if(named) d.hotelName=named[1].trim().slice(0,100);
  }
  if (!locations.length && pending && /^[\p{L}][\p{L} '-]{1,60}$/u.test(text) &&
      !/ريال|شخص|بالغ|طفل|ذهاب|عوده|adults?|one.way|round.trip|traveler/.test(q)) {
    if (d.kind==="flights" && !d.origin) d.origin=text;
    else if (!d.destination) d.destination=text;
  }
  const guests=q.match(/(\d+)\s*(?:بالغ|اشخاص|شخص|مسافر|نزيل|adults?|people|persons?|travelers?|guests?)/);
  if (guests) d.adults=Number(guests[1]);
  else if (/شخصين|بالغين اثنين|مسافرين اثنين|two adults/.test(q)) d.adults=2;
  else if (/شخص واحد|مسافر واحد|لوحدي|one adult|just me/.test(q)) d.adults=1;
  else if (pending && !d.adults && /^[1-9]$/.test(q)) d.adults=Number(q);
  const children=q.match(/(\d+)\s*(?:اطفال|طفل|children|child|kids?)/);
  if(children) d.children=Number(children[1]);
  else if (/طفلين/.test(q)) d.children=2;
  else if (/مع طفل|with a child/.test(q)) d.children=1;
  if (/ذهاب فقط|بدون عوده|one[ -]?way/.test(q)) {d.journey="oneway";d.endDate="";}
  else if(d.endDate || /ذهاب وعوده|ذهاب واياب|round[ -]?trip/.test(q)) d.journey="roundtrip";
  const currency=currencies.find(c=>new RegExp("\\b"+c+"\\b","i").test(q));
  if(currency) d.currency=currency;
  else if(/ريال/.test(q)) d.currency="SAR";
  else if(/دولار/.test(q)) d.currency="USD";
  else if(/يورو/.test(q)) d.currency="EUR";
}
const validDate=s=>/^\d{4}-\d{2}-\d{2}$/.test(s) && Number.isFinite(Date.parse(s)) && new Date(s).toISOString().slice(0,10)===s;
async function airport(value,providers) {
  const city=cityMatch(value);
  if(city) return city.code;
  if(/^[a-z]{3}$/i.test(value)) return value.toUpperCase();
  const matches=await providers.searchAirports?.(value) || [];
  return matches.length===1 ? matches[0].code : undefined;
}

export async function priceChat(raw, providers) {
  const msg=typeof raw?.message==="string" ? raw.message.trim() : "";
  if(!msg || msg.length>600) return null;
  const ar=/[\u0621-\u064a]/.test(msg) || (!/[a-z]/i.test(msg) && raw.language==="ar");
  const t=(en,arabic)=>ar?arabic:en;
  const q=norm(msg);
  const booking = /(?:احجز|حجز|\bbook(?:ing)?\b|\breserve\b)/.test(q) &&
    /طيران|طياره|طائره|تذكره|تذاكر|\bflights?\b|\b(?:airline|plane) tickets?\b/.test(q) &&
    !/الغاء|الغي|تعديل|الغِ|cancel|change my/.test(q);
  if (booking && !raw.quoteSubmit) {
    const draft = draftSchema.parse({kind:"flights"});
    readMessage(draft,msg,false);
    for (const field of ["origin","destination"]) {
      const city = cityMatch(draft[field]);
      if (city) draft[field] = flightCodeFor(city.code);
    }
    return {
      answer:t("Choose your destination and enter your flight details below to see prices.","اختَر الوجهة وعبّي معلومات رحلتك بالنموذج لتشوف أسعار الطيران."),
      context:{quote:draft,openFlightForm:true},
    };
  }
  const previous=raw.context?.quote;
  if(previous && /^(?:cancel|الغاء|الغي|إلغاء|وقف)$/i.test(q)) return {answer:t("Search cancelled.","تم إلغاء البحث."),context:{}};
  const flight=/طيران|طياره|طائره|تذاكر|تذكره|flights?|airfare|plane ticket/.test(q);
  const hotel=/فنادق|فندق|اقامه|لليله|hotel|room rate/.test(q);
  const price=/سعر|اسعار|بكم|كم تكلف|قديش|تكلفه|ارخص|اسعار|بكام|price|cost|how much|cheapest|rates?|quote|كم حق/.test(q);
  const kind=price && (hotel || flight) ? (hotel?"hotels":"flights") : undefined;
  if(!raw.quoteSubmit && !kind && !previous) return null;
  if (previous && !raw.quoteSubmit && platformIntroduction(msg)) return null;
  if(previous && !kind && !raw.quoteSubmit && /عاصم|اماكن سياحيه|اشرح|معالم|landmarks|capital of/.test(q)) return null;
  const draft=draftSchema.parse(raw.quoteSubmit || (previous && (!kind || kind===previous.kind) ? previous : {kind}));
  const respond=answer=>({answer,context:{quote:draft}});
  if(!raw.quoteSubmit) readMessage(draft,msg,!!previous);
  if(draft.children>8 || draft.adults>9 || draft.adults+draft.children>9) {
    draft.adults=0; draft.children=0;
    return respond(t("Enter up to nine travelers, including at least one adult.","حدّد حتى تسعة مسافرين بالمجموع، وبينهم بالغ واحد على الأقل."));
  }
  const f=draft.kind==="flights";
  if(!draft.destination || (f && !draft.origin)) return respond(f?t("Which cities or airport codes are you flying from and to?","من أي مدينة ولأي مدينة مسافر؟ فيك تكتب رموز المطارات كمان."):t("Which city will you stay in?","بأي مدينة بدك الفندق؟"));
  if(!validDate(draft.startDate) || draft.startDate<bookingToday())
    return respond(t("Choose today or a later departure or check-in date (YYYY-MM-DD).","اختر اليوم أو تاريخاً لاحقاً للسفر أو الدخول بصيغة YYYY-MM-DD."));
  if(f && !draft.journey) return respond(t("One way or round trip? For a return, enter its date.","ذهاب فقط أو ذهاب وعودة؟ إذا في عودة، اكتب تاريخها."));
  if(!f || draft.journey==="roundtrip") {
    if(!validDate(draft.endDate) || draft.endDate<=draft.startDate) return respond(t("Enter a return or check-out date after the start date (YYYY-MM-DD).","اكتب تاريخ العودة أو الخروج بعد تاريخ البداية بصيغة YYYY-MM-DD."));
    if(!f && Date.parse(draft.endDate)-Date.parse(draft.startDate)>21*86400000) return respond(t("Hotel search supports stays up to 21 nights.","بحث الفنادق بيدعم إقامة لحد 21 ليلة."));
  }
  if(!(draft.adults>=1 && draft.adults+draft.children<=9)) {
    draft.adults=0;
    return respond(t("How many adults and children are traveling? Up to nine in total.","كم بالغ وكم طفل مسافرين؟ الحد الأقصى تسعة بالمجموع."));
  }
  if(!f && draft.children) return respond(t("The hotel provider quotes one room for adults only. It cannot quote this family's occupancy.","مزوّد الفنادق بيسعّر غرفة واحدة للبالغين. ما عنده سعر موثوق لهالإقامة مع أطفال."));
  const mode=providers.modes?.[draft.kind];
  if(!mode || mode==="mock") return respond(t("Live prices are unavailable for this search.","الأسعار المباشرة غير متاحة لهالبحث حالياً."));
  try {
    const destinationCode=(!f && mode==="serpapi") ? cityMatch(draft.destination)?.code : await airport(draft.destination,providers);
    const originCode=f ? await airport(draft.origin,providers) : undefined;
    if((f && !originCode) || (!destinationCode && (f || mode!=="serpapi"))) return respond(t("Enter the three-letter airport code for the city in the search fields.","اكتب رمز المطار من 3 أحرف للمدينة بخانات البحث."));
    if(f && flightCodeFor(originCode)===flightCodeFor(destinationCode)) return respond(t("Choose different departure and arrival airports.","اختَر مطارين مختلفين للمغادرة والوصول."));
    const trip={...draft,originCode,destinationCode,language:ar?"ar":"en",endDate:f && draft.journey==="oneway"?undefined:draft.endDate};
    const offers= f ? await providers.travel.flights(trip) : await providers.travel.hotels(trip,{hotelName:draft.hotelName});
    const eligible=offers.filter(o=>o.price!=null && Number.isFinite(Number(o.price)) && Number(o.price)>0 && o.currency===draft.currency &&
      (f || !draft.hotelName || norm(o.name || "").includes(norm(draft.hotelName))));
    eligible.sort((a,b)=>Number(a.price)-Number(b.price));
    if(!eligible.length) return respond(t("No matching priced offers were returned for these details.","ما رجع المزوّد عروض مسعّرة بتطابق هالتفاصيل."));
    const scope=f ? (draft.journey==="oneway"?t("one way","ذهاب فقط"):t("round trip","ذهاب وعودة")) : t("one room · full stay","غرفة واحدة · كامل الإقامة");
    const route=f ? draft.origin+" → "+draft.destination : draft.destination;
    const guests=t(draft.adults+" adults, "+draft.children+" children",draft.adults+" بالغ، "+draft.children+" أطفال");
    const header=[route,scope,guests,draft.startDate,trip.endDate].filter(Boolean).join(" · ");
    const lines=eligible.slice(0,3).map(o=>"• "+(f ? [o.airlineName || o.airlineCode,o.departureTime].filter(Boolean).join(" · ") : o.name)+" — "+o.price+" "+o.currency);
    return {answer:[header,...lines].join("\n"),context:{}};
  } catch {
    return respond(t("The provider couldn’t complete the price search. Check your details and retry.","تعذّر جلب السعر من المزوّد. تأكد من التفاصيل وجرّب مرة تانية."));
  }
}
