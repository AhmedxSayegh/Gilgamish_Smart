const p = (en, ar) => [en, ar];
const place = (en, ar, descriptionEn, descriptionAr) => ({
  name: p(en, ar),
  description: p(descriptionEn, descriptionAr),
});
// Editorial introductions; no live opening hours or ticket prices are implied.
export const cityHighlights = {
  DAM: {
    overview: p(
      "Damascus brings together centuries of urban history in its old quarters, courtyards and traditional markets. Its historic centre reflects the many cultures that shaped the Syrian capital.",
      "تجمع دمشق قروناً من التاريخ في أحيائها القديمة وبيوتها ذات الأفنية وأسواقها التقليدية. وتروي مدينتها القديمة حكاية الحضارات التي تركت بصمتها في العاصمة السورية.",
    ),
    source: "https://mot.gov.sy/",
    landmarks: [
      place(
        "Umayyad Mosque",
        "الجامع الأموي",
        "A landmark of Umayyad architecture in the heart of the old city.",
        "أحد أبرز معالم العمارة الأموية، يقع في قلب المدينة القديمة.",
      ),
      place(
        "Azem Palace",
        "قصر العظم",
        "A historic palace showcasing traditional Damascene architecture and courtyards.",
        "قصر تاريخي يبرز جمال العمارة الدمشقية والأفنية الداخلية.",
      ),
      place(
        "Damascus Citadel",
        "قلعة دمشق",
        "A fortified landmark that tells part of the city's defensive history.",
        "معلم حصين يروي جانباً من التاريخ الدفاعي للمدينة.",
      ),
    ],
  },
  IST: {
    overview: p(
      "Istanbul stretches across the Bosphorus between Europe and Asia. Byzantine and Ottoman monuments, waterfront neighbourhoods and lively markets give the city its layered character.",
      "تمتد إسطنبول على ضفتي البوسفور بين أوروبا وآسيا. وتمنحها آثارها البيزنطية والعثمانية وأحياؤها المطلة على المياه وأسواقها الحيوية طابعاً يجمع التاريخ والحياة اليومية.",
    ),
    source:
      "https://istanbul.ktb.gov.tr/EN-284745/unesco-world-heritage-list-and-istanbul.html",
    landmarks: [
      place(
        "Hagia Sophia",
        "آيا صوفيا",
        "A monumental building known for its great dome and Byzantine heritage.",
        "معلم معماري شهير بقبته الكبيرة وإرثه البيزنطي.",
      ),
      place(
        "Topkapı Palace",
        "قصر طوب قابي",
        "The former Ottoman palace with courtyards overlooking the historic peninsula.",
        "قصر عثماني تاريخي يضم أفنية ويطل على محيط شبه الجزيرة التاريخية.",
      ),
      place(
        "Süleymaniye Mosque",
        "جامع السليمانية",
        "An Ottoman mosque complex associated with architect Sinan.",
        "مجمع معماري عثماني بارز من أعمال المعمار سنان.",
      ),
    ],
  },
  MED: {
    overview: p(
      "Madinah holds a central place in Islamic history as the city of the Hijrah. Its religious landmarks and historic landscapes connect visitors with different chapters of the Prophet's biography.",
      "تحتل المدينة المنورة مكانة محورية في التاريخ الإسلامي بوصفها مدينة الهجرة النبوية. وتربط معالمها الدينية ومواقعها التاريخية الزائر بمحطات من السيرة النبوية.",
    ),
    source: "https://umrah.nusuk.sa/MakkahAndMadinah",
    landmarks: [
      place(
        "The Prophet's Mosque",
        "المسجد النبوي",
        "The city's spiritual heart and one of Islam's most significant mosques.",
        "القلب الروحي للمدينة وأحد أهم المساجد في الإسلام.",
      ),
      place(
        "Quba Mosque",
        "مسجد قباء",
        "A historic mosque closely associated with the Hijrah.",
        "مسجد تاريخي يرتبط بالهجرة النبوية وله مكانة خاصة في تاريخ الإسلام.",
      ),
      place(
        "Mount Uhud",
        "جبل أحد",
        "A mountain closely linked to the events of the Battle of Uhud.",
        "جبل يرتبط بأحداث غزوة أحد ويعد من أبرز معالم المدينة التاريخية.",
      ),
    ],
  },
  QCA: {
    overview: p(
      "Makkah is Islam's holiest city and the destination of Hajj and Umrah. Around the Grand Mosque, its mountains and cultural sites tell stories of pilgrimage and the city's religious heritage.",
      "مكة المكرمة أقدس مدن الإسلام ووجهة الحج والعمرة. وحول المسجد الحرام، تحكي جبالها ومواقعها الثقافية جوانب من تاريخ الحج والإرث الديني للمدينة.",
    ),
    source:
      "https://discovermakkah.sa/en/plan-your-trip/discover-your-destination/interactive-map",
    landmarks: [
      place(
        "The Grand Mosque and Kaaba",
        "المسجد الحرام والكعبة المشرفة",
        "The sacred centre of Hajj and Umrah and the direction of Muslim prayer.",
        "المركز المقدس لشعائر الحج والعمرة وقبلة المسلمين.",
      ),
      place(
        "Hira Cultural District",
        "حي حراء الثقافي",
        "A cultural destination at the foot of Jabal al-Nour exploring the story of revelation.",
        "وجهة ثقافية عند سفح جبل النور تقدم تجربة تعريفية بقصة الوحي.",
      ),
      place(
        "Ain Zubaydah",
        "عين زبيدة",
        "Historic water infrastructure associated with supplying pilgrims.",
        "معلم مائي تاريخي ارتبط بتوفير المياه للحجاج عبر العصور.",
      ),
    ],
  },
  JED: {
    overview: p(
      "Jeddah is a Red Sea city shaped by trade and pilgrimage. Its historic neighbourhoods, distinctive wooden balconies and waterfront offer different perspectives on the city's heritage and coastal life.",
      "جدة مدينة على البحر الأحمر تشكلت هويتها عبر التجارة وخدمة الحجاج. وتجمع أحياؤها التاريخية ورواشينها الخشبية وواجهتها البحرية بين التراث والحياة الساحلية.",
    ),
    source: "https://www.visitsaudi.com/en/destinations/jeddah",
    landmarks: [
      place(
        "Historic Jeddah — Al-Balad",
        "جدة التاريخية — البلد",
        "Historic houses, traditional markets and winding lanes in the old city.",
        "بيوت تاريخية وأسواق تقليدية وأزقة تعكس هوية المدينة القديمة.",
      ),
      place(
        "Jeddah Corniche",
        "كورنيش جدة",
        "Waterfront promenades and public spaces overlooking the Red Sea.",
        "ممشى ومساحات عامة على الواجهة البحرية بإطلالات على البحر الأحمر.",
      ),
      place(
        "King Fahd's Fountain",
        "نافورة الملك فهد",
        "A distinctive landmark on Jeddah's seafront skyline.",
        "معلم مميز يرسم جزءاً من مشهد الواجهة البحرية لجدة.",
      ),
    ],
  },
  RUH: {
    overview: p(
      "Riyadh combines the heritage of Najd with a growing modern skyline. Historic palaces and museums offer an introduction to Saudi history alongside the capital's contemporary urban life.",
      "تجمع الرياض تراث نجد مع مشهد عمراني حديث ومتجدد. وتتيح قصورها التاريخية ومتاحفها التعرف على تاريخ السعودية إلى جانب الحياة المعاصرة في العاصمة.",
    ),
    source: "https://rmp.alriyadh.gov.sa/en/content/tourism",
    landmarks: [
      place(
        "Al Masmak Palace",
        "قصر المصمك",
        "A historic fortress closely associated with the story of Saudi unification.",
        "حصن تاريخي يرتبط بقصة توحيد المملكة العربية السعودية.",
      ),
      place(
        "Saudi National Museum",
        "المتحف الوطني السعودي",
        "Collections and displays introducing the history and heritage of the Arabian Peninsula.",
        "مجموعات وعروض تعرف بتاريخ الجزيرة العربية وتراثها.",
      ),
      place(
        "Murabba Palace",
        "قصر المربع",
        "A historic royal palace within the King Abdulaziz Historical Center area.",
        "قصر ملكي تاريخي ضمن منطقة مركز الملك عبدالعزيز التاريخي.",
      ),
    ],
  },
  AMM: {
    overview: p(
      "Amman spreads over hills where ancient remains sit alongside lively modern neighbourhoods. Its historic downtown and archaeological sites reveal layers of Roman, Byzantine and Islamic history.",
      "تمتد عمّان فوق تلال تتجاور فيها الآثار القديمة مع الأحياء الحديثة. ويكشف وسط البلد ومواقعها الأثرية عن طبقات من التاريخ الروماني والبيزنطي والإسلامي.",
    ),
    source: "https://doa.gov.jo/EN/ListDetails/Archeological_Sites/1157/2",
    landmarks: [
      place(
        "Amman Citadel",
        "جبل القلعة",
        "A hilltop archaeological site with remains from several historical periods.",
        "موقع أثري مرتفع يضم بقايا من عصور تاريخية متعددة.",
      ),
      place(
        "Roman Theatre",
        "المدرج الروماني",
        "A monumental ancient theatre set into the hillside near downtown.",
        "مسرح أثري كبير شُيّد على سفح تل بالقرب من وسط البلد.",
      ),
      place(
        "Umayyad Palace at the Citadel",
        "القصر الأموي في جبل القلعة",
        "An early Islamic palace complex within the Citadel archaeological site.",
        "مجمع قصري من العصر الأموي ضمن موقع جبل القلعة الأثري.",
      ),
    ],
  },
  DXB: {
    overview: p(
      "Dubai brings together a modern skyline and older neighbourhoods around its creek. Exploring both sides reveals the contrast between its trading heritage and contemporary architecture.",
      "تجمع دبي أبراجاً حديثة وأحياء قديمة حول خورها التاريخي. ويتيح استكشاف الجانبين التعرف على تراثها التجاري وعمارتها المعاصرة.",
    ),
    source:
      "https://www.dubai.ae/web/dubai.ae/visit/staying-in-dubai/dubai-neighborhoods/",
    landmarks: [
      place(
        "Burj Khalifa",
        "برج خليفة",
        "An iconic tower at the heart of Downtown Dubai.",
        "برج بارز في قلب منطقة وسط مدينة دبي وأحد أشهر رموزها.",
      ),
      place(
        "Al Fahidi Historical Neighbourhood",
        "حي الفهيدي التاريخي",
        "Traditional lanes and architecture recalling Dubai's earlier urban life.",
        "أزقة وعمارة تقليدية تعكس ملامح الحياة القديمة في دبي.",
      ),
      place(
        "Dubai Creek",
        "خور دبي",
        "A historic waterway closely linked to the city's maritime trade.",
        "ممر مائي تاريخي ارتبط بالتجارة البحرية ونشأة المدينة.",
      ),
    ],
  },
  CAI: {
    overview: p(
      "Cairo is a Nile-side metropolis with museums, historic mosques and lively streets. Its monuments reflect different eras, from the ancient collections in its museums to the architecture of its medieval city.",
      "القاهرة مدينة نابضة على ضفاف النيل، تجمع المتاحف والمساجد التاريخية والشوارع الحيوية. وتعكس معالمها عصوراً مختلفة، من الآثار المصرية القديمة في متاحفها إلى عمارة المدينة التاريخية.",
    ),
    source:
      "https://www.cairo.gov.eg/en/tourism/tourism-destinations/cultural/museums/",
    landmarks: [
      place(
        "Egyptian Museum in Tahrir",
        "المتحف المصري بالتحرير",
        "A historic museum with collections from ancient Egyptian civilisation.",
        "متحف تاريخي يضم مجموعات من آثار الحضارة المصرية القديمة.",
      ),
      place(
        "Saladin Citadel",
        "قلعة صلاح الدين",
        "A hilltop fortress complex that includes the Mosque of Muhammad Ali.",
        "مجمع حصين مرتفع يضم جامع محمد علي ومعالم تاريخية أخرى.",
      ),
      place(
        "Museum of Islamic Art",
        "متحف الفن الإسلامي",
        "A museum in Bab Al-Khalq dedicated to Islamic art and craftsmanship.",
        "متحف في باب الخلق يعرض جوانب من الفنون والحرف في الحضارة الإسلامية.",
      ),
    ],
  },
  PAR: {
    overview: p(
      "Paris grew around the Seine, with bridges, museums and historic neighbourhoods shaping its identity. Art, architecture and everyday café life are central to discovering the French capital.",
      "نشأت باريس حول نهر السين، وتشكل جسورها ومتاحفها وأحياؤها التاريخية جزءاً من هويتها. ويعد الفن والعمارة وحياة المقاهي اليومية من أبرز ملامح اكتشاف العاصمة الفرنسية.",
    ),
    source: "https://parisjetaime.com/eng/",
    landmarks: [
      place(
        "Eiffel Tower",
        "برج إيفل",
        "The landmark iron tower overlooking the Seine and Champ de Mars.",
        "البرج الحديدي الشهير المطل على نهر السين وحديقة شامب دو مارس.",
      ),
      place(
        "Louvre Museum",
        "متحف اللوفر",
        "A former palace housing major collections of art and antiquities.",
        "قصر سابق يحتضن مجموعات كبيرة من الأعمال الفنية والآثار.",
      ),
      place(
        "Notre-Dame Cathedral",
        "كاتدرائية نوتردام",
        "A Gothic cathedral on the Île de la Cité in the heart of Paris.",
        "كاتدرائية قوطية تقع على جزيرة إيل دو لا سيتي في قلب باريس.",
      ),
    ],
  },
};
