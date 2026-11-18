import { cityGuides } from "./cityGuides";
import { cityHighlights } from "./cityHighlights";

const p = (en, ar) => [en, ar];
const extras = {
  DAM: [
    p("Al-Hamidiyah Souq", "سوق الحميدية"),
    p("Old Damascus lanes", "أزقة دمشق القديمة"),
    p("Traditional Damascene courtyard café", "مقهى في بيت دمشقي تقليدي"),
  ],
  IST: [
    p("Grand Bazaar", "البازار الكبير"),
    p("Bosphorus waterfront walk", "جولة على ضفة البوسفور"),
    p("Sultanahmet Square", "ساحة السلطان أحمد"),
  ],
  MED: [
    p("Walk along Quba Avenue", "جولة في جادة قباء"),
    p("Local dates market", "سوق التمور المحلي"),
    p("Quiet café break", "استراحة هادئة في مقهى"),
  ],
  QCA: [
    p("Rest near your accommodation", "استراحة قرب مكان الإقامة"),
    p("Local meal near your accommodation", "وجبة محلية قرب مكان الإقامة"),
    p("Free time for worship and rest", "وقت حر للعبادة والراحة"),
  ],
  JED: [
    p("Traditional markets in Al-Balad", "الأسواق التقليدية في البلد"),
    p("Red Sea waterfront café", "مقهى على واجهة البحر الأحمر"),
    p("Local Hijazi meal", "وجبة من المطبخ الحجازي"),
  ],
  RUH: [
    p("Souq Al-Zal", "سوق الزل"),
    p("King Abdullah Park", "منتزه الملك عبدالله"),
    p("Traditional Najdi meal", "وجبة من المطبخ النجدي"),
  ],
  AMM: [
    p("Downtown Amman markets", "أسواق وسط البلد"),
    p("Rainbow Street", "شارع الرينبو"),
    p("Jordanian café and local meal", "مقهى ووجبة أردنية محلية"),
  ],
  DXB: [
    p("Al Seef waterfront", "واجهة السيف"),
    p("Jumeirah beach walk", "جولة على شاطئ جميرا"),
    p("Traditional souqs near the creek", "الأسواق التقليدية قرب الخور"),
  ],
  CAI: [
    p("Khan el-Khalili", "خان الخليلي"),
    p("Nile Corniche walk", "جولة على كورنيش النيل"),
    p("Traditional Egyptian café", "مقهى مصري تقليدي"),
  ],
  PAR: [
    p("Tuileries Garden", "حديقة التويلري"),
    p("Seine riverbank walk", "جولة على ضفاف السين"),
    p("Parisian café break", "استراحة في مقهى باريسي"),
  ],
};
const comments = [
  [
    p(
      "The mix of landmarks and breaks made this plan easy to follow.",
      "أعجبني الجمع بين المعالم والاستراحات؛ ترتيب الخطة سهل وواضح.",
    ),
    p(
      "A lovely starting point for discovering the city without rushing.",
      "بداية جميلة لاكتشاف المدينة بدون استعجال.",
    ),
  ],
  [
    p(
      "I liked the relaxed pace and the free time between visits.",
      "حبيت الإيقاع الهادئ والوقت الحر بين الزيارات.",
    ),
    p(
      "The variety of activities makes this itinerary feel balanced.",
      "تنوع الأنشطة يجعل البرنامج متوازناً وممتعاً.",
    ),
  ],
  [
    p(
      "A varied week with time to explore and relax.",
      "أسبوع متنوع فيه وقت للاستكشاف والاستراحة.",
    ),
    p(
      "A lovely mix of landmarks and free time across the week.",
      "توزيع جميل بين المعالم والوقت الحر على مدار الأسبوع.",
    ),
  ],
];
const profiles = [
  p("Nour — demo profile", "نور — شخصية تجريبية"),
  p("Omar — demo profile", "عمر — شخصية تجريبية"),
  p("Lina — demo profile", "لينا — شخصية تجريبية"),
];
export const samplePlansFor = (slug) => {
  const city = cityGuides.find((c) => c.slug === slug);
  if (!city) return [];
  const places = [
    ...cityHighlights[city.code].landmarks.map((l) => l.name),
    ...extras[city.code],
  ];
  places.push(
    p(
      "Arrival, check-in and a short orientation walk",
      "الوصول وتسجيل الدخول وجولة تعريفية قصيرة",
    ),
    p(
      "Explore local cuisine over a relaxed lunch",
      "تجربة المطبخ المحلي مع غداء على مهل",
    ),
    p(
      "A photography walk in a public neighbourhood",
      "جولة تصوير في أحد الأحياء العامة",
    ),
    p(
      "Browse local crafts and souvenirs",
      "التعرف على الحرف المحلية وشراء التذكارات",
    ),
    p("Dinner near your accommodation", "عشاء قرب مكان الإقامة"),
    p("Free exploration based on your interests", "استكشاف حر حسب اهتماماتك"),
    p("A relaxed farewell breakfast", "فطور وداعي على مهل"),
    p(
      "Pack, check out and allow time for departure",
      "تجهيز الأمتعة وتسجيل الخروج وترك وقت للمغادرة",
    ),
  );
  const variants = [
    {
      title: p("City highlights in three days", "أجمل معالم المدينة في ٣ أيام"),
      mood: p("Culture & discovery", "ثقافة واكتشاف"),
      days: [
        [0, 3],
        [1, 5],
        [2, 4],
      ],
      rating: 4.5,
    },
    {
      title: p("Five days at a gentle pace", "خمسة أيام على مهل"),
      mood: p("Relaxed exploration", "استكشاف هادئ"),
      days: [
        [6, 3],
        [0, 7],
        [1, 5],
        [2, 4],
        [8, 9],
      ],
      rating: 5.0,
    },
    {
      title: p("A full week in the city", "أسبوع كامل في المدينة"),
      mood: p("An extended stay", "إقامة أطول"),
      days: [
        [6, 10],
        [0, 3],
        [1, 5],
        [2, 7],
        [4, 8],
        [11, 9],
        [12, 13],
      ],
      rating: 4.5,
    },
  ];
  return variants.map((variant, index) => ({
    ...variant,
    id: `${city.slug}-${index + 1}`,
    author: profiles[index],
    days: variant.days.map((indices) => indices.map((i) => places[i])),
    reviews: comments[index].map((body, i) => ({
      author: profiles[(index + i + 1) % profiles.length],
      rating: index === 1 ? 5 : i ? 4 : 5,
      body,
    })),
  }));
};
