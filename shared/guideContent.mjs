// Editorial content, reviewed against the linked sources. No live visa eligibility is inferred.
export const guideReviewedAt = "2026-10-26";
const p = (en, ar) => [en, ar];
const source = (en, ar, url) => ({ label: p(en, ar), url });
const advice = (title, body, sources) => ({ title, body, sources });
const saInfo = source("Visit Saudi", "روح السعودية", "https://www.visitsaudi.com/");
const frSafety = source("Paris tourist office · safety", "مكتب سياحة باريس · السلامة", "https://parisjetaime.com/eng/article/tips-for-enjoying-paris-while-staying-safe-a757");
const saVisa = source(
  "Saudi visa portal",
  "بوابة التأشيرة السعودية",
  "https://visa.visitsaudi.com/",
);
const saClimate = source(
  "Visit Saudi · climate",
  "روح السعودية · المناخ",
  "https://www.visitsaudi.com/en/stories/climate-and-seasons",
);
const saMoney = source(
  "Visit Saudi · payments",
  "روح السعودية · وسائل الدفع",
  "https://www.visitsaudi.com/en/understand/currencies-and-payments",
);
const nusuk = source("Nusuk", "نسك", "https://www.nusuk.sa/");
const saTerms = source(
  "Saudi visa · entry conditions",
  "التأشيرة السعودية · شروط الدخول",
  "https://visa.visitsaudi.com/Home/TermsConditions",
);
const sySafety = source("Syrian tourism ministry", "وزارة السياحة السورية", "https://mot.gov.sy/");
const syEntry = source("Syrian foreign ministry", "وزارة الخارجية السورية", "https://mofaex.gov.sy/");
const syClimate = source("Syrian Arab News Agency · weather", "وكالة سانا · الطقس", "https://sana.sy/");
const trVisa = source(
  "Türkiye e-Visa",
  "التأشيرة الإلكترونية التركية",
  "https://www.evisa.gov.tr/en/",
);
const trClimate = source(
  "GoTürkiye · Istanbul",
  "GoTürkiye · إسطنبول",
  "https://goturkiye.com/digitalnomads/discover-work-from-istanbul",
);
const trMoney = source(
  "GoTürkiye · practical information",
  "GoTürkiye · معلومات عملية",
  "https://goturkiye.com/camping/planning-your-trip",
);
const joVisa = source(
  "Jordan Ministry of Interior",
  "وزارة الداخلية الأردنية",
  "https://moi.gov.jo/EN/Pages/Visa_E_Applications",
);
const joInfo = source(
  "Jordan Tourism Board",
  "هيئة تنشيط السياحة الأردنية",
  "https://edutravel.visitjordan.com/en/page/66/General-Information",
);
const joMoney = source("Central Bank of Jordan", "البنك المركزي الأردني", "https://www.cbj.gov.jo/");
const aeVisa = source(
  "Visit Dubai · visas",
  "زوروا دبي · التأشيرات",
  "https://www.visitdubai.com/en/plan-your-trip/visa-information",
);
const aeInfo = source(
  "Visit Dubai · practical information",
  "زوروا دبي · معلومات عملية",
  "https://www.visitdubai.com/plan-your-trip/practical-information",
);
const aeClimate = source(
  "Visit Dubai · seasons",
  "زوروا دبي · مواسم الزيارة",
  "https://www.visitdubai.com/en/articles/how-to-save-money-on-your-dubai-holiday",
);
const egVisa = source(
  "Egypt e-Visa",
  "بوابة التأشيرة المصرية",
  "https://visa2egypt.gov.eg/",
);
const egInfo = source(
  "Experience Egypt · visitor information",
  "Experience Egypt · معلومات الزائر",
  "https://www.experienceegypt.eg/en/UsefulInfo",
);
const frVisa = source(
  "France-Visas",
  "France-Visas · التأشيرات الفرنسية",
  "https://france-visas.gouv.fr/en/",
);
const frSeason = source(
  "Paris tourist office · autumn",
  "مكتب سياحة باريس · الخريف",
  "https://parisjetaime.com/eng/article/what-to-do-in-autumn-in-paris-a1769",
);
const frMoney = source(
  "Paris tourist office · money",
  "مكتب سياحة باريس · المال والصرافة",
  "https://parisjetaime.com/eng/practical-paris/money/banks-and-currency-exchange",
);

const countries = {
  SY: {
    capital: p("Damascus", "دمشق"),
    currency: p("Syrian pound · SYP", "الليرة السورية · SYP"),
    language: p("Arabic", "العربية"),
    visa: advice(
      p("Check before booking", "تحقق قبل الحجز"),
      p(
        "Ask the Syrian diplomatic mission about the rules for your nationality, passport and purpose of travel. Do not assume an exemption or visa on arrival.",
        "راجع البعثة الدبلوماسية السورية بشأن جنسيتك وجوازك وغرض السفر. لا تفترض وجود إعفاء أو تأشيرة عند الوصول.",
      ),
      [syEntry],
    ),
    customs: advice(
      p("Modest dress and consideration", "اللباس المحتشم ومراعاة الآخرين"),
      p(
        "Respect dress requirements in places of worship. During Ramadan, check opening hours and be considerate of people who are fasting.",
        "راعِ اللباس المطلوب في دور العبادة. في رمضان، تحقق من مواعيد العمل وراعِ الصائمين والعادات المحلية.",
      ),
      [sySafety],
    ),
    safety: advice(
      p("Review the travel warning", "راجع تحذير السفر"),
      p(
        "Check current travel conditions and transport updates before departure.",
        "تحقق من ظروف السفر وتحديثات النقل قبل المغادرة.",
      ),
      [syEntry],
    ),
    money: advice(
      p("Plan for cash payments", "خطّط للدفع النقدي"),
      p(
        "Electronic payments and cash withdrawals can be limited. Confirm payment options before travel and use authorised exchange services; do not rely on an international card alone.",
        "الدفع الإلكتروني والسحب النقدي قد يكونان محدودين. تحقق من وسائل الدفع قبل السفر، واستخدم جهات صرافة مرخصة، ولا تعتمد على بطاقة دولية وحدها.",
      ),
      [sySafety],
    ),
  },
  TR: {
    capital: p("Ankara", "أنقرة"),
    currency: p("Turkish lira · TRY", "الليرة التركية · TRY"),
    language: p("Turkish", "التركية"),
    visa: advice(
      p("Check your passport's eligibility", "تحقق من أهلية جوازك"),
      p(
        "Visa rules depend on nationality and travel documents. Use the official e-Visa portal to check eligibility and any additional conditions, or contact the consulate.",
        "تختلف الشروط بحسب الجنسية ووثائق السفر. استخدم بوابة التأشيرة الرسمية للتحقق من الأهلية والشروط الإضافية، أو راجع القنصلية.",
      ),
      [trVisa],
    ),
    customs: advice(
      p("Respect mosque etiquette", "احترم آداب زيارة المساجد"),
      p(
        "Wear modest clothing at religious sites and follow staff instructions about shoes, photography and visiting during prayers.",
        "ارتدِ لباساً محتشماً في المواقع الدينية، واتبع تعليمات المكان بشأن الأحذية والتصوير والزيارة وقت الصلاة.",
      ),
      [trMoney],
    ),
    safety: advice(
      p("Stay alert in busy areas", "انتبه في الأماكن المزدحمة"),
      p(
        "Keep valuables secure in busy tourist areas and on public transport. Avoid demonstrations and review official travel advice before departure.",
        "احفظ مقتنياتك في الأماكن السياحية المزدحمة والمواصلات العامة. ابتعد عن التجمعات الاحتجاجية وراجع إرشادات السفر قبل الانطلاق.",
      ),
      [trMoney],
    ),
    money: advice(
      p("Check prices in local currency", "تحقق من الأسعار بالعملة المحلية"),
      p(
        "Confirm the price in Turkish lira before paying. Keep a small cash reserve, check card acceptance, and review any exchange or withdrawal fees with your bank.",
        "تأكد من السعر بالليرة التركية قبل الدفع. احتفظ بمبلغ نقدي صغير، وتحقق من قبول البطاقة ورسوم الصرف والسحب لدى مصرفك.",
      ),
      [trMoney],
    ),
  },
  SA: {
    capital: p("Riyadh", "الرياض"),
    currency: p("Saudi riyal · SAR", "الريال السعودي · SAR"),
    language: p("Arabic", "العربية"),
    visa: advice(
      p("Choose the right visa", "اختر التأشيرة المناسبة"),
      p(
        "Check eligibility on the Saudi visa portal. A tourist visa does not authorise Hajj; pilgrimage permits and seasonal entry rules need separate verification.",
        "تحقق من الأهلية عبر بوابة التأشيرة السعودية. التأشيرة السياحية لا تخوّل أداء الحج؛ راجع التصاريح والقيود الموسمية بشكل مستقل.",
      ),
      [saVisa, nusuk],
    ),
    customs: advice(
      p("Modest dress and local etiquette", "اللباس المحتشم وآداب المكان"),
      p(
        "Respect local dress and public-behaviour rules, especially at religious sites. Ask before photographing people and follow posted instructions.",
        "راعِ قواعد اللباس والسلوك العام، خصوصاً في المواقع الدينية. استأذن قبل تصوير الأشخاص والتزم بالتعليمات المعروضة.",
      ),
      [saInfo],
    ),
    safety: advice(
      p("Check conditions and plan for heat", "تابع المستجدات واستعد للحرارة"),
      p(
        "Review current official advice and local alerts. Plan outdoor visits around the heat and follow crowd-management instructions at busy sites.",
        "راجع إرشادات السفر والتنبيهات المحلية. راعِ الحرارة عند ترتيب الزيارات الخارجية واتبع تنظيم الحشود في الأماكن المزدحمة.",
      ),
      [saInfo, saClimate],
    ),
    money: advice(
      p("Check your payment options", "تحقق من وسائل الدفع"),
      p(
        "Budget in Saudi riyals. Check your card's acceptance and fees before travel, and keep some cash for small purchases.",
        "احسب ميزانيتك بالريال السعودي. تحقق من قبول بطاقتك ورسومها قبل السفر، واحتفظ ببعض النقد للمشتريات الصغيرة.",
      ),
      [saMoney],
    ),
  },
  JO: {
    capital: p("Amman", "عمّان"),
    currency: p("Jordanian dinar · JOD", "الدينار الأردني · JOD"),
    language: p("Arabic", "العربية"),
    visa: advice(
      p("Check nationality and entry point", "تحقق من الجنسية ومنفذ الدخول"),
      p(
        "Use the Jordanian Ministry of Interior's visa services to check requirements. Do not assume all passports or border crossings qualify for a visa on arrival.",
        "راجع خدمات التأشيرات لدى وزارة الداخلية الأردنية. لا تفترض أن كل الجوازات أو المعابر تتيح تأشيرة عند الوصول.",
      ),
      [joVisa],
    ),
    customs: advice(
      p(
        "Courtesy in markets and religious sites",
        "الاحترام في الأسواق ودور العبادة",
      ),
      p(
        "Dress considerately in traditional neighbourhoods and religious sites. Ask before photographing people and check local opening hours during Ramadan.",
        "راعِ اللباس المحتشم في الأحياء التقليدية ودور العبادة. استأذن قبل تصوير الأشخاص وتحقق من ساعات العمل في رمضان.",
      ),
      [joInfo],
    ),
    safety: advice(
      p(
        "Follow local and regional updates",
        "تابع المستجدات المحلية والإقليمية",
      ),
      p(
        "Review official advice before departure, avoid demonstrations and confirm airport and road conditions when regional disruptions occur.",
        "راجع الإرشادات الرسمية قبل السفر، وابتعد عن المظاهرات، وتحقق من وضع المطار والطرق عند حدوث اضطرابات إقليمية.",
      ),
      [joInfo],
    ),
    money: advice(
      p("Cards and a small cash reserve", "بطاقات مع احتياط نقدي"),
      p(
        "Larger shops and restaurants in Amman accept cards, but check first. Keep Jordanian dinars for small purchases and use authorised exchange services.",
        "تقبل متاجر ومطاعم كبيرة في عمّان البطاقات، لكن تحقق مسبقاً. احتفظ بدنانير أردنية للمشتريات الصغيرة واستخدم صرافة مرخصة.",
      ),
      [joMoney],
    ),
  },
  AE: {
    capital: p("Abu Dhabi", "أبوظبي"),
    currency: p("UAE dirham · AED", "الدرهم الإماراتي · AED"),
    language: p(
      "Arabic; English widely used",
      "العربية؛ والإنجليزية واسعة الاستخدام",
    ),
    visa: advice(
      p("Check the rule for your passport", "تحقق من شروط جوازك"),
      p(
        "Requirements vary by nationality and residence status. Check the official Dubai visa guide and confirm requirements with the relevant authority before booking.",
        "تختلف المتطلبات حسب الجنسية ووضع الإقامة. راجع دليل التأشيرات الرسمي لدبي وأكّد الشروط مع الجهة المختصة قبل الحجز.",
      ),
      [aeVisa],
    ),
    customs: advice(
      p("Dress for the setting", "اختر لباساً يناسب المكان"),
      p(
        "Keep beachwear for beaches and pools. Dress modestly in heritage areas and places of worship, and follow each mosque's visitor requirements.",
        "خصّص ملابس السباحة للشاطئ والمسبح. اختر لباساً محتشماً في المناطق التراثية ودور العبادة واتبع شروط زيارة كل مسجد.",
      ),
      [aeInfo],
    ),
    safety: advice(
      p("Keep up with official guidance", "تابع الإرشادات الرسمية"),
      p(
        "Check travel advisories and local alerts. For outdoor visits, consider the heat; choose licensed transport and keep your belongings secure in busy places.",
        "تابع إرشادات السفر والتنبيهات المحلية. راعِ الحرارة في الأنشطة الخارجية، واستخدم وسائل نقل مرخصة، وانتبه لمقتنياتك وسط الزحام.",
      ),
      [aeInfo],
    ),
    money: advice(
      p("Budget in dirhams", "احسب ميزانيتك بالدرهم"),
      p(
        "Check whether the displayed price includes taxes and service charges. Confirm your bank's payment fees and keep a small cash reserve.",
        "تحقق إن كان السعر يشمل الضرائب ورسوم الخدمة. راجع رسوم الدفع لدى مصرفك واحتفظ باحتياط نقدي صغير.",
      ),
      [aeInfo],
    ),
  },
  EG: {
    capital: p("Cairo", "القاهرة"),
    currency: p("Egyptian pound · EGP", "الجنيه المصري · EGP"),
    language: p("Arabic", "العربية"),
    visa: advice(
      p("Use the official visa channel", "استخدم قناة التأشيرة الرسمية"),
      p(
        "Check whether your nationality qualifies for an e-Visa or requires a consular application. Verify the entry point and permitted stay before travelling.",
        "تحقق إن كانت جنسيتك مؤهلة للتأشيرة الإلكترونية أو تحتاج طلباً قنصلياً. راجع منفذ الدخول ومدة الإقامة المسموحة قبل السفر.",
      ),
      [egVisa, egInfo],
    ),
    customs: advice(
      p("Respect religious sites", "احترم خصوصية المواقع الدينية"),
      p(
        "Cover arms and legs when required in mosques, churches and other religious sites. Ask before photographing people and follow the site's rules.",
        "غطِّ الذراعين والساقين عندما يُطلب ذلك في المساجد والكنائس ودور العبادة. استأذن قبل تصوير الأشخاص واتبع تعليمات الموقع.",
      ),
      [egInfo],
    ),
    safety: advice(
      p("Take care in traffic and crowds", "انتبه للمرور والازدحام"),
      p(
        "Check current travel advice, use licensed transport and allow extra time for Cairo traffic. Keep valuables secure in crowded visitor areas.",
        "راجع إرشادات السفر الحالية، واستخدم نقلاً مرخصاً، واترك وقتاً إضافياً لازدحام القاهرة. انتبه لمقتنياتك في المناطق السياحية المكتظة.",
      ),
      [egInfo],
    ),
    money: advice(
      p("Confirm the full price", "اتفق على السعر الكامل"),
      p(
        "Use Egyptian pounds and confirm prices and payment methods before a purchase or service. Check official ticket channels and keep receipts.",
        "استخدم الجنيه المصري وتحقق من السعر ووسيلة الدفع قبل الشراء أو طلب الخدمة. راجع قنوات التذاكر الرسمية واحتفظ بالإيصالات.",
      ),
      [egInfo],
    ),
  },
  FR: {
    capital: p("Paris", "باريس"),
    currency: p("Euro · EUR", "اليورو · EUR"),
    language: p("French", "الفرنسية"),
    visa: advice(
      p("Check with France-Visas", "تحقق عبر France-Visas"),
      p(
        "France is in the Schengen area. Use the official visa assistant with your nationality, residence and trip details to check whether a visa is needed and which documents apply.",
        "فرنسا ضمن منطقة شنغن. استخدم مساعد التأشيرة الرسمي مع جنسيتك وإقامتك وتفاصيل الرحلة لمعرفة الحاجة للتأشيرة والوثائق المطلوبة.",
      ),
      [frVisa],
    ),
    customs: advice(
      p("A greeting goes a long way", "ابدأ بتحية لطيفة"),
      p(
        "A simple bonjour is a courteous way to enter a shop. Respect queues, quiet spaces and the photography rules in museums and churches.",
        "تحية «بونجور» بداية لطيفة عند دخول المتاجر. احترم الطوابير وهدوء الأماكن وقواعد التصوير في المتاحف والكنائس.",
      ),
      [frSeason],
    ),
    safety: advice(
      p("Watch your belongings", "انتبه لمقتنياتك"),
      p(
        "Keep bags closed and valuables out of easy reach on the metro and at busy attractions. Avoid distractions and review official advice about demonstrations or disruptions.",
        "أغلق حقيبتك واحفظ مقتنياتك في المترو والمعالم المزدحمة. انتبه لمحاولات التشتيت وراجع التنبيهات الرسمية بشأن المظاهرات أو تعطّل الخدمات.",
      ),
      [frSafety],
    ),
    money: advice(
      p("Check prices and payment fees", "راجع الأسعار ورسوم الدفع"),
      p(
        "Budget in euros, check card acceptance and your bank's conversion fees, and keep small cash amounts for incidental purchases.",
        "احسب الميزانية باليورو، وتحقق من قبول البطاقة ورسوم التحويل لدى مصرفك، واحتفظ بمبالغ نقدية صغيرة للمشتريات العرضية.",
      ),
      [frMoney],
    ),
  },
};

const details = {
  DAM: {
    slug: "damascus",
    summary: p(
      "Old-city lanes, historic courtyards and souks with stories to tell.",
      "أزقة المدينة القديمة وبيوتها العريقة وأسواق تحمل حكايات التاريخ.",
    ),
    season: advice(
      p("Spring and autumn", "الربيع والخريف"),
      p(
        "March–May and October–November generally offer gentler temperatures than midsummer. This is a climate-based suggestion; review travel warnings first.",
        "مارس–مايو وأكتوبر–نوفمبر ألطف حرارةً عادةً من ذروة الصيف. هذا ترشيح مناخي؛ راجع تحذيرات السفر أولاً.",
      ),
      [syClimate],
    ),
    attention: advice(
      p("Photography and sensitive locations", "التصوير والأماكن الحساسة"),
      p(
        "Ask before photographing people. Avoid photography near military or security sites, and respect access restrictions and local instructions.",
        "استأذن قبل تصوير الأشخاص. تجنب التصوير قرب المواقع العسكرية والأمنية، واحترم المناطق المحظورة والتعليمات المحلية.",
      ),
      [sySafety],
    ),
    alert: p(
      "Check current travel conditions before departure.",
      "تحقق من ظروف السفر الحالية قبل المغادرة.",
    ),
  },
  IST: {
    slug: "istanbul",
    summary: p(
      "Bosphorus views, grand mosques and lively markets between two continents.",
      "إطلالات البوسفور والمساجد والأسواق النابضة بين قارّتين.",
    ),
    season: advice(
      p("Spring and autumn", "الربيع والخريف"),
      p(
        "Spring and autumn are usually pleasant for walking. Pack a light layer and check the forecast before a Bosphorus outing.",
        "الربيع والخريف مناسبان عادةً للمشي. احمل طبقة ملابس إضافية وراجع الطقس قبل جولة على البوسفور.",
      ),
      [trClimate],
    ),
    attention: advice(
      p("Transport and attraction tickets", "النقل وتذاكر المعالم"),
      p(
        "Use official transport and ticket channels. Confirm fares before a ride and check attraction opening hours, especially around religious holidays.",
        "استخدم قنوات النقل والتذاكر الرسمية. تحقق من الأجرة قبل الركوب ومن ساعات المعالم، خصوصاً خلال الأعياد الدينية.",
      ),
      [trMoney],
    ),
  },
  MED: {
    slug: "madinah",
    summary: p(
      "A spiritual journey through the Prophet's Mosque and the city's heritage.",
      "رحلة إيمانية بين المسجد النبوي ومعالم المدينة وتراثها.",
    ),
    season: advice(
      p("The cooler months", "الأشهر الأبرد"),
      p(
        "Winter is more comfortable for outdoor visits. Bring a layer for cool evenings and plan around prayer times and busy pilgrimage periods.",
        "الشتاء ألطف للزيارات الخارجية. احمل ملابس للمساء البارد وراعِ أوقات الصلاة ومواسم كثافة الزوار.",
      ),
      [saClimate],
    ),
    attention: advice(
      p("Rawdah appointments and access", "مواعيد الروضة وضوابط الدخول"),
      p(
        "Check Rawdah appointments through Nusuk. The Prophet's Mosque and its premises are reserved for Muslims; follow the current access instructions.",
        "راجع مواعيد زيارة الروضة عبر نسك. المسجد النبوي وساحاته مخصصة للمسلمين؛ اتبع تعليمات الدخول المحدثة.",
      ),
      [nusuk, saTerms],
    ),
  },
  QCA: {
    slug: "makkah",
    summary: p(
      "The Sacred Mosque at the heart of a journey of worship and reflection.",
      "المسجد الحرام في قلب رحلة للعبادة والسكينة.",
    ),
    season: advice(
      p(
        "Cooler weather, with permits checked",
        "طقس ألطف مع التحقق من التصاريح",
      ),
      p(
        "The cooler months ease outdoor movement. Hajj and Ramadan follow the lunar calendar; crowds, permits and seasonal access rules must be checked separately.",
        "الأشهر الأبرد تسهّل التنقل خارجاً. الحج ورمضان يتبعان التقويم الهجري؛ تحقق بشكل مستقل من الزحام والتصاريح وقيود الدخول الموسمية.",
      ),
      [saClimate, nusuk],
    ),
    attention: advice(
      p(
        "Pilgrimage rules and airport transfer",
        "ضوابط المناسك والنقل من المطار",
      ),
      p(
        "Check eligibility and pilgrimage permissions through official Saudi channels. The Sacred Mosque and its premises are reserved for Muslims. This demo routes flights via Jeddah; arrange the onward transfer to Makkah separately.",
        "تحقق من أهلية الدخول وتصاريح المناسك عبر الجهات السعودية الرسمية. المسجد الحرام وساحاته مخصصة للمسلمين. يستخدم الديمو جدة للطيران؛ رتّب النقل إلى مكة بشكل منفصل.",
      ),
      [saTerms, nusuk],
    ),
  },
  JED: {
    slug: "jeddah",
    summary: p(
      "Red Sea breezes and the coral-stone houses of historic Al-Balad.",
      "نسيم البحر الأحمر وبيوت البلد التاريخية ورواشينها.",
    ),
    season: advice(
      p("Autumn evenings and winter days", "أمسيات الخريف وأيام الشتاء"),
      p(
        "The cooler part of the year is easier for exploring Al-Balad and the waterfront. Coastal humidity can make summer feel particularly hot.",
        "الفترة الأبرد من السنة ألطف لاكتشاف البلد والواجهة البحرية. الرطوبة الساحلية قد تزيد الإحساس بحرارة الصيف.",
      ),
      [saClimate],
    ),
    attention: advice(
      p("Heritage areas and the sea", "المناطق التراثية والبحر"),
      p(
        "Follow access signs in historic buildings. For sea activities, use licensed operators and check conditions; allow extra time for travel towards Makkah during busy periods.",
        "اتبع إرشادات الدخول في المباني التاريخية. للأنشطة البحرية، اختر جهة مرخصة وتحقق من الظروف؛ واترك وقتاً إضافياً عند التوجه لمكة في المواسم المزدحمة.",
      ),
      [saInfo, nusuk],
    ),
  },
  RUH: {
    slug: "riyadh",
    summary: p(
      "Historic neighbourhoods, contemporary architecture and desert horizons.",
      "أحياء تاريخية وعمارة حديثة وآفاق صحراوية واسعة.",
    ),
    season: advice(
      p("Winter and early spring", "الشتاء وبداية الربيع"),
      p(
        "Cooler days suit city walks and outdoor visits. Desert evenings can be cold, while spring may bring dust or rain; check the forecast.",
        "الأيام الأبرد أنسب للمشي والزيارات الخارجية. قد تبرد أمسيات الصحراء ويأتي الربيع بالغبار أو المطر؛ راجع النشرة الجوية.",
      ),
      [saClimate],
    ),
    attention: advice(
      p("Distances and event bookings", "المسافات وحجوزات الفعاليات"),
      p(
        "Allow time between districts and check official event tickets and opening hours. Arrange desert outings with an experienced, licensed operator.",
        "اترك وقتاً للتنقل بين الأحياء وتحقق من التذاكر الرسمية ومواعيد الفعاليات. رتّب الرحلات الصحراوية مع جهة مرخصة وذات خبرة.",
      ),
      [saInfo],
    ),
  },
  AMM: {
    slug: "amman",
    summary: p(
      "Hillside neighbourhoods, the Citadel and the bustle of downtown.",
      "أحياء على التلال وجبل القلعة وحيوية وسط البلد.",
    ),
    season: advice(
      p("Spring and autumn", "الربيع والخريف"),
      p(
        "A climate-based choice for walking the city's hills. Evenings can be cool; check rain and temperature forecasts before your visit.",
        "خيار مناخي مناسب للمشي بين تلال المدينة. قد تبرد الأمسيات؛ راجع توقعات المطر والحرارة قبل الزيارة.",
      ),
      [joInfo],
    ),
    attention: advice(
      p("Hills, steps and walking routes", "التلال والأدراج ومسارات المشي"),
      p(
        "Amman's hills mean short distances can involve steep climbs. Wear comfortable shoes, allow breaks and confirm a fare or use a licensed transport service.",
        "تلال عمّان تجعل بعض المسافات القصيرة تتضمن صعوداً وأدراجاً. ارتدِ حذاءً مريحاً وخذ استراحات، وأكّد الأجرة أو استخدم خدمة نقل مرخصة.",
      ),
      [joInfo],
    ),
  },
  DXB: {
    slug: "dubai",
    summary: p(
      "Creekside heritage, bold skylines and life along the coast.",
      "تراث الخور وأفق الأبراج والحياة على الساحل.",
    ),
    season: advice(
      p("The cooler season", "الموسم الأبرد"),
      p(
        "October–March is the main season for comfortable outdoor visits. Summer is hotter; plan around indoor activities and check the daily forecast.",
        "أكتوبر–مارس موسم رئيسي للأنشطة الخارجية بطقس ألطف. الصيف أشد حرارة؛ نظّم يومك بين الأماكن الداخلية وراجع الطقس اليومي.",
      ),
      [aeClimate],
    ),
    attention: advice(
      p("Privacy and photography", "الخصوصية والتصوير"),
      p(
        "Respect privacy and ask before photographing people. Follow restrictions around government and security sites and check any drone permissions before use.",
        "احترم الخصوصية واستأذن قبل تصوير الأشخاص. التزم بقيود التصوير قرب المواقع الحكومية والأمنية، وتحقق من تصاريح الطائرات المسيّرة قبل استخدامها.",
      ),
      [aeInfo],
    ),
  },
  CAI: {
    slug: "cairo",
    summary: p(
      "Nile-side life, historic streets and gateways to ancient wonders.",
      "حياة على ضفاف النيل وشوارع تاريخية وبوابات إلى عجائب الماضي.",
    ),
    season: advice(
      p("The cooler months", "الأشهر الأبرد"),
      p(
        "Late autumn through early spring is generally more comfortable for long outdoor visits. Bring sun protection and a light layer for evenings.",
        "أواخر الخريف حتى بداية الربيع ألطف عادةً للزيارات الطويلة خارجاً. احمل ما يحميك من الشمس وطبقة خفيفة للمساء.",
      ),
      [egInfo],
    ),
    attention: advice(
      p("Photography and official tickets", "التصوير والتذاكر الرسمية"),
      p(
        "Check photography rules at each site and avoid military or sensitive facilities. Use official ticket channels; drone import and use require prior permission.",
        "راجع قواعد التصوير في كل موقع وتجنب المنشآت العسكرية والحساسة. استخدم قنوات التذاكر الرسمية؛ استيراد الطائرات المسيّرة واستخدامها يحتاجان إذناً مسبقاً.",
      ),
      [egInfo],
    ),
  },
  PAR: {
    slug: "paris",
    summary: p(
      "Art, neighbourhood cafés and walks along the Seine.",
      "فن ومقاهي الأحياء وجولات على ضفاف السين.",
    ),
    season: advice(
      p("Spring and autumn", "الربيع والخريف"),
      p(
        "These are good starting points for a walking-focused visit. Autumn brings cultural events; weather can change, so pack layers and rain protection.",
        "موسمان مناسبان كبداية لتخطيط زيارة تعتمد على المشي. يحمل الخريف فعاليات ثقافية، وقد يتغير الطقس؛ جهّز طبقات ملابس ووسيلة للوقاية من المطر.",
      ),
      [frSeason],
    ),
    attention: advice(
      p(
        "Advance tickets and service updates",
        "التذاكر المسبقة وتحديثات الخدمات",
      ),
      p(
        "Check official museum time slots and transport updates. Book popular attractions through their own ticket sites and allow for queues or service changes.",
        "راجع مواعيد دخول المتاحف وتحديثات المواصلات. احجز المعالم المطلوبة من مواقعها الرسمية واترك هامشاً للطوابير أو تغيّر الخدمات.",
      ),
      [frSeason, frSafety],
    ),
  },
};

export const guideSectionLabels = {
  season: p("Best time to visit", "أفضل وقت للزيارة"),
  visa: p("Visa requirements", "متطلبات التأشيرة"),
  customs: p("Local customs", "العادات المحلية"),
  safety: p("Safety", "السلامة"),
  money: p("Currency and money", "العملة والمال"),
  attention: p("Things to keep in mind", "أمور يجب الانتباه إليها"),
};
export function guideContent(city) {
  const country = countries[city.countryCode], detail = details[city.code];
  return { ...country, ...detail, sections: Object.keys(guideSectionLabels).map(key => ({
    key, label: guideSectionLabels[key], ...(detail[key] || country[key]),
  })) };
}
