# النسخة الرئيسية الموحدة — 19 أكتوبر 2026

> Superseded on 26 October 2026 for language-model planning. Current planning uses local rules without Ollama or external LLMs. Read PROJECT-STATE.md and docs/RULE-BASED-PLANNING.md. Historical verification below does not describe the active engine.

> Historical checkpoint. The current implementation and user decisions are documented in PROJECT-STATE.md and docs/BACKEND-AGENT-PLAN.md (25 October 2026). The chatbot is deferred; flight/hotel vendors remain undecided.

> تحديث لاحق بناءً على طلب المستخدم: أُزيل Journey Agent من التشغيل والكود الفعّال، وأُزيلت واجهة تقريره والخيارات المجمعة. التخطيط الآن مباشر مع التحقق قبل الحفظ، بدون حلقة مراجعة Agent. التوصيات العادية وGoogle Places وRoutes باقية. AI_PROVIDER ما زال mock؛ لا يعمل نموذج ذكاء فعلي حالياً. أوصاف دمج الـAgent أدناه سجل سابق. النسخة قبل الإزالة محفوظة في `D:\Codex-Sarh-Technology\backups\gilgamish-with-agent-1792436997714`. نجحت الاختبارات الـ37 بعد الإزالة.

المجلد المعتمد للعمل والتشغيل:
`D:\Codex-Sarh-Technology\Gilgamish-Smart`

النسخ الأخرى محفوظة كمراجع؛ لا تتابع التطوير عليها. ملفات إعدادات الخدمات وقاعدة البيانات في النسخة الرئيسية لم تُستبدل. لا حاجة لترحيل قاعدة البيانات لهذه الإضافات.

## ما تم دمجه

- فصل إعدادات الأماكن والطيران والفنادق والوجهات والذكاء الاصطناعي.
- توصيات الطيران والفنادق والخيارات المجمعة، وحلقة Agent محدودة المحاولات وتقرير مراجعتها وحفظه مع الرحلة.
- دعم النموذج المحلي Ollama، مع إبقاء اختيار نموذج التشغيل الحالي دون تغيير.
- Google Places مع البحث عن المعالم والمطاعم، وGoogle Routes مع نقاط وصول محمية لحساب مسار محدد أو مسار يوم محفوظ.
- واجهات الخيارات وتقرير المراجعة، مع الحفاظ على تنبيهات البيانات المختلطة.

## الإعدادات المعتمدة

| المتغير | القيم |
|---|---|
| DESTINATIONS_PROVIDER | mock / amadeus |
| FLIGHTS_PROVIDER | mock / amadeus |
| HOTELS_PROVIDER | mock / amadeus |
| PLACES_PROVIDER | mock / google |
| ROUTES_PROVIDER | mock / google، الافتراضي mock |
| AI_PROVIDER | mock / external / ollama |

Routes يحتاج GOOGLE_ROUTES_API_KEY، أو يستخدم GOOGLE_PLACES_API_KEY عند غياب الأول. لا يتم تفعيل Routes الفعلي تلقائياً بمجرد وجود مفتاح Places. عند تفعيله يجب التأكد من إتاحة الخدمة على المفتاح واختبارها.

Ollama يستخدم OLLAMA_BASE_URL (افتراضياً http://127.0.0.1:11434) وOLLAMA_MODEL (افتراضياً qwen3:4b-instruct). AI_PROVIDER=ollama يختار النموذج المحلي بعد تشغيله. التفعيل منفصل عن دمج الكود.

الخدمات المفعلة الفعلية لا تعود بصمت إلى بيانات تجريبية عند الفشل. USE_MOCK_SERVICES يبقى افتراضياً للخدمات التي لم تحدد صراحة، باستثناء Routes الذي يبقى تجريبياً حتى اختياره صراحة.

## التشغيل والفحص

من المجلد الرئيسي: `npm run dev`، أو `npm run build` ثم `npm start` وفق إعداد المنفذ والأصل في backend/.env. الرابط المحلي الحالي للواجهة http://localhost:5180، والخادم http://localhost:4000.

`GET /api/health` يعرض الخدمات الفعلية المختارة وaiMode. `npm test` يفحص التكامل، و`npm run build` يبني الواجهة.

بعد تسجيل الدخول ومع CSRF:
- POST /api/routes/compute: إحداثيات البداية والنهاية ونقاط وسيطة اختيارية وtravelMode.
- POST /api/plans/:id/days/:dayNumber/route: حساب المسار بترتيب أنشطة اليوم، مع فحص ملكية الخطة.

## ما لم يكتمل بعد

## نتيجة التحقق بعد الدمج

- نجحت اختبارات الخادم الـ42 وبناء الواجهة.
- أُعيد تشغيل الخادم الرئيسي، وأكد http://localhost:5180/api/health أن قاعدة البيانات متاحة وأن النسخة تعمل بالخدمات: places=google، routes=mock، ai=mock، flights=mock، hotels=mock، destinations=mock.
- ملف backend/.env مطابق بايتاً ببايت للنسخة الاحتياطية؛ لم تتغير المفاتيح أو إعدادات قاعدة البيانات.
- اختبارات الخدمات الخارجية تستخدم استجابات مضبوطة؛ لم ننفذ خلال الدمج طلبات Google حية أو تجربة نموذج محلي فعلية. لا توجد قاعدة اختبار MySQL مخصصة متاحة، لذلك لم يُشغّل اختبار الكتابة الخاص بها.

## العمل التالي

حساب Routes متاح عند الطلب لكنه لم يُدمج تلقائياً في جدولة الأنشطة أو عرض الخريطة. الطيران والفنادق والتخطيط الحالي تبقى تجريبية حسب الإعدادات المحفوظة؛ دعم Ollama موجود وقابل للتفعيل. يلزم اختبار شامل على البيانات الحقيقية. RAG والشات والنشر العام ليست ضمن هذا الدمج.

وثائق AGENT-WORKFLOW وLOCAL-AI وSTATUS القديمة تسجل اختبارات سابقة على نسخ منفصلة؛ لا تعتبر إثباتاً لاختبار حي جديد للنسخة الموحدة. هذا الملف هو المرجع الأحدث للمجلد والإعدادات والحدود.

النسخة الاحتياطية قبل الدمج: `D:\Codex-Sarh-Technology\backups\gilgamish-unification-1792436371258`.
