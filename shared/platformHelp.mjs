export const platformHelp = [
    [
      "How does the AI plan trips?",
      "كيف يخطّط الذكاء الاصطناعي الرحلات؟",
      "It combines your preferences and budget with provider results, then checks the daily schedule.",
      "يجمع تفضيلاتك وميزانيتك مع نتائج المزوّدين ثم يتحقّق من الجدول اليومي.",
    ],
    [
      "Can I edit a generated plan?",
      "هل يمكنني تعديل الخطة؟",
      "Yes. Edit activities, regenerate a day, or adjust your budget. Each change creates a new version and preserves the original.",
      "نعم. عدّل الأنشطة أو أعد إنشاء يوم أو غيّر الميزانية. ينشئ كل تعديل نسخة جديدة مع الاحتفاظ بالأصل.",
    ],
    [
      "Is Gilgamish Smart free?",
      "هل جلجامش سمارت مجاني؟",
      "This project has no payment system. Travel providers set their own prices; you book separately on their websites.",
      "لا يتضمن هذا المشروع نظام دفع. يحدّد مزوّدو السفر أسعارهم ويجري الحجز بصورة منفصلة على مواقعهم.",
    ],
    [
      "Do you support group trips?",
      "هل تدعمون رحلات المجموعات؟",
      "Up to nine seated travelers. Live hotel searches currently support adults in one room. Child and multi-room hotel pricing is available only in development fixtures.",
      "ندعم حتى تسعة مسافرين بمقاعد. البحث المباشر عن الفنادق يدعم البالغين في غرفة واحدة حالياً. بيانات الأطفال والغرف المتعددة متاحة في الوضع التجريبي فقط.",
    ],
  ];

export function platformIntroduction(message) {
  const q = message.normalize("NFKD").replace(/\p{M}|ـ/gu,"").toLowerCase()
    .replace(/ى/g,"ي").replace(/ة/g,"ه").replace(/(.)\1{2,}/gu,"$1").replace(/كي+ف/g,"كيف");
  const platform = /جلجامش|كلكامش|gilgamish|gilgamesh|الموقع(?! الجغرافي)|المنصه|this (?:site|website|platform)|the (?:site|website|platform)/.test(q);
  const ar = /[\u0621-\u064a]/.test(q);
  if (platform && /كيف.*(?:استعمل|استخدم|بستخدم|اشتغل|ابدا|بستعمل)|طريقه (?:استعمال|استخدام)|how (?:do i|can i|to) (?:use|get started)|how (?:does|do).*work/.test(q))
    return {answer:ar
      ? "لتخطّط رحلتك، اضغط «خطّط رحلتي» وسجّل الدخول. اختَر مدينة المغادرة والوجهة، وحدّد التواريخ وعدد المسافرين والميزانية. بعدها اختَر اهتماماتك وولّد الخطة. فيك تعدّل أنشطة كل يوم وتحفظ الرحلة. وإذا بس عندك سؤال عن مكان أو سعر طيران أو فندق، اسألني هون بالشات."
      : "Choose “Plan my trip” and sign in. Enter your departure city, destination, dates, travelers, and budget. Pick your interests and generate a plan. You can edit each day and save the trip. For a place, flight price, or hotel rate, ask me here in the chat.",
      link:{href:"/planner",label:ar?"خطّط رحلتي":"Plan my trip"},context:{}};
  if (platform && /هدف|غايه|فائده|فايده|ليش.*(?:تاسس|تعمل|معمول)|purpose|goal|what.*(?:for|aim)|why.*(?:exist|built)/.test(q))
    return {answer:ar
      ? "هدف جلجامش سمارت إنّه يسهّل عليك تخطيط السفر حسب وقتك وميزانيتك واهتماماتك. مثلاً، إذا عندك ثلاثة أيام بمدينة جديدة، بتقدر تكتشف معالمها، تقارن عروض الطيران والإقامة، وتجمع الأنشطة اللي بتناسبك ببرنامج يومي واحد."
      : "Gilgamish Smart helps you plan around your time, budget, and interests. For a three-day visit, for example, you can discover landmarks, compare flight and stay offers, and organize the activities you like into a daily itinerary.",context:{}};
  if (/مين (?:انتو|انتم|انت)(?=$|[\s؟?!.])|من انتم|من انتو|(?:اشرح|احكي|خبر)\s*لي عنكم|عرفني (?:عن|علي) (?:نفسكم|انفسكم|حالكم)|who are you|tell me about (?:yourself|yourselves)|introduce yourself/.test(q) ||
      (platform && /عرفني|اشرحلي عن|شو (?:هو|هي)|ما (?:هو|هي)|tell me about|what is/.test(q)))
    return {answer:ar
      ? "نحنا جلجامش سمارت، منصّة لتخطيط السفر بالعربي والإنجليزي. وأنا مساعدك داخل المنصّة: فيك تسألني عن وجهة أو معلم، تطلب أسعار طيران وفنادق، أو تسألني كيف تخطّط رحلتك خطوة بخطوة."
      : "We’re Gilgamish Smart, a travel-planning platform in Arabic and English. I’m the assistant on the site. You can ask me about a destination or landmark, check flight and hotel prices, or get help planning your trip.",context:{}};
  return null;
}
