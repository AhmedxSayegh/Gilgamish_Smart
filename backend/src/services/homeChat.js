import countryCapitals from "../../../shared/countryCapitals.json" with { type: "json" };
import countryHeritage from "../../../shared/countryHeritage.json" with { type: "json" };
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { demoCities } from "../../../shared/demoCities.mjs";
import { guideContent } from "../../../shared/guideContent.mjs";
import { platformHelp, platformIntroduction } from "../../../shared/platformHelp.mjs";
import { cityHighlights } from "../../../shared/cityHighlights.mjs";
import { fetchJson, TtlCache } from "../providers/http.js";

const input = z.object({
  message: z.string().trim().min(1).max(600),
  language: z.enum(["en", "ar"]),
  history: z.array(z.object({ role: z.enum(["user","assistant"]), text: z.string().max(1200) })).max(4).default([]),
  context: z.object({
    country: z.string().length(2).optional(),
    city: z.string().max(8).optional(),
    listId: z.string().uuid().optional(),
    pageEnd: z.number().int().min(0).max(10000).optional(),
    offset: z.number().int().min(0).max(10000).optional(),
    focused: z.number().int().min(0).max(10000).optional(),
    pendingCapital: z.boolean().optional(),
    pendingPlaces: z.string().min(1).max(600).optional(),
    locality: z.string().max(100).optional(),
    place: z.string().max(160).optional(),
  }).optional(),
});
const norm = text => text.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().replace(/ة/g, "ه");
const cityNames = c => [c.name, c.nameAr, ...c.aliases];
const englishRegions = new Intl.DisplayNames("en", { type: "region", fallback: "none" });
const arabicRegions = new Intl.DisplayNames("ar", { type: "region", fallback: "none" });
// Country to geographic subregion, from Unicode CLDR supplemental/territoryContainment.
const subregions = {
  "005":"AR BO BR BV CL CO EC FK GF GS GY PE PY SR UY VE",
  "011":"BF BJ CI CV GH GM GN GW LR ML MR NE NG SH SL SN TG",
  "013":"BZ CR GT HN MX NI PA SV", "014":"BI DJ ER ET IO KE KM MG MU MW MZ RE RW SC SO SS TF TZ UG YT ZM ZW",
  "015":"DZ EG EH LY MA SD TN EA IC", "017":"AO CD CF CG CM GA GQ ST TD", "018":"BW LS NA SZ ZA",
  "021":"BM CA GL PM US", "029":"AG AI AW BB BL BQ BS CU CW DM DO GD GP HT JM KN KY LC MF MQ MS PR SX TC TT VC VG VI",
  "030":"CN HK JP KP KR MN MO TW", "034":"AF BD BT IN IR LK MV NP PK", "035":"BN ID KH LA MM MY PH SG TH TL VN",
  "039":"AD AL BA ES GI GR HR IT ME MK MT RS PT SI SM VA XK", "053":"AU CC CX HM NF NZ",
  "054":"FJ NC PG SB VU", "057":"FM GU KI MH MP NR PW UM", "061":"AS CK NU PF PN TK TO TV WF WS",
  "143":"TM TJ KG KZ UZ", "145":"AE AM AZ BH CY GE IL IQ JO KW LB OM PS QA SA SY TR YE",
  "151":"BG BY CZ HU MD PL RO RU SK UA", "154":"GG IM JE AX DK EE FI FO GB IE IS LT LV NO SE SJ CQ",
  "155":"AT BE CH DE FR LI LU MC NL",
};
const countries = [];
for (const first of "ABCDEFGHIJKLMNOPQRSTUVWXYZ") {
  for (const last of "ABCDEFGHIJKLMNOPQRSTUVWXYZ") {
    const code = first + last, en = englishRegions.of(code), ar = arabicRegions.of(code);
    if (en && ar) countries.push({ code, en, ar, aliases: [en, ar] });
  }
}
countries.find(c => c.code === "ID").aliases.push("اندونيسيا", "اندونسيا", "اندوسيا", "اندونيسا", "اندويسيا", "إندونيسية", "Indonisia");
countries.find(c => c.code === "TR").aliases.push("Turkey");
for (const [code, aliases] of Object.entries({
  US: ["أمريكا","الولايات المتحدة الأمريكية","USA","United States of America"],
  GB: ["بريطانيا","بريطانيا العظمى","UK","Britain","Great Britain"],
  AE: ["الامارات","UAE"], SA: ["السعوديه"], CN: ["China","الصين الشعبية"],
})) countries.find(c => c.code === code)?.aliases.push(...aliases);
for (const country of countries) {
  if (country.ar.startsWith("ال")) country.aliases.push(country.ar.slice(2));
}
const countryNames = countries.flatMap(country => country.aliases.map(alias => ({
  country, name: norm(alias),
}))).sort((a, b) => b.name.length - a.name.length);
const generalQuestion = /tell me (?:more )?about|what.*know about|what.*like|talk about|خبرني|حدثني|احكيلي عن|شو بتعرف عن|information (?:on|about)|overview|what.*(?:visit|see)|معلومات|احكيلي|نبذه|شو.*(?:شوف|زور)/;
const indonesia = {
  overview: ["Indonesia is an island country in Southeast Asia. Bali is known for its temples and rice terraces, Java for Yogyakarta and Borobudur, and Sumatra for its rainforests.", "إندونيسيا دولة جزرية في جنوب شرق آسيا. تشتهر بالي بمعابدها ومدرّجات الأرز، وفي جزيرة جاوة تقع يوغياكارتا ومعبد بوروبودور، أمّا سومطرة فتشتهر بغاباتها المطيرة."],
  attractions: [
    "Here are four places to visit in Indonesia:\n• Ubud, Bali — walk through rice terraces and explore Balinese art.\n• Borobudur, Central Java — visit the Buddhist temple near Yogyakarta.\n• Mount Bromo, East Java — see the volcanic crater and mountain viewpoints.\n• Komodo National Park, near Flores — explore the islands and see Komodo dragons with a park guide.",
    "من أبرز الأماكن السياحية في إندونيسيا:\n• أوبود في بالي — للتجوّل بين مدرّجات الأرز والتعرّف على الفن البالي.\n• معبد بوروبودور في جاوة الوسطى — معبد بوذي تاريخي قرب يوغياكارتا.\n• جبل برومو في جاوة الشرقية — لمشاهدة الفوّهة البركانية والمناظر الجبلية.\n• منتزه كومودو الوطني قرب جزيرة فلوريس — لاستكشاف الجزر ومشاهدة تنانين كومودو برفقة مرشد من المنتزه.",
  ],
  money: ["The currency is the Indonesian rupiah (IDR).", "عملة إندونيسيا هي الروبية الإندونيسية (IDR)."],
  language: ["The national language is Indonesian (Bahasa Indonesia).", "اللغة الوطنية هي الإندونيسية (Bahasa Indonesia)."],
};
const topics = [
  ["season", /season|best time|weather|موسم|طقس|افضل وقت/],
  ["visa", /visa|entry requirements|تاشير|فيزا/],
  ["money", /currency|cash|money|عمله|نقود/],
  ["customs", /customs|etiquette|عادات|لباس/],
  ["safety", /safety|safe to|امن|سلامه/],
];
const faqTopics = [
  /how.*(plan|generat).*trip|كيف.*(بيخطط|يخطط|تخطيط)/,
  /\b(edit|modify|regenerate)\b|change.*(day|activit|plan)|عدل|تعديل|غير.*(نشاط|يوم|خطه)/,
  /platform.*free|gilgamish.*free|مجاني|payment system/,
  /group trip|how many travel|multi.room|عدد المسافرين|رحل.*جماعي/,
];
const live = /open\b|opening|hours|address|location|where is|مفتوح|فاتح|دوام|ساعات العمل|عنوان|وين موقع/;
const browse = /visit|see|highlight|attraction|landmark|tell me about|اشوف|شوف|زور|معالم|اماكن|معلومات عن/;

const capitals = demoCities.map(c => ({ names: guideContent(c).capital, country: c.countryCode }));
const correction = /(?:اقصد|قصدي|اعني|i mean|i meant)\s+(.+)/i;
const madinahLocations = [
  {
    name: "المسجد النبوي", names: ["الحرم المدني","الحرم النبوي","المسجد النبوي","The Prophet's Mosque","Al Masjid an Nabawi"],
    answer: ["The Prophet’s Mosque is in central Madinah, Saudi Arabia.", "الحرم المدني هو المسجد النبوي، ويقع في وسط المدينة المنورة بالسعودية."],
  },
  {
    name: "مسجد القبلتين", names: ["مسجد القبلتين","جامع القبلتين","Masjid al-Qiblatayn","Qiblatain Mosque"],
    answer: ["Masjid al-Qiblatayn is on Khalid ibn al-Walid Road in Madinah, Saudi Arabia.", "يقع مسجد القبلتين على طريق خالد بن الوليد في المدينة المنورة بالسعودية."],
  },
];
function locationSubject(text) {
  const m = text.trim().match(/^(?:طيب\s+)?(?:[أا]ين\s+(?:يقع|تقع|يوجد|توجد)|وين\s+(?:موقع|مكان|يقع|تقع)|وين|where\s+is|what is the address of)\s+(.+?)[؟?.!]*$/i);
  const suffix = text.trim().match(/^(.+?)\s+(?:[أا]ين|وين)\s*(?:يقع|تقع|يوجد|توجد|موقعه|موقعها)?[؟?.! ]*$/i);
  const matched = m?.[1] || suffix?.[1];
  if (!matched) return;
  const name = matched.replace(/\s+(?:في|in)\s+.+$/i,"").replace(/\s+located$/i,"").trim();
  if (name && !/^(?:it|there|هو|هي|مكانه|موقعه)$/i.test(name)) return name;
}
function destinationInQuestion(q) {
  const colloquialCity = q.match(/(?:اماكن|معالم|مناطق|مطاعم|مقاهي|متاحف)(?:\s+(?:ال)?(?:سياحيه|سياحه|اضافيه|اضافه))?\s+ب\s*([\p{Script=Arabic}][\p{Script=Arabic} ]*?)[؟?.! ]*$/u)?.[1];
  const target = (q.match(correction)?.[1] || colloquialCity || q.match(/(?:\b(?:in|about|visit)|(?:^|\s)(?:عن|في))\s+([^?.!؟]+)[?.!؟]*$/)?.[1])?.trim();
  if (!target || target.length > 100 || /^(?:it|there|that|this|هنا|هناك|ها|ها البلد|هالبلد|هالدوله|هذه الدوله|هالمدينه|هذه المدينه|معالم|اماكن(?: سياحيه)?|وجهات|مطاعم|متاحف)$/i.test(target)) return undefined;
  return target.replace(/[؟?.!]+$/, "");
}

async function interpretQuestion(config, message, language, previous, destination, fetchImpl) {
  const response = await fetchJson(config.ollamaBaseUrl + "/api/chat", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: process.env.CHAT_MODEL || "qwen2.5:1.5b", stream: false, format: "json", keep_alive: "30m",
      options: { temperature: 0, num_predict: 80, num_ctx: 2048 },
      messages: [
        { role: "system", content: 'Route this travel question. Return JSON with city (only a city explicitly named in the latest question; else empty), kind ("places", "help", or "background"), and faq (index 0=planning, 1=editing, 2=payment, 3=group size, or -1). Keep city in the original spelling. Never generate an answer or suggest venue names.' },
        ...previous,
        { role: "user", content: destination ? (language === "Arabic" ? "الوجهة: " : "Destination: ") + destination + "\n" + message : message },
      ],
    }),
  }, { fetchImpl, timeout: 20000 });
  return z.object({ city: z.string().max(100), kind: z.enum(["places","help","background"]), faq: z.number().int().optional() }).parse(JSON.parse(response.message.content));
}

function capitalReply(country, ar) {
  const names = (countryCapitals[country.code] || []).map(c => ar && c.ar ? c.ar : c.en);
  const list = names.join(ar ? "، " : ", ");
  const answer = names.length
    ? (ar ? (names.length === 1 ? "عاصمة " : "العواصم المسجّلة لدولة ") + country.ar + " هي " + list + "." :
      (names.length === 1 ? "The capital of " + country.en + " is " : "The listed capitals of " + country.en + " are ") + list + ".")
    : (ar ? "ما عندي عاصمة موثّقة لهالدولة." : "I don’t have a verified capital for this country.");
  return {answer,context:{country:country.code}};
}

// The browser holds an opaque list ID; only server-verified entries can be recalled.
const chatLists = new Map();
function pageReply(list, start, context, ar) {
  const page = list.items.slice(start,start + 3);
  return {
    answer: page.map(item => "• " + (item.line || item.name)).join("\n"),
    link: page[0]?.link || list.link,
    context: {...context, listId:list.id, pageEnd:start+page.length, offset:start, focused:undefined},
  };
}
function startList(items, context, ar, link, expand) {
  const names = new Set();
  const unique = items.filter(item => {
    const key = norm(item.name);
    if (names.has(key)) return false;
    names.add(key); return true;
  });
  if (chatLists.size >= 200) chatLists.delete(chatLists.keys().next().value);
  const list = {id:randomUUID(),items:unique,link,expand};
  chatLists.set(list.id,list);
  return pageReply(list,0,context,ar);
}
function heritageEntries(code, ar) {
  return (countryHeritage[code] || []).map(s => ({
    name:ar && s.ar ? s.ar : s.en, aliases:[s.en,s.ar].filter(Boolean), site:s,
    link:{href:"https://whc.unesco.org/en/list/" + s.id + "/",label:ar ? "اليونسكو" : "UNESCO"},
  }));
}
async function searchPlaceArticle(item, context, ar, fetchImpl) {
  const city = demoCities.find(c => c.code === context.city);
  const scopes = [item.locality, context.locality, ...(city ? cityNames(city) : [])].filter(Boolean);
  const capital = Object.values(countryCapitals).flat().find(c =>
    [c.en,c.ar].some(n => n && scopes.some(s => norm(s) === norm(n))));
  if (capital) scopes.push(...[capital.en,capital.ar].filter(Boolean));
  if (!scopes.length && context.country) scopes.push(englishRegions.of(context.country),arabicRegions.of(context.country));
  const base = ar ? "https://ar.wikipedia.org" : "https://en.wikipedia.org";
  // Map common Arabic park names to the wording used in encyclopedia titles.
  const parkTitle = ar && norm(item.name).replace(/(?:ال)?(?:متنزه|منتزه)\s+(?:ال)?وطني(?=\s|$)/g,"الحديقه الوطنيه");
  const beirutCorniche = /^كورنيش عين (?:ال)?مريس[هة]$/.test(norm(item.name)) &&
    (!scopes.length || scopes.some(s => /بيروت|beirut|لبنان|lebanon/i.test(s)));
  const searchName = beirutCorniche ? (ar ? "كورنيش بيروت" : "Corniche Beirut") :
    parkTitle && parkTitle !== norm(item.name) ? parkTitle.replace("الحديقه الوطنيه","الحديقة الوطنية") : item.name;
  const searchScope = (ar ? capital?.ar : capital?.en) || scopes[0];
  const query = new URLSearchParams({
    action:"query", format:"json", formatversion:"2", generator:"search",
    gsrsearch:[searchName,searchScope].filter(Boolean).join(" "), gsrlimit:"4",
    prop:"extracts|pageprops", exintro:"1", explaintext:"1", exsentences:"3", exlimit:"4",
  });
  const clean = s => norm(s).replace(/[^\p{L}\p{N}]+/gu," ").trim();
  try {
    const data = await fetchJson(base+"/w/api.php?"+query,{}, {fetchImpl,timeout:4000});
    const aliases = [item.name,searchName,...(item.aliases || [])].map(clean);
    const pages = (data.query?.pages || []).filter(p => {
      if (!p.extract || !p.title || p.pageprops?.disambiguation !== undefined) return false;
      const title = " "+clean(p.title)+" ";
      const content = clean(p.title+" "+p.extract);
      return aliases.some(n => n && title.includes(" "+n+" ")) &&
        (!scopes.length || scopes.some(s => content.includes(clean(s))));
    });
    const exact = pages.filter(p => aliases.includes(clean(p.title)));
    const matches = exact.length ? exact : pages;
    if (matches.length === 1) {
      const page = matches[0];
      const heading = beirutCorniche ? item.name + (ar ? " (عن كورنيش بيروت)" : " (about the Beirut Corniche)") : item.name;
      return {answer:heading+" — "+page.extract.trim(),link:{href:base+"/?curid="+page.pageid,label:ar?"ويكيبيديا":"Wikipedia"}};
    }
  } catch { /* The saved description remains available when Wikipedia is offline. */ }
}

async function describeItem(item, ar, fetchImpl) {
  if (item.site) {
    const field = ar ? "short_description_ar" : "short_description_en";
    try {
      const query = new URLSearchParams({where:"id_no='"+item.site.id+"'",select:field,limit:"1"});
      const r = await fetchJson("https://data.unesco.org/api/explore/v2.1/catalog/datasets/whc001/records?"+query,{}, {fetchImpl,timeout:4000});
      const description = r.results?.[0]?.[field]?.replace(/<[^>]*>/g," ").replace(/&nbsp;/g," ").replace(/\s+/g," ").trim();
      if (description) return item.name + " — " + description;
    } catch { /* Local inscription data is available offline. */ }
    return ar ? item.name+" مدرج على قائمة التراث العالمي لليونسكو"+(item.site.year ? " منذ سنة "+item.site.year : "")+"." :
      item.name+" is a UNESCO World Heritage site"+(item.site.year ? ", inscribed in "+item.site.year : "")+".";
  }
  if (item.lookupDescription) return ar ? "ما لقيت شرح موثوق عن "+item.name+" حالياً." :
    "I couldn’t find a verified description of "+item.name+".";
  const detail = item.description || item.line;
  if (!detail || norm(detail.trim()) === norm(item.name)) return ar ? item.name + " — ما توفر وصف تفصيلي موثوق لهالمكان." : item.name + " — A detailed description is unavailable.";
  return detail.includes(item.name) ? detail : item.name + " — " + detail;
}

const localityCache = new TtlCache();
const localitySpelling = text => norm(text).replace(/[یى]/g,"ي").replace(/ک/g,"ك").replace(/ا/g,"");
async function translatedLocality(name, country, config, fetchImpl) {
  const key = name + "|" + (country || "");
  const cached = localityCache.get(key);
  if (cached) return cached;
  const headers = {"Content-Type":"application/json","X-Goog-Api-Key":config.googleKey};
  const options = {fetchImpl,timeout:4000};
  const r = await fetchJson("https://places.googleapis.com/v1/places:searchText", {
    method:"POST", headers:{...headers,"X-Goog-FieldMask":"places.id,places.displayName,places.addressComponents"},
    body:JSON.stringify({textQuery:name + (country ? ", " + englishRegions.of(country) : ""),
      languageCode:"ar",includedType:"locality",strictTypeFiltering:true,pageSize:3}),
  }, options);
  const candidates = (r.places || []).filter(p => p.id && p.displayName?.text &&
    localitySpelling(p.displayName.text) === localitySpelling(name) &&
    p.addressComponents?.some(c => c.types?.includes("country") && (!country || c.shortText === country)));
  if (candidates.length !== 1) return;
  const record = candidates[0];
  const english = await fetchJson("https://places.googleapis.com/v1/places/"+encodeURIComponent(record.id)+"?languageCode=en", {
    headers:{...headers,"X-Goog-FieldMask":"displayName"},
  }, options);
  if (!english.displayName?.text) return;
  const result = {english:english.displayName.text, native:record.displayName.text,
    country:record.addressComponents.find(c => c.types.includes("country")).shortText};
  localityCache.set(key,result,3600000);
  return result;
}

export async function answerChat(raw, config, fetchImpl = fetch, expansion) {
  const { message:original, language, history, context = {} } = input.parse(raw);
  const introduction = platformIntroduction(original);
  let message = original.replace(/(^|\s)وين\s+صارت(?=[\s؟?!.،,]|$)/g,"$1أين تقع");
  const list = !expansion && chatLists.get(context.listId);
  if (/^(?:طيب[،,]?\s+)?(?:هي\s+)?اين تقع(?:\s+هي)?[؟?.! ]*$/.test(norm(message))) {
    const focused = list?.items[context.focused]?.name;
    const subject = list ? focused || (list.items.length === 1 && list.items[0].name) :
      context.place || context.locality || demoCities.find(c => c.code === context.city)?.nameAr || countries.find(c => c.code === context.country)?.ar;
    if (!subject) return {answer:"أي مكان تقصد؟ اكتب اسمه حتى أعطيك موقعه.",context};
    message = "أين تقع " + subject;
  }
  const ar = /[\u0621-\u064a]/.test(message) || (!/[a-z]/i.test(message) && language === "ar");
  const i = ar ? 1 : 0, pick = (en, arabic) => ar ? arabic : en;
  const turn = norm(message);

  const detailRequest = /عن|اشرح|شرح|تفاصيل|معلومات|حدثني|خبرني|احكيلي|tell me about|tell me more about|details|describe|information about/.test(turn);
  const explicitCity = destinationInQuestion(turn);
  const sameCity = explicitCity && [context.locality,...(capitals.find(c => c.names.some(n => norm(n) === norm(context.locality || "")))?.names || [])].some(n => n && norm(n) === explicitCity);
  const more = (sameCity && /(?:اضافه|اضافيه|كمان|زياده|more)/.test(turn)) || /^(?:(?:طيب|ممكن|بدي|عطيني|اعطيني|ورجيني|في|هل في|هل يوجد|اريد|ممكن تعطيني|ممكن تورجيني|show me|give me|any|some|please|can i see)\s+)*(?:(?:اماكن|معالم|اقتراحات|places|sights|attractions|ثلاثه|ثلاث|3|٣)\s+)?(?:زياده|كمل|المزيد|مزيد|اكتر|اكثر|غيرهم|كمان|كمن|تانيه|اخري|اضافيه|more|others|next)(?:\s+(?:من|الاماكن|المعالم|اماكن|معالم|منها|اقتراحات|تانيه|سياحيه|places|sights|attractions|please))*[؟?!. ]*$/.test(turn);
  const detailName = turn.replace(/^.*?(?:معلومات\s+عن|(?:احكي|احك|اشرح)\s*(?:لي)?\s+عن|حدثني عن|خبرني عن|اشرح لي|tell me (?:more )?about|information about|details (?:on|about))\s+/,"").replace(/[؟?.!]+$/,"").trim();
  // Resolve an ordinal against the last displayed page before treating any words as a destination.
  const position = turn.match(/(?:^|\s)(?:ال)?(اول[يى]?|ثان[يى][هة]?|تان[يى][هة]?|ثالث[هة]?|تالت[هة]?|first|second|third)(?=\s|[؟?.!,،]|$)/i)?.[1];
  const lastListed = /(?:^|\s)(?:الاخير[ه]?|(?:اخر|اخراني) (?:مكان|معلم|واحد[ه]?|اقتراح)|last (?:one|place|sight|item|attraction)|the last)(?=\s|[؟?.!,،]|$)/i.test(turn);
  const digit = turn.match(/(?:رقم|number|#)\s*([123١٢٣])/i)?.[1];
  const index = digit ? ["1١","2٢","3٣"].findIndex(group => group.includes(digit)) :
    position ? (/^(?:اول|first)/.test(position) ? 0 : /^(?:ثان|تان|second)/.test(position) ? 1 : 2) : -1;
  if (detailRequest && (index >= 0 || lastListed) && !list)
    return {answer:pick("Which place do you mean? Please send its name.", "شو اسم المعلم اللي بدّك تعرف عنه؟"),context};
  if (list) {
    const start = context.offset || 0;
    const end = context.pageEnd ?? Math.min(start+3,list.items.length);
    const shown = list.items.slice(0,end);
    const partial = detailRequest && detailName.length >= 3 ? shown.filter(item =>
      [item.name,...(item.aliases || [])].some(n => (" "+norm(n)+" ").includes(" "+detailName+" "))) : [];
    const nameMatch = (partial.length === 1 ? partial[0] : undefined) || shown.find(item => [item.name,...(item.aliases || [])].some(n => turn.includes(norm(n))));
    const currentPage = list.items.slice(start,end);
    const item = lastListed ? currentPage.at(-1) : index >= 0 ? currentPage[index] : nameMatch ||
      (/عنه|عنها|about it/.test(turn) && (list.items[context.focused] || (shown.length === 1 && shown[0])));
    if (item && (detailRequest || lastListed || index >= 0 || turn.trim() === norm(item.name)) && !live.test(turn)) {
      const article = !item.site && await searchPlaceArticle(item,context,ar,fetchImpl);
      return {...(article || {answer:await describeItem(item,ar,fetchImpl),link:item.link || list.link}),context:{...context,focused:list.items.indexOf(item)}};
    }
    if (detailRequest && !item && index >= 0) return {answer:pick("Which place in the list do you mean?", "أي معلم من القائمة تقصد؟"),context};
    if (detailRequest && !item && /عن المكان[؟?.! ]*$|عنه[؟?.! ]*$|عنها[؟?.! ]*$|about it[?.! ]*$/.test(turn))
      return {answer:pick("Which place do you mean? Give its name or number.", "أي مكان تقصد؟ اكتب اسمه أو رقمه بالقائمة."),context};
    if (more) {
      if (end < list.items.length) return pageReply(list,end,context,ar);
      if (list.loadMore) {
        try {
          list.loading ??= list.loadMore(list).finally(() => { list.loading = undefined; });
          await list.loading;
        } catch {
          return {answer:pick("The search is temporarily unavailable. Try asking for more again.", "تعذّر البحث عن أماكن إضافية حالياً. جرّب «عطيني كمان» مرة تانية."),context};
        }
        if (end < list.items.length) return pageReply(list,end,context,ar);
      }
      if (list.expand) {
        list.loading ??= answerChat({message:list.expand,language,context:{...context,listId:undefined,pendingPlaces:undefined,place:undefined}},config,fetchImpl,list)
          .finally(() => { list.loading = undefined; });
        const extra = await list.loading;
        return extra.context?.listId ? extra : {...extra,context};
      }
      return {answer:pick("You’ve seen all the verified matches in this list.", "هاي كل الأماكن الموثّقة اللي لقيتها لهالقائمة."),context};
    }
  }

  if (introduction) return introduction;
  if (detailRequest && detailName !== turn && !live.test(turn)) {
    const codes = context.country ? [context.country] : Object.keys(countryHeritage);
    const exact = codes.flatMap(code => (countryHeritage[code] || []).filter(s => [s.en,s.ar].some(n => n && norm(n) === detailName)).map(site => ({code,site})));
    if (exact.length === 1) {
      const {code,site} = exact[0];
      const item = heritageEntries(code,ar).find(p => p.site.id === site.id);
      return {answer:await describeItem(item,ar,fetchImpl),link:item.link,context:{country:code}};
    }
  }
  const words = " " + turn.replace(/[^\p{L}\p{N}]+/gu, " ").trim() + " ";
  const mentionedCity = demoCities.find(c => cityNames(c).some(n => ["", "ب", "ل"].some(prefix => words.includes(" " + prefix + norm(n) + " "))));
  const namedCountry = countryNames.find(({ name }) => words.includes(" " + name + " ") ||
    words.includes(" ب" + name + " ") || words.includes(" ل" + name + " "))?.country;
  const namedDetail = detailRequest && detailName !== turn.replace(/[؟?.!]+$/,"").trim() && !live.test(turn) &&
    !faqTopics.some(re => re.test(turn)) && !topics.some(([,re]) => re.test(turn)) &&
    !/اماكن|معالم سياحيه|مطاعم|فنادق|عاصم|places to|attractions in/.test(detailName);
  if (namedDetail) {
    const parts = detailName.split(/\s+(?:في|in)\s+/i);
    const subjectName = parts[0].trim();
    const scope = parts[1] ? {locality:parts[1].trim()} : {};
    const article = await searchPlaceArticle({name:subjectName},scope,ar,fetchImpl);
    if (article) return {...article,context:{...scope,place:subjectName.slice(0,160),country:namedCountry?.code,city:mentionedCity?.code}};
  }
  // Answer explicit factual questions before interpreting a short reply as a city selection.
  const capitalQuestion = /(?:عاصم[ته]|عواصم|\bcapitals?\b)/.test(turn) &&
    !/مطاعم|معالم|فنادق|اماكن|مقاهي|attractions?|restaurants?|hotels?|places to/.test(turn);
  if (capitalQuestion) {
    const code = namedCountry?.code || mentionedCity?.countryCode || context.country || demoCities.find(c => c.code === context.city)?.countryCode;
    const subject = countries.find(c => c.code === code);
    if (!subject) return {answer:pick("Which country's capital would you like to know?", "عن عاصمة أي دولة عم تسأل؟"),context:{pendingCapital:true}};
    return capitalReply(subject, ar);
  }
  if (context.pendingCapital && namedCountry && namedCountry.aliases.some(n => norm(n) === words.trim()))
    return capitalReply(namedCountry, ar);
  const capital = capitals.find(c => c.names.some(n => words.includes(" " + norm(n) + " ")));
  const namedCity = namedCountry && /دوله|بلد|سلطنه|country of/.test(turn) ? undefined : mentionedCity;
  const rawTarget = destinationInQuestion(turn);
  const countryOnly = namedCountry && rawTarget && namedCountry.aliases.some(alias =>
    norm(alias) === rawTarget.replace(/^(?:(?:دوله|بلد|the country of|country of)\s+)+/, ""));
  const target = countryOnly || (rawTarget && /^(?:هالدوله|هالبلد|هذا البلد|هذه الدوله|هاي الدوله|that country|this country|.*(?:سياحيه|معالم|مطاعم|متاحف|اماكن|مناطق)(?:\s+(?:فيها|هناك|عندهم))?)$/.test(rawTarget))
    ? undefined : rawTarget;
  const cityPrompt = /which city should i check|بأي مدينة بدّك أتحقق/;
  const pending = context.pendingPlaces || (history.at(-1)?.role === "assistant" &&
    cityPrompt.test(history.at(-1).text.toLowerCase()) && history.at(-2)?.role === "user" ? history.at(-2).text : undefined);
  const shortName = message.trim().replace(/^(?:i mean|i meant|اقصد|أقصد|قصدي|the city of|مدينة)\s+/i,"").replace(/[.!؟?]+$/,"").trim();
  const isCityReply = pending && !locationSubject(message) && /^[\p{L}][\p{L}\p{M} ’'-]{0,79}$/u.test(shortName) &&
    shortName.split(/\s+/).length <= 5 && !/^(?:how|what|where|why|tell|show|can|is|any|كيف|ماذا|هل|وين|شو|بدي|اريد|عطيني)\s/i.test(turn) &&
    !/اماكن|معالم|مطاعم|متاحف|سياحي|\b(?:places|sights|museums|restaurants)\b/.test(turn) &&
    !faqTopics.some(re => re.test(turn)) && !topics.some(([,re]) => re.test(turn)) && !live.test(turn);
  const question = isCityReply ? pending : message;
  const q = norm(question);
  const switching = Boolean(namedCity || namedCountry || capital || target || isCityReply);
  const country = namedCountry || ((!switching || isCityReply) && countries.find(c => c.code === context.country));
  const city = namedCity || (country || switching ? undefined : demoCities.find(c => c.code === context.city));
  const guide = city && guideContent(city), highlights = city && cityHighlights[city.code];
  const landmark = highlights?.landmarks.find(p => p.name.some(n => q.includes(norm(n))));
  const place = landmark?.name[i] || capital?.names[i] || (!city && target && !namedCountry?.aliases.some(n => norm(n) === target) && target) || (!switching && context.place) || undefined;
  const extractedLocality = target && !namedCountry?.aliases.some(n => norm(n) === target) ? target.split(/[,،]/)[0].trim() : undefined;
  let locality = city?.name || capital?.names[i] || (isCityReply && !namedCountry && shortName) || extractedLocality || (!switching && context.locality) || undefined;
  const next = { locality, city: city?.code, country: city ? undefined : (capital?.country || country?.code), place };
  const reply = (answer, link, ctx = next) => ({ answer, link, context: ctx });
  const guideLink = guide && { href: "/guides/" + guide.slug, label: pick("City guide", "دليل المدينة") };
  const clarify = () => reply(pick("Which place and city would you like to know about? You can also ask how to use the planner.", "عن أي مكان وبأي مدينة حابب تسأل؟ فيك كمان تسأل كيف تستخدم مخطّط الرحلات."));
  const askCity = () => reply(pick("Which city should I check for these places?", "بأي مدينة بدّك أتحقق من هالأماكن؟"), undefined,
    {country: country?.code, pendingPlaces: question});
  if (namedCity && namedCountry && namedCity.countryCode !== namedCountry.code)
    return reply(pick("Could you clarify the city and country you mean?", "ممكن تحدّد اسم المدينة والدولة المقصودة؟"), undefined, {});
  const subject = locationSubject(question);
  const knownLocation = subject && madinahLocations.find(p => p.names.some(n => norm(n) === norm(subject)));
  if (knownLocation && (!namedCity || namedCity.code === "MED") && (!namedCountry || namedCountry.code === "SA") &&
      (!target || cityNames(demoCities.find(c => c.code === "MED")).some(n => norm(n) === target))) {
    const name = knownLocation.name;
    return reply(knownLocation.answer[i], {href:"https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(name+" المدينة المنورة"),label:"Google Maps"},
      {city:"MED",country:"SA",locality:"Madinah",place:name});
  }
  const membership = message.match(/^(?:is|هل)\s+(.+?)\s+(?:(?:located|actually|موجود|موجودة|يقع|تقع)\s+)?(?:in|في)\s+.+/i)?.[1]?.trim();
  const faq = faqTopics.findIndex(re => re.test(q));
  if (faq >= 0) return reply(platformHelp[faq][2 + i], { href: "/dashboard", label: pick("Dashboard", "لوحة التحكم") }, {});
  if (/^(hi|hello|مرحبا|اهلا)[ !؟?.]*$/.test(q)) return clarify();
  const requestsPlaces = /سياحي|سياحه|المزارات|مزارات|الوجهات|وجهات|نزور|تنصحني|شو زور|وين اروح|things to do|things to see|touris[mt]|attractions?|landmarks?|recommend|sightseeing|places?|visit|what.*see|restaurants?|caf[eé]s?|museums?|اماكن|معالم|مطاعم|مقاهي|متاحف|اقترح|وين (?:اروح|روح)|شوف|ازور/.test(q);
  const categorySearch = /restaurant|caf[eé]|museum|hotel|park|beach|shop|مطعم|مطاعم|مقهى|مقاهي|متحف|متاحف|حدائق|شواطئ|تسوق/.test(q);
  const topic = topics.find(([, re]) => re.test(q));
  const izmir = locality && ["ازمير","izmir"].includes(norm(locality));
  const bursa = locality && ["بورصه","بورسا","bursa"].includes(norm(locality));
  if (!expansion && bursa && requestsPlaces && !subject && !membership && !categorySearch && !topic && !live.test(q)) {
    const sites = [
      ["Bursa Grand Mosque","جامع بورصة الكبير","A historic mosque in the old market district, known for its twenty domes and interior calligraphy.","جامع تاريخي في منطقة الأسواق القديمة. بتتميّز قاعة الصلاة بقبابها العشرين ولوحات الخط العربي."],
      ["Koza Han","خان الحرير","A former silk trading inn with a courtyard and shops in the historic bazaar.","خان كان يستقبل تجّار الحرير. بتقدر تتجوّل حول فنائه وتشوف محلات الحرير ضمن السوق التاريخي."],
      ["Green Tomb","الضريح الأخضر","The mausoleum of Sultan Mehmed I, known for its turquoise tiles.","ضريح السلطان محمد الأول، معروف ببلاط الفيروز والزخارف الخزفية."],
      ["Green Mosque","الجامع الأخضر","An Ottoman mosque near the Green Tomb with richly tiled interiors.","جامع عثماني قرب الضريح الأخضر، يشتهر بالبلاط الملوّن في قاعاته."],
      ["Tophane Clock Tower","برج الساعة في طوب خانة","The tower stands on a hill with views over central Bursa.","برج ساعة على مرتفع بيطلّ على وسط بورصة. من محيطه بتقدر تشوف أحياء المدينة."],
      ["Irgandı Bridge","جسر إرغاندي","A bridge lined with shops joining the two banks of the Gökdere stream.","جسر فوق مجرى غوك دَره تصطفّ على جانبيه محلات صغيرة، فيجمع بين المعبر والسوق."],
    ].map(p => ({name:p[i],aliases:p.slice(0,2),description:p[2+i]}));
    return startList(sites,{...next,country:"TR"},ar,undefined,config.googleKey ? "tourist attractions in Bursa" : undefined);
  }
  if (!expansion && izmir && requestsPlaces && !categorySearch && !topic && !live.test(q)) {
    const sites = [
      ["İzmir Clock Tower","برج الساعة في إزمير","A clock tower built in 1901 in Konak Square, close to the waterfront.","برج ساعة بُني سنة 1901 في ساحة كوناك قرب الواجهة البحرية. بتقدر تشوف تفاصيله المعمارية وتتابع مشياً نحو السوق."],
      ["Kemeraltı Bazaar","سوق كمرالتي","A historic market district with lanes lined with shops, workshops and cafés.","حيّ سوق تاريخي بأزقة متفرعة فيها محلات وورش ومقاهٍ."],
      ["Agora of Smyrna","أغورا سميرنا","The remains of the ancient civic market, with columns and vaulted passages.","بقايا الساحة التجارية للمدينة القديمة، فيها أعمدة وممرات معقودة."],
      ["Kordon","كورنيش كوردون","A promenade along İzmir Bay with lawns and sea views.","ممشى على خليج إزمير فيه مساحات خضراء وإطلالات بحرية."],
      ["Historical Elevator","المصعد التاريخي","A public elevator connecting streets at different elevations, with views across the bay.","مصعد يربط شارعين على ارتفاعين مختلفين، ومن الأعلى بتشوف الخليج."],
      ["Kadifekale","قلعة كاديفيكالي","Hilltop fortifications overlooking the city and its bay.","بقايا تحصينات فوق تلة تطلّ على المدينة وخليجها."],
    ].map(p => ({name:p[i],aliases:p.slice(0,2),description:p[2+i]}));
    return startList(sites,{...next,country:"TR"},ar,undefined,config.googleKey ? "tourist attractions in Izmir" : undefined);
  }
  const ankara = place && ["ankara", "انقره"].includes(norm(place));
  if (!expansion && ankara && !categorySearch && !topic && !live.test(q) &&
      (correction.test(q) || words.trim() === norm(place) || /سياح|معالم|اماكن|زور|شوف|sights?|attractions?|visit|places|see/.test(q))) {
    const sites = [
      ["Anıtkabir","ضريح أتاتورك","The mausoleum of Mustafa Kemal Atatürk in Ankara.","ضريح مصطفى كمال أتاتورك في أنقرة."],
      ["Ankara Ethnography Museum","متحف الإثنوغرافيا في أنقرة","Its collections explore traditional clothing, crafts and everyday life in Anatolia.","بتتعرّف فيه على الحياة اليومية في الأناضول من خلال الأزياء التقليدية والحِرف والأدوات المنزلية."],
      ["Ankara Castle","قلعة أنقرة","A historic hilltop fortress overlooking the old city.","قلعة تاريخية على تلة تطلّ على أحياء أنقرة القديمة."],
      ["Museum of Anatolian Civilizations","متحف حضارات الأناضول","An archaeology museum near the castle displaying finds from ancient Anatolia.","متحف آثار قرب القلعة يعرض قطعاً من حضارات الأناضول القديمة."],
    ].map(p => ({name:p[i],aliases:p.slice(0,2),description:p[2+i]}));
    sites.push(
      {name:pick("Hacı Bayram Mosque","مسجد حاجي بيرم"),description:pick("A historic mosque in the Ulus district beside the remains of the Temple of Augustus.","مسجد تاريخي في حي أولوس بجوار بقايا معبد أغسطس. الزيارة بتجمع بين معلمين من فترتين مختلفتين.")},
      {name:pick("Kuğulu Park","حديقة البجع"),description:pick("A city park in Kavaklıdere known for the swans on its pond.","حديقة في حي كافاكلي دَره تشتهر ببركتها والبجع، وفيها ممرات للمشي.")}
    );
    return startList(sites,next,ar,undefined,pick("tourist attractions in Ankara","أماكن سياحية في أنقرة"));
  }
  const countrySearch = country && !locality && !place && requestsPlaces && !topic;
  if (!expansion && country && !locality && !place) {
    if (!requestsPlaces && /where (?:is|in the world|.*located)|which continent|اين (?:تقع|توجد)|وين(?:ها| تقع| موجوده| موقع)?(?:\s|$)|اي قار[هة]|موقعها/.test(q)) {
      if (country.code === "ID") return reply(indonesia.overview[i]);
      if (country.code === "ES") return reply(pick(
        "Spain is in southwestern Europe, on the Iberian Peninsula alongside Portugal.",
        "تقع إسبانيا في جنوب غرب أوروبا، وتشارك البرتغال شبه الجزيرة الإيبيرية."
      ));
      const region = Object.keys(subregions).find(code => subregions[code].split(" ").includes(country.code));
      if (region) return reply(pick(country.en + " is in " + englishRegions.of(region) + ".", "تقع " + country.ar + " في " + arabicRegions.of(region) + "."));
    }
    if (country.code === "ES" && countrySearch && !categorySearch) {
      const items = [
        ["Sagrada Família","ساغرادا فاميليا","Barcelona · A basilica designed by Antoni Gaudí.","برشلونة · كنيسة من أشهر أعمال المعماري أنطوني غاودي."],
        ["Alhambra","قصر الحمراء","Granada · A palace and fortress complex with courtyards and gardens.","غرناطة · مجمّع قصور وحصون يضم أفنية وحدائق تاريخية."],
        ["Prado Museum","متحف البرادو","Madrid · Its collection includes works by Goya and Velázquez.","مدريد · يضم المتحف أعمالاً لغويا وفيلاسكيز."],
      ].map(p => ({name:p[i],aliases:p.slice(0,2),line:p[i]+" — "+p[2+i],description:p[2+i]}));
      return startList([...items,...heritageEntries(country.code,ar).filter(p=> !/alhambra|gaudí/i.test(p.site.en))],{...next,pendingPlaces:question},ar,undefined,config.googleKey ? question : undefined);
    }
    const overview = generalQuestion.test(q) || country.aliases.some(n => norm(n) === words.trim()) ||
      /^(?:tell me more|احكيلي اكتر|احكيلي اكثر)[؟?.! ]*$/.test(q);
    const languageQuestion = /language|speak|لغه|لغت|يحكو/.test(q);
    if (country.code === "ID") {
      if (topic?.[0] === "money") return reply(indonesia.money[i]);
      if (languageQuestion) return reply(indonesia.language[i]);
      const attractions = /اماكن|الاماكن|معالم|وجهات|وين (?:اروح|روح|ازور)|شو (?:زور|ازور|شوف)|places? to (?:visit|see)|tourist (?:spots?|places?|attractions?)|sightseeing|landmarks?|what to (?:see|visit)|where (?:should i|to) (?:go|visit)/;
      if (attractions.test(q) && !topic && !live.test(q)) {
        const items = indonesia.attractions[i].split("\n• ").slice(1).map(line=>({name:line.split(/[,،—]/)[0].trim(),line,description:line}));
        return startList([...items,...heritageEntries("ID",ar).filter(p=>!/borobudur|komodo/i.test(p.site.en))],next,ar,undefined,config.googleKey ? question : undefined);
      }
      if (/where is|where.*located|وين (?:تقع|موقع)|اين تقع/.test(q) && !place) return reply(indonesia.overview[i]);
      if (overview && !topic && !live.test(q)) return reply(indonesia.overview[i]);
    }
    if (countrySearch && !categorySearch) {
      const cities = demoCities.filter(c => c.countryCode === country.code);
      if (cities.length) {
        const groups = cities.map(c => cityHighlights[c.code].landmarks.map(p => ({
          name:p.name[i],aliases:p.name,line:(ar ? c.nameAr : c.name)+" — "+p.name[i],description:p.description[i],
        })));
        const items = groups[0].flatMap((_,j) => groups.flatMap(g => g[j] ? [g[j]] : []));
        return startList([...items,...heritageEntries(country.code,ar)],{...next,pendingPlaces:question},ar,undefined,config.googleKey ? question : undefined);
      }
    }
    // Official UNESCO World Heritage names, indexed by the listing's ISO country code.
    const sites = countryHeritage[country.code];
    if (countrySearch && !categorySearch && sites?.length) {
      return startList(heritageEntries(country.code,ar),{...next,pendingPlaces:question},ar,undefined,config.googleKey ? question : undefined);
    }
    if (overview && !countrySearch && !topic && !languageQuestion && !live.test(q)) {
      const title = ar ? country.ar : country.en;
      const page = "https://" + (ar ? "ar" : "en") + ".wikipedia.org";
      try {
        const article = await fetchJson(page + "/api/rest_v1/page/summary/" + encodeURIComponent(title),
          { headers: { "User-Agent": "GilgamishSmart/1.0 (travel guide)" } }, { fetchImpl, timeout: 3500 });
        if (article.type === "standard" && article.extract)
          return reply(article.extract, { href: page + "/wiki/" + encodeURIComponent(title), label: pick("Wikipedia", "ويكيبيديا") });
      } catch { /* Use the offline geographic reference below. */ }
      const region = Object.keys(subregions).find(code => subregions[code].split(" ").includes(country.code));
      if (region) return reply(pick(country.en + " is in " + englishRegions.of(region) + ".", "تقع " + country.ar + " في " + arabicRegions.of(region) + "."));
    }
  }
  const section = guide?.sections.find(s => s.key === topic?.[0]);
  if (section && !live.test(q)) return reply(section.body[i], guideLink);
  if (landmark && !membership && !live.test(q)) return reply(landmark.description[i], guideLink);
  if (!expansion && city && !membership && !categorySearch && !live.test(q) && (requestsPlaces || browse.test(q) || cityNames(city).some(n => norm(n) === q))) {
    if (requestsPlaces) return startList(highlights.landmarks.map(p => ({name:p.name[i],aliases:p.name,description:p.description[i],line:p.name[i]+" — "+p.description[i]})),next,ar,guideLink,pick("tourist attractions in "+city.name,"أماكن سياحية في "+city.nameAr));
    return reply(highlights.overview[i] + "\n" + highlights.landmarks.map(p => p.name[i]).join(pick(", ", "، ")), guideLink);
  }
  let lookup = subject || membership || (countrySearch ? question : undefined);
  if (live.test(q) && place && !namedCity && /^(is it|when does it|where is it|what are its|هل هو|هل هي|وين موقعه|مفتوح|فاتح|شو دوامه)/.test(q))
    lookup = [place, city?.name].filter(Boolean).join(", ");
  else if (live.test(q) && landmark) lookup = landmark.name[i] + ", " + city.name;
  if (!lookup && !place && /^(is it|هل هو|هل هي)/.test(q) && live.test(q)) return clarify();
  if (!lookup && live.test(q)) lookup = [message, place, city?.name].filter(Boolean).join(", ");
  if (!lookup) {

    if (!requestsPlaces || !locality) {
      try {
        const previous = switching ? [] : history.slice(-2).map(turn => ({role:turn.role, content:turn.text.slice(0,450)}));
        const intent = await interpretQuestion(config, question, ar ? "Arabic" : "English", previous, locality || country?.en, fetchImpl);
        if (intent.city && q.includes(norm(intent.city))) {
          locality = intent.city;
          next.locality = locality;
        }
        if (intent.kind === "help" && platformHelp[intent.faq])
          return reply(platformHelp[intent.faq][2+i], {href:"/dashboard", label:pick("Dashboard","لوحة التحكم")}, {});
        if (intent.kind === "background" && !requestsPlaces) {
          if (highlights) return reply(highlights.overview[i], guideLink);
          const subject = locality || (country && (ar ? country.ar : country.en));
          if (subject) {
            const page = "https://" + (ar ? "ar" : "en") + ".wikipedia.org";
            const article = await fetchJson(page + "/api/rest_v1/page/summary/" + encodeURIComponent(subject), {}, {fetchImpl, timeout:3500});
            if (article.type === "standard" && article.extract && norm(article.title || "") === norm(subject))
              return reply(article.extract, {href:page + "/wiki/" + encodeURIComponent(subject),label:pick("City overview · Wikipedia","نبذة عن الوجهة · ويكيبيديا")});
          }
          return reply(pick("I don’t have a sourced answer to that question yet.", "ما عندي جواب موثّق لهالسؤال حالياً."));
        }
      } catch {
        if (!requestsPlaces) return reply(pick("I couldn’t verify an answer to that question.", "ما قدرت أتحقق من جواب لهالسؤال."));
      }
    }
    const plainSightseeing = /^(?:(?:طيب|بدي|عطيني|اعطيني|اريد|ممكن|لو سمحت|اهم|افضل|اشهر)\s+)*(?:ال)?(?:اماكن|معالم|مناطق)(?:\s+(?:ال)?سياح(?:يه|ه))?\s+(?:ب|في\s+)/.test(q);
    lookup = (plainSightseeing || (!categorySearch && /(?:اماكن|معالم|مناطق) سياحيه (?:فيها|هناك)[ ؟?.!]*$/.test(q))) ? "معالم سياحية" : question;
  }
  if (!locality && !countrySearch && !subject) return askCity();
  const scopeName = locality || (country ? (ar ? country.ar : country.en) : "");

  if (!config.googleKey) return reply(pick("Live place details are unavailable right now.", "تفاصيل المكان المباشرة غير متاحة حالياً."), guideLink, countrySearch ? {...next,pendingPlaces:question} : next);
  try {
    let requiredCountry = city?.countryCode || next.country;
    const cityAliases = [locality,...(city ? cityNames(city) : []),...(capital?.names || [])].filter(Boolean).map(norm);
    const search = (textQuery,pageToken) => fetchJson("https://places.googleapis.com/v1/places:searchText", {
      method: "POST", headers: { "Content-Type": "application/json", "X-Goog-Api-Key": config.googleKey,
        "X-Goog-FieldMask": "nextPageToken,places.id,places.primaryTypeDisplayName,places.addressComponents,places.businessStatus,places.displayName,places.formattedAddress,places.googleMapsUri,places.currentOpeningHours,places.editorialSummary" },
      body: JSON.stringify({textQuery,pageToken, languageCode: ar ? "ar" : "en", pageSize: 20}),
    }, { fetchImpl, timeout: 6000 });
    const scopeLabel = [scopeName,locality && requiredCountry && englishRegions.of(requiredCountry)].filter(Boolean).join(", ");
    const initialQuery = [lookup, scopeLabel].filter(Boolean).join(", ");
    const queue = [];
    const rememberPage = (query,response) => {
      if (response.nextPageToken) queue.push({query,token:response.nextPageToken});
    };
    const initial = await search(initialQuery);
    rememberPage(initialQuery,initial);
    const candidates = initial.places || [];
    const matchesScope = p => {
      const parts = p.addressComponents || [];
      const belongs = (!locality && subject) || countrySearch || parts.some(c => c.types?.some(t => ["locality","postal_town"].includes(t)) &&
        [c.longText,c.shortText].some(name => name && cityAliases.includes(norm(name))));
      const wantedName = subject || membership;
      const sameName = !wantedName || norm(p.displayName?.text || "").replace(/^the /,"") === norm(wantedName).replace(/^the /,"");
      return sameName && p.displayName?.text && belongs && p.businessStatus !== "CLOSED_PERMANENTLY" &&
        (!requiredCountry || parts.some(c => c.types?.includes("country") && c.shortText === requiredCountry));
    };
    let matches = candidates.filter(matchesScope);
    if (locality && /[\u0621-\u064a]/.test(locality) && matches.length < 3) {
      try {
        const resolved = await translatedLocality(locality,requiredCountry,config,fetchImpl);
        if (resolved) {
          requiredCountry = resolved.country;
          next.country = requiredCountry;
          cityAliases.push(norm(resolved.native),norm(resolved.english));
          matches = candidates.filter(matchesScope);
          if (matches.length < 3 && lookup === "معالم سياحية") {
            const translatedQuery = "tourist attractions in "+resolved.english+", "+englishRegions.of(requiredCountry);
            const extra = await search(translatedQuery);
            rememberPage(translatedQuery,extra);
            const combined = [...candidates,...(extra.places || [])].filter(matchesScope);
            matches = [...new Map(combined.map(p => [p.id || p.formattedAddress || p.displayName.text,p])).values()];
          }
        }
      } catch { /* Keep the matches already verified from the original search. */ }
    }
    if (subject) {
      const addresses = [...new Map(matches.filter(p => p.formattedAddress).map(p => [p.formattedAddress,p])).values()];
      if (addresses.length === 1) {
        const p = addresses[0], parts = p.addressComponents || [];
        return reply(p.displayName.text + " — " + p.formattedAddress, {href:p.googleMapsUri,label:"Google Maps"}, {
          ...next, place:p.displayName.text.slice(0,160),locality:locality || parts.find(c => c.types?.includes("locality"))?.longText,
          country:requiredCountry || parts.find(c => c.types?.includes("country"))?.shortText,
        });
      }
      if (!locality) return reply(pick("Which city should I check for “"+subject+"”?", "بأي مدينة تقصد «"+subject+"»؟"),undefined,{country:requiredCountry,pendingPlaces:question});
      return reply(pick("I couldn’t confirm a unique address for "+subject+" in "+scopeName+".", "ما قدرت أحدّد عنوان واحد لـ«"+subject+"» ضمن "+scopeName+"."));
    }
    if (!expansion && !matches.length && countrySearch) return reply(pick("No verified matches for that search in " + country.en + ". Which city would you like to narrow it to?", "ما لقيت أماكن مطابقة ضمن " + country.ar + ". بأي مدينة بتحب نضيّق البحث؟"), undefined, {...next, pendingPlaces:question});
    if (!expansion && !matches.length) return reply(pick("I couldn’t verify a matching place in " + scopeName + ".", "ما قدرت أتحقق من مكان مطابق ضمن " + scopeName + "."));
    const p = matches[0];
    if (!live.test(q)) {
      const toItem = m => ({
        id:m.id,
        lookupDescription:!m.editorialSummary?.text, locality,
        name:m.displayName.text, line:[m.displayName.text,m.formattedAddress].filter(Boolean).join(" — "),
        description:[m.displayName.text,m.editorialSummary?.text || m.primaryTypeDisplayName?.text,m.formattedAddress].filter(Boolean).join("\n"),
        link:{href:m.googleMapsUri,label:"Google Maps"},
      });
      const seenTokens = new Set();
      if (!categorySearch && !membership && /tourist attractions|sightseeing|landmarks|places to visit|معالم سياحيه|اماكن سياحيه/.test(norm(lookup)))
        queue.push({query:"museums and historic landmarks in "+scopeLabel},{query:"parks and scenic viewpoints in "+scopeLabel});
      else if (!membership) queue.push({query:lookup+" in "+scopeLabel});
      const placeKey = name => norm(name).replace(/^(?:(?:ال)?منتزه|(?:ال)?متنزه|حديقه) (?:ال)?وطني[ه]?(?: في)?\s+|\s+(?:national park|national historic site)$/gu,"").trim();
      function appendNew(list, items) {
        const names = new Set(list.items.flatMap(it => [it.name,...(it.aliases || [])].map(placeKey)));
        const ids = new Set(list.items.map(it => it.id).filter(Boolean));
        for (const item of items) {
          if (names.has(placeKey(item.name)) || (item.id && ids.has(item.id))) continue;
          list.items.push(item);
          names.add(placeKey(item.name));
          ids.add(item.id);
        }
      }
      async function loadMore(list) {
        const before = list.items.length;
        while (queue.length && list.items.length-before < 3) {
          const {query,token} = queue[0];
          if (token && seenTokens.has(token)) { queue.shift(); continue; }
          const page = await search(query,token);
          queue.shift();
          if (token) seenTokens.add(token);
          rememberPage(query,page);
          appendNew(list,(page.places || []).filter(matchesScope).map(toItem));
        }
        if (!queue.length) list.loadMore = undefined;
      }
      const items = matches.map(toItem);
      if (expansion) {
        const offset = expansion.items.length;
        appendNew(expansion,items);
        expansion.expand = undefined;
        expansion.loadMore = queue.length ? loadMore : undefined;
        if (expansion.items.length === offset && expansion.loadMore) await loadMore(expansion);
        return expansion.items.length > offset ? pageReply(expansion,offset,context,ar) :
          {answer:pick("No further verified matches.", "ما لقيت أماكن موثّقة إضافية."),context:{...context,listId:expansion.id}};
      }
      const response = startList(items,{ ...next,pendingPlaces:countrySearch ? question : undefined,place: !countrySearch && matches.length === 1 ? p.displayName.text.slice(0,160) : undefined },ar);
      if (queue.length) chatLists.get(response.context.listId).loadMore = loadMore;
      return response;
    }
    const hours = p.currentOpeningHours;
    const lines = [p.displayName.text, p.formattedAddress];
    if (!live.test(q) && p.editorialSummary?.text) lines.push(p.editorialSummary.text);
    if (live.test(q)) {
      if (typeof hours?.openNow === "boolean") lines.push(hours.openNow ? pick("Open now", "مفتوح الآن") : pick("Closed now", "مغلق الآن"));
      if (hours?.weekdayDescriptions?.length) lines.push(...hours.weekdayDescriptions);
      else if (hours?.openNow == null) lines.push(pick("Opening hours are unavailable.", "ساعات العمل غير متاحة."));
    }
    return reply(lines.filter(Boolean).join("\n"), { href: p.googleMapsUri, label: "Google Maps" }, { ...next, place: p.displayName.text.slice(0,160) });
  } catch {
    if (countrySearch) return reply(pick("The places search for " + country.en + " is temporarily unavailable.", "البحث عن أماكن في " + country.ar + " غير متاح حالياً."), undefined, {...next,pendingPlaces:question});
    return reply(pick("Google Places could not be reached. Please try again.", "تعذّر الاتصال بخرائط Google. جرّب مرة تانية."), guideLink);
  }
}
