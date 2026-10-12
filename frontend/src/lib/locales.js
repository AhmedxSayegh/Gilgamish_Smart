// Shared catalogs; page-specific editorial copy stays beside its English/Arabic pair.
export const interests = {
  history: ["History", "التاريخ"],
  culture: ["Culture", "الثقافة"],
  museums: ["Museums", "المتاحف"],
  food: ["Food", "الطعام"],
  cafes: ["Cafés", "المقاهي"],
  shopping: ["Shopping", "التسوق"],
  nature: ["Nature", "الطبيعة"],
  beaches: ["Beaches", "الشواطئ"],
  photography: ["Photography", "التصوير"],
  adventure: ["Adventure", "المغامرة"],
  family: ["Family", "العائلة"],
  nightlife: ["Nightlife", "الحياة الليلية"],
  relaxation: ["Relaxation", "الاسترخاء"],
  architecture: ["Architecture", "العمارة"],
  local: ["Local experiences", "تجارب محلية"],
};
export const categories = {
  flights: ["Flights", "الطيران"],
  accommodation: ["Stay", "الإقامة"],
  food: ["Food", "الطعام"],
  activities: ["Activities", "الأنشطة"],
  transport: ["Transport", "التنقل"],
  miscellaneous: ["Other costs", "مصاريف أخرى"],
};
export const warnings = {
  DEVELOPMENT_FIXTURES: [
    "Development mode: synthetic offers and places, not live travel prices.",
    "وضع تجريبي: العروض والأماكن بيانات اختبار وليست أسعار سفر مباشرة.",
  ],
  PRICES_ARE_SNAPSHOTS: [
    "Prices reflect the time of search and can change before booking.",
    "تعكس الأسعار وقت البحث وقد تتغير قبل الحجز.",
  ],
  PROVIDER_LINKS_OPEN_SEARCH: [
    "Booking links open provider searches. They do not reserve these offers.",
    "روابط الحجز تفتح بحثاً لدى المزوّد ولا تحجز هذه العروض.",
  ],
  TRANSFER_TIMES_ARE_ESTIMATES: [
    "Travel times between activities are estimates; verify routes before travel.",
    "أوقات التنقل بين الأنشطة تقديرية؛ تحقّق من الطرق قبل السفر.",
  ],
  OVER_BUDGET: [
    "This estimate is over your budget. Adjust allowances or try cheaper offers.",
    "يتجاوز هذا التقدير ميزانيتك. عدّل المخصصات أو جرّب عروضاً أقل تكلفة.",
  ],
  ACTIVITY_PRICES_UNKNOWN: [
    "Some activity fees are unknown and are excluded from the subtotal.",
    "بعض رسوم الأنشطة غير معروفة وغير مشمولة في المجموع.",
  ],
  OPENING_HOURS_UNVERIFIED: [
    "Some opening hours are unverified. Check dates and holiday closures.",
    "بعض أوقات العمل غير مؤكدة. تحقّق من التواريخ والإغلاقات في العطلات.",
  ],
  HOTEL_STAR_RATING_UNAVAILABLE: [
    "The provider did not supply a hotel star rating.",
    "لم يوفّر المزوّد تصنيف نجوم الفندق.",
  ],
  PLACE_DETAILS_UNAVAILABLE: [
    "Some place details could not be refreshed. Please retry later.",
    "تعذّر تحديث تفاصيل بعض الأماكن. أعد المحاولة لاحقاً.",
  ],
  UNCHANGED_DAYS_KEEP_PREVIOUS_SCHEDULE: [
    "Unchanged days keep their previous schedule.",
    "تحتفظ الأيام غير المعدّلة بجدولها السابق.",
  ],
};
export const errors = {
  NETWORK_ERROR: "تعذّر الاتصال بالخادم. أعد المحاولة.",
  SERVER_UNAVAILABLE: "الخادم غير متاح حالياً. أعد المحاولة.",
  UNAUTHENTICATED: "يرجى تسجيل الدخول للمتابعة.",
  INVALID_CREDENTIALS: "البريد الإلكتروني أو كلمة المرور غير صحيحة.",
  EMAIL_EXISTS: "هذا البريد الإلكتروني مسجّل بالفعل.",
  VALIDATION_ERROR: "يرجى مراجعة الحقول المطلوبة والقيم المدخلة.",
  RATE_LIMITED: "طلبات كثيرة. انتظر قليلاً ثم أعد المحاولة.",
  OFFER_EXPIRED: "انتهت صلاحية العرض. حدّث نتائج البحث واختر مجدداً.",
  MOCK_DESTINATION_UNSUPPORTED: "اختر وجهة متاحة في قائمة المدن التجريبية.",
  NOT_FOUND: "لم يتم العثور على العنصر المطلوب.",
  FORBIDDEN: "هذا الإجراء غير متاح.",
  CSRF_INVALID: "انتهت الجلسة. حدّث الصفحة وسجّل الدخول مجدداً.",
  PROVIDER_ERROR: "تعذّر جلب بيانات المزوّد. أعد المحاولة لاحقاً.",
};
