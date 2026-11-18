const airlineNames = {
  F3: ["flyadeal", "طيران أديل"],
  TK: ["Turkish Airlines", "الخطوط الجوية التركية"],
  RJ: ["Royal Jordanian", "الخطوط الملكية الأردنية"],
  SV: ["Saudia", "الخطوط السعودية"],
  XY: ["flynas", "طيران ناس"],
  EK: ["Emirates", "طيران الإمارات"],
  EY: ["Etihad Airways", "الاتحاد للطيران"],
  FZ: ["flydubai", "فلاي دبي"],
  G9: ["Air Arabia", "العربية للطيران"],
  QR: ["Qatar Airways", "الخطوط الجوية القطرية"],
  WY: ["Oman Air", "الطيران العماني"],
  GF: ["Gulf Air", "طيران الخليج"],
  KU: ["Kuwait Airways", "الخطوط الجوية الكويتية"],
  ME: ["Middle East Airlines", "طيران الشرق الأوسط"],
  PC: ["Pegasus Airlines", "طيران بيغاسوس"],
  VF: ["AJet", "إيه جيت"],
  LH: ["Lufthansa", "لوفتهانزا"],
  AF: ["Air France", "الخطوط الجوية الفرنسية"],
  BA: ["British Airways", "الخطوط الجوية البريطانية"],
  KL: ["KLM", "كي إل إم"],
  AZ: ["ITA Airways", "إيتا للطيران"],
  LX: ["SWISS", "سويس"],
  OS: ["Austrian Airlines", "الخطوط الجوية النمساوية"],
  IB: ["Iberia", "إيبيريا"],
  SN: ["Brussels Airlines", "الخطوط الجوية البلجيكية"],
  LO: ["LOT Polish Airlines", "الخطوط الجوية البولندية"],
  SU: ["Aeroflot", "إيروفلوت"],
  MS: ["EgyptAir", "مصر للطيران"],
  AT: ["Royal Air Maroc", "الخطوط الملكية المغربية"],
  TU: ["Tunisair", "الخطوط التونسية"],
  AH: ["Air Algerie", "الخطوط الجوية الجزائرية"],
  "6Q": ["Cham Wings Airlines", "أجنحة الشام"],
  "6E": ["IndiGo", "إنديغو"],
  AI: ["Air India", "طيران الهند"],
  SQ: ["Singapore Airlines", "الخطوط الجوية السنغافورية"],
  CX: ["Cathay Pacific", "كاثاي باسيفيك"],
  JL: ["Japan Airlines", "الخطوط الجوية اليابانية"],
  NH: ["All Nippon Airways", "آل نيبون إيرويز"],
  QF: ["Qantas", "كانتاس"],
  AC: ["Air Canada", "طيران كندا"],
  UA: ["United Airlines", "يونايتد إيرلاينز"],
  DL: ["Delta Air Lines", "دلتا إيرلاينز"],
  AA: ["American Airlines", "أمريكان إيرلاينز"],
  WN: ["Southwest Airlines", "ساوث ويست إيرلاينز"],
  AS: ["Alaska Airlines", "ألاسكا إيرلاينز"],
  B6: ["JetBlue", "جيت بلو"],
  FR: ["Ryanair", "رايان إير"],
  U2: ["easyJet", "إيزي جيت"],
  W6: ["Wizz Air", "ويز إير"],
  VY: ["Vueling", "فويلينغ"],
  HV: ["Transavia", "ترانسافيا"],
};

const arabicText = /[\u0600-\u06ff]/;

export function localizedAirlineName(offer, language) {
  const code = offer.airlineCode?.toUpperCase();
  const knownName = airlineNames[code];
  if (knownName) return knownName[language === "ar" ? 1 : 0];

  const providerName = offer.airlineName?.trim();
  if (providerName && (language === "ar" || !arabicText.test(providerName))) {
    return providerName;
  }

  return code || providerName || "—";
}
