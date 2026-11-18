import { useAdmissionPrices } from "../lib/admissionPrices";
import { FlightBookingLink } from "../components/FlightBookingLink";
import { HotelBookingLink, HotelPriceNote } from "../components/HotelBookingLink";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, mutation } from "../lib/api";
import { assets, cityFor } from "../lib/assets";
import { useApp } from "../lib/context";
import { localizedAirlineName } from "../lib/airlineNames";
import { AirlineLogo } from "../components/AirlineLogo";
import { categories, interests, warnings } from "../lib/locales";
import {
  Icon,
  Field,
  Modal,
  ErrorMessage,
  Loading,
  ExternalLink,
} from "../components/UI";
import { OfferCard } from "./Planner";
import { dailyWindows, nextActivitySlot, umrahSlot } from "../../../shared/visitWindows.mjs";

function umrahDateNote(plan, day, item, index, t) {
  if (index !== 0 || day.dayNumber !== 1 || plan.input.destinationCode !== "QCA") return "";
  const slot = umrahSlot(plan.input, plan.flight);
  if (slot.startTime !== item.startTime || slot.endTime !== item.endTime) return "";
  const dateAt = offset => new Date(Date.parse(day.date) + Math.floor(offset / 1440) * 86400000).toISOString().slice(0,10);
  if (slot.start >= 1440) return ` · ${dateAt(slot.start)} → ${dateAt(slot.end)}`;
  return slot.end >= 1440 ? t(" · ends the next day", " · تنتهي في اليوم التالي") : "";
}
function unavailableFeeLabel(reason, t) {
  if (reason === "price_lookup_rate_limited" || reason === "price_provider_rate_limited")
    return t("Price lookup limit reached. Try later.", "تم بلوغ حد طلبات الأسعار. جرّب لاحقاً.");
  if (reason === "price_lookup_disabled" || reason === "price_provider_error")
    return t("Price service unavailable", "خدمة الأسعار غير متاحة حالياً");
  return t("No confirmed admission price", "لم يتوفر سعر دخول مؤكّد");
}
function PlaceAttribution({ place }) {
  const { t } = useApp();
  return (
    <>

      {place.provider === "dataset" && <small className="attribution">{t("Source: saved dataset · opening hours and fees unverified", "المصدر: الداتا سيت · ساعات الدوام والرسوم غير مؤكدة")}</small>}
      {place.provider === "google" && place.sources?.includes("dataset") && <small className="attribution">{t("Also found in the dataset", "موجود أيضاً في الداتا سيت")}</small>}
      {place.attributions?.map((a, i) => (
        <small className="attribution" key={i}>
          <ExternalLink href={a.providerUri || a.uri}>
            {a.provider || a.name || t("Attribution", "المصدر")}
          </ExternalLink>
        </small>
      ))}
    </>
  );
}
export function Plan() {
  const { id } = useParams(),
    navigate = useNavigate();
  const { t, money, date, notify } = useApp();
  const [catalog, setCatalog] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setCatalog(null);
    api("/plans/" + id + "/places", { signal: controller.signal })
      .then(data => {
        if (!controller.signal.aborted) setCatalog({ id, places: data.places });
      })
      .catch(error => {
        if (!controller.signal.aborted) setCatalog({ id, error });
      });
    return () => controller.abort();
  }, [id, retryCount]);
  const [plan, setPlan] = useState(null),
    [trip, setTrip] = useState(null),
    [error, setError] = useState(null),
    [modal, setModal] = useState(null),
    [busy, setBusy] = useState(false),
    [modalError, setModalError] = useState(null);
  async function load() {
    setError(null);
    try {
      const p = await api("/plans/" + id);
      setPlan(p);
      setTrip(await api("/trips/" + p.tripId));
    } catch (e) {
      setError(e);
    }
  }
  useEffect(() => {
    setPlan(null);
    load();
  }, [id]);
  const show = (type) => {
    setModalError(null);
    setModal(type);
  };
  async function change(path, method, body, newVersion = false) {
    setBusy(true);
    setModalError(null);
    try {
      const data = await mutation(path, method, body);
      if (newVersion) {
        setModal(null);
        navigate("/plans/" + data.id);
        notify(
          t(
            "New version created. Your previous version is preserved.",
            "تم إنشاء نسخة جديدة والاحتفاظ بالنسخة السابقة.",
          ),
        );
      }
      return data;
    } catch (e) {
      setModalError(e);
      return null;
    } finally {
      setBusy(false);
    }
  }
  const admission = useAdmissionPrices(plan?.input, plan?.days);
  if (!plan)
    return (
      <section className="container page-space">
        <ErrorMessage error={error} />
        {error ? (
          <button className="button" onClick={load}>
            {t("Retry", "إعادة المحاولة")}
          </button>
        ) : (
          <Loading />
        )}
      </section>
    );
  const city = cityFor(plan.input.destinationCode),
    b = plan.budget;
  const visits = plan.days.flatMap(day => day.items.map(item => ({ item, fees: admission(day, item) })));
  const subtotal = visits.reduce((sum, { fees }) => sum + fees.reduce((n, fee) =>
    n + (fee.unit == null ? 0 : Math.round(Number(fee.unit) * 100) * fee.count), 0), 0) / 100;
  const missing = visits.filter(({ fees }) => fees.some(fee => fee.unit == null)).length;
  const hasAmount = visits.some(({ fees }) => fees.some(fee => fee.unit != null));
  const total = Number(b.totalCost) - Number(b.items.find(row => row.category === "activities")?.amount || 0) + subtotal;
  const remaining = Number(b.totalBudget) - total;
  function admissionLabel(fees) {
    return fees.map(fee => {
      const label = fee.category === "Adult" ? t("Adult", "البالغ") : t("Child", "الطفل");
      const value = fee.price == null ? (fee.pending ? t("Checking…", "جارٍ التحقق…") : unavailableFeeLabel(fee.reason, t))
        : fee.unit == null ? t("Exchange rate unavailable", "سعر الصرف غير متوفر")
        : Number(fee.unit) === 0 && Number(fee.price) === 0 ? t("Free", "مجاني") : money(fee.unit, b.currency);
      return label + " · " + value;
    }).join(" / ");
  }
  const places = [
    ...new Map(
      plan.days.flatMap((d) =>
        d.items.map((item) => [item.placeId, item.place]),
      ),
    ).values(),
  ];
  return (
    <section className="container plan-page">
      <div className="plan-hero">
        <img src={city?.image || assets.hero} alt="" />
        <div className="image-shade" />
        <div className="plan-hero-copy">

          <h1>
            {t(
              `${plan.days.length} days in ${plan.input.destination}`,
              `${plan.days.length} أيام في ${city?.ar || plan.input.destination}`,
            )}
          </h1>
          <p>
            {date(plan.input.startDate)} — {date(plan.input.endDate)} ·{" "}
            {plan.input.adults + plan.input.children}{" "}
            {t(
              plan.input.adults + plan.input.children === 1
                ? "traveler"
                : "travelers",
              "مسافر",
            )}

          </p>
        </div>
      </div>
      <div className="plan-actions">
        <button
          className="button secondary"
          aria-pressed={plan.isSaved}
          disabled={busy}
          onClick={async () => {
            const data = await change("/plans/" + id, "PATCH", {
              isSaved: !plan.isSaved,
            });
            if (data) {
              setPlan({ ...plan, isSaved: data.isSaved });
              notify(
                data.isSaved
                  ? t("Plan saved.", "تم حفظ الخطة.")
                  : t(
                      "Plan removed from saved trips.",
                      "أُزيلت الخطة من الرحلات المحفوظة.",
                    ),
              );
            }
          }}
        >
          <svg className="icon" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v17l-6-3.5L6 21Z"
              fill={plan.isSaved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
          </svg>
          {plan.isSaved ? t("Saved", "محفوظة") : t("Save", "حفظ")}
        </button>
        <button className="button secondary" onClick={() => show("modify")}>
          <Icon name="modify" />
          {t("Modify", "تعديل")}
        </button>
        <button className="button secondary" onClick={() => show("regenerate")}>
          <Icon name="refresh" />
          {t("Regenerate", "إعادة الإنشاء")}
        </button>
        <button className="button" onClick={() => show("booking")}>
          <Icon name="book" />
          {t("Book now", "احجز الآن")}
        </button>
      </div>
      {!modal && <ErrorMessage error={modalError} />}
      {plan.input.children > 0 && ["serpapi", "amadeus"].includes(plan.hotel.provider) && <p className="notice" role="status">{t("Hotel price covers adults only. Confirm child rates with the hotel.", "سعر الفندق يشمل البالغين فقط. تأكّد من تكلفة إقامة الأطفال مع الفندق.")}</p>}
      <div className="plan-columns">
        <aside className="panel plan-budget">
          <p className="summary-label">
            <Icon name="overview" />
            {t("Estimated cost", "التكلفة التقديرية")}
          </p>
          <div className="cost-total">{money(total, b.currency)}</div>
          <p className="muted">
            {t("whole trip · all travelers", "الرحلة كاملة · جميع المسافرين")}
          </p>
          <dl className="budget-lines">
            {b.items.map((item) => (
              <div key={item.category}>
                <dt>
                  {t(
                    ...(categories[item.category] || [
                      item.category,
                      item.category,
                    ]),
                  )}
                  <small>
                    {item.category === "activities" ? t("Known admission estimates", "تقديرات رسوم الدخول المتوفرة") : item.sourceType === "user_allowance"
                      ? t("Your allowance", "مخصصاتك")
                      : item.sourceType === "partial_known_costs"
                        ? t("Known fees only", "الرسوم المعروفة فقط")
                        : item.sourceType === "development_fixture"
                          ? t("Sample price", "سعر تجريبي")
                          : t("Search quote", "سعر البحث")}
                  </small>
                </dt>
                <dd>{item.category === "activities" ? (visits.length && !hasAmount ? "—" : money(subtotal, b.currency)) : money(item.amount, b.currency)}</dd>
              </div>
            ))}
          </dl>
          <div className="budget-remaining">
            <span>{t("Budget", "الميزانية")}</span>
            <strong>{money(b.totalBudget, b.currency)}</strong>
            <span>
              {remaining < 0
                ? t("Over budget", "تجاوز الميزانية")
                : t("Remaining", "المتبقي")}
            </span>
            <strong className={remaining < 0 ? "danger" : ""}>
              {money(Math.abs(remaining), b.currency)}
            </strong>
          </div>
          {missing > 0 && (
            <p className="notice compact">
              {t(
                `${missing} activities have incomplete fees. Only available amounts in the trip currency are included.`,
                `${missing} أنشطة رسومها غير مكتملة. يشمل المجموع المبالغ المتوفرة بعملة الرحلة فقط.`,
              )}
            </p>
          )}
          <button className="text-button" onClick={() => show("budget")}>
            {t("Adjust budget", "تعديل الميزانية")} →
          </button>
          {remaining < 0 && (
            <button
              className="button secondary small"
              onClick={() => show("cheaper")}
            >
              {t("Find cheaper options", "ابحث عن خيارات أوفر")}
            </button>
          )}

        </aside>
        <section className="panel daily-itinerary">
          <h2>{t("Daily itinerary", "البرنامج اليومي")}</h2>
          {places.some(p => p.provider === "google") && <small className="attribution">Google Maps</small>}
          <ol className="timeline">
            {plan.days.map((day) => (
              <li key={day.dayNumber}>
                <span className="day-number">{day.dayNumber}</span>
                <div className="day-heading">
                  <div>
                    <span className="eyebrow">
                      {t("DAY ", "اليوم ")}
                      {day.dayNumber}
                    </span>
                    <h3>{date(day.date)}</h3>
                  </div>
                  <button
                    className="text-button small"
                    onClick={() => show({ day })}
                  >
                    {t("Edit day", "تعديل اليوم")}
                  </button>
                </div>
                {!day.items.length && (
                  <p className="muted">
                    {t(
                      "Free time — enjoy the city at your own pace.",
                      "وقت حر — استمتع بالمدينة على إيقاعك.",
                    )}
                  </p>
                )}
                <ul className="day-items">
                  {day.items.map((item, i) => (
                    <li key={item.placeId + "-" + i}>
                      <Icon name="clock" />
                      <div>
                        <span className="activity-time" dir="ltr">
                          {item.startTime}–{item.endTime}
                          {umrahDateNote(plan, day, item, i, t)}
                        </span>
                        <ExternalLink href={item.place.mapsUrl}>
                          {item.place.name ||
                            t(
                              "Place details unavailable",
                              "تفاصيل المكان غير متاحة",
                            )}
                        </ExternalLink>
                        {!item.place.mapsUrl &&
                            (item.place.name || t("Place name temporarily unavailable", "اسم المكان غير متاح مؤقتاً"))}
                        <small>{item.reason?.replace(/Visit fees are unknown\.|رسوم الزيارة غير معروفة\./g, "").trim()}</small>
                        <small>{t("Estimated admission", "سعر الدخول التقديري")} · {admissionLabel(admission(day, item))}</small>
                        <PlaceAttribution place={item.place} />
                      </div>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        </section>
      </div>
      <section className="activities-section">
        <h2>{t("Activities & attractions", "الأنشطة والمعالم")}</h2>
        <div className="activities-grid">
          {places.map((place) => (
            <article className="panel activity-card" key={place.id}>
              <div className="activity-top">
                <span className="round-icon pale">
                  <Icon name="place" />
                </span>
                {place.rating != null && (
                  <small className="rating">
                    <Icon name="star" />
                    {place.rating}
                  </small>
                )}
              </div>
              <h3>
                {place.name ||
                  t("Place details unavailable", "تفاصيل المكان غير متاحة")}
              </h3>
              <p>
                {t("Estimated admission", "سعر الدخول التقديري")} · {admissionLabel(visits.find(visit => visit.item.place === place).fees)}
              </p>
              <PlaceAttribution place={place} />
              <ExternalLink href={place.mapsUrl} className="text-button">
                {t("View on map", "اعرض على الخريطة")}
              </ExternalLink>
            </article>
          ))}
        </div>
      </section>
      <div className="plan-bottom">
        <Link to="/dashboard">{t("Dashboard", "لوحة التحكم")} →</Link>
        <button className="text-button" onClick={() => window.print()}>
          {t("Print / Save PDF", "طباعة / حفظ PDF")}
        </button>
        <button
          className="text-button"
          disabled={busy}
          onClick={async () => {
            const data = await change(
              "/plans/" + id + "/favorite",
              plan.isFavorite ? "DELETE" : "POST",
            );
            if (data) setPlan({ ...plan, isFavorite: data.isFavorite });
          }}
        >
          {plan.isFavorite
            ? t("♥ Favorited", "♥ في المفضّلة")
            : t("♡ Add to favorites", "♡ أضف للمفضّلة")}
        </button>
      </div>
      {modal && (
        <Modal
          wide={modal === "booking" || typeof modal === "object"}
          title={
            typeof modal === "object"
              ? t("Edit day ", "تعديل اليوم ") + modal.day.dayNumber
              : modal === "modify"
                ? t("Modify your journey", "عدّل رحلتك")
                : modal === "booking"
                  ? t(
                      "Continue with travel providers",
                      "المتابعة لدى مزوّدي السفر",
                    )
                  : modal === "budget"
                    ? t("Your trip budget", "ميزانية رحلتك")
                    : t("Regenerate your itinerary", "أعد إنشاء برنامجك")
          }
          onClose={() => !busy && setModal(null)}
        >
          <ErrorMessage error={modalError} />
          {busy && (
            <Loading label={t("Updating your journey…", "جارٍ تحديث رحلتك…")} />
          )}
          <fieldset disabled={busy}>
            {modal === "modify" ? (
              <div className="stack">
                <form
                  className="stack"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const data = await change("/plans/" + id, "PATCH", {
                      title: new FormData(e.currentTarget).get("title"),
                    });
                    if (data) {
                      setPlan({ ...plan, title: data.title });
                      notify(t("Title updated.", "تم تحديث العنوان."));
                    }
                  }}
                >
                  <Field
                    label={t("Plan title", "عنوان الخطة")}
                    name="title"
                    defaultValue={plan.title}
                    required
                    maxLength={200}
                  />
                  <button className="button secondary small">
                    {t("Rename", "تغيير الاسم")}
                  </button>
                </form>
                <Field label={t("Plan version", "نسخة الخطة")}>
                  <select
                    value={id}
                    onChange={(e) => {
                      setModal(null);
                      navigate("/plans/" + e.target.value);
                    }}
                  >
                    {trip?.plans.map((p) => (
                      <option key={p.id} value={p.id}>
                        {t("Version ", "نسخة ") + p.version} — {p.title}
                        {p.isSelected ? t(" · current", " · الحالية") : ""}
                      </option>
                    ))}
                  </select>
                </Field>
                {!plan.isSelected && (
                  <button
                    className="button secondary"
                    onClick={async () => {
                      const data = await change("/plans/" + id, "PATCH", {
                        isSelected: true,
                      });
                      if (data) {
                        setPlan({ ...plan, isSelected: true });
                        setTrip(await api("/trips/" + plan.tripId));
                      }
                    }}
                  >
                    {t("Use this version", "استخدم هذه النسخة")}
                  </button>
                )}
                <p className="muted">
                  {t(
                    "Choose a day below to edit activities. Previous versions stay available.",
                    "اختر يوماً أدناه لتعديل الأنشطة. تبقى النسخ السابقة متاحة.",
                  )}
                </p>
                <div className="chips">
                  {plan.days.map((day) => (
                    <button
                      className="chip"
                      key={day.dayNumber}
                      onClick={() => show({ day })}
                    >
                      {t("Day ", "اليوم ")}
                      {day.dayNumber}
                    </button>
                  ))}
                </div>
                <div className="button-row">
                  <button
                    className="button secondary"
                    onClick={() => show("budget")}
                  >
                    {t("Adjust budget", "تعديل الميزانية")}
                  </button>
                  <Link
                    className="button secondary"
                    to={"/planner?trip=" + plan.tripId}
                  >
                    {t("Edit trip details", "تعديل بيانات الرحلة")}
                  </Link>
                </div>
                <button
                  className="text-button danger"
                  onClick={() => show("delete")}
                >
                  {t("Delete this version", "حذف هذه النسخة")}
                </button>
              </div>
            ) : modal === "delete" ? (
              <div className="stack">
                <p>
                  {t(
                    "Delete this plan version and its favorite? Other versions will be kept.",
                    "هل تريد حذف هذه النسخة ومفضّلتها؟ ستبقى النسخ الأخرى.",
                  )}
                </p>
                <button
                  className="button"
                  onClick={async () => {
                    if (await change("/plans/" + id, "DELETE"))
                      navigate("/trips");
                  }}
                >
                  {t("Delete version", "حذف النسخة")}
                </button>
              </div>
            ) : modal === "budget" ? (
              <BudgetForm
                plan={plan}
                onSubmit={(body) =>
                  change("/plans/" + id + "/budget", "PATCH", body, true)
                }
              />
            ) : modal === "booking" ? (
              <div className="stack">

                {plan.mode === "mock" && (
                  <p className="notice">
                    {t(...warnings.DEVELOPMENT_FIXTURES)}
                  </p>
                )}
                <BookingSummary offer={plan.flight} kind="flight" />
                <BookingSummary offer={plan.hotel} kind="hotel" planId={plan.id} />
              </div>
            ) : typeof modal === "object" ? (
              <DayEditor
                plan={plan}
                catalog={catalog?.id === plan.id ? catalog : null}
                onRetry={() => setRetryCount(n => n + 1)}
                day={modal.day}
                onSave={(body) =>
                  change(
                    `/plans/${id}/days/${modal.day.dayNumber}`,
                    "PATCH",
                    body,
                    true,
                  )
                }
                onRegenerate={(body) =>
                  change(
                    `/plans/${id}/days/${modal.day.dayNumber}/regenerate`,
                    "POST",
                    body,
                    true,
                  )
                }
              />
            ) : (
              <RegenerateForm
                plan={plan}
                cheaper={modal === "cheaper"}
                onSubmit={(body) =>
                  change("/plans/" + id + "/regenerate", "POST", body, true)
                }
              />
            )}
          </fieldset>
        </Modal>
      )}
    </section>
  );
}
function BookingSummary({ offer, kind, planId }) {
  const { t, money, language } = useApp();
  return (
    <article className="panel stack">
      <h3 className={kind === "flight" ? "airline-heading" : undefined}>
        {kind === "flight" && <AirlineLogo offer={offer} />}
        {kind === "flight"
          ? localizedAirlineName(offer, language)
          : t(offer.name, offer.nameAr || offer.name)}
      </h3>
      <strong>{money(offer.price, offer.currency)}</strong>
      {offer.conversion && <p className="notice compact">
        {t("Estimated conversion. Original fare: ", "تحويل تقديري. السعر الأصلي: ")}
        {money(offer.originalPrice, offer.originalCurrency)} · {offer.conversion.updatedAt.slice(0, 10)} ·
        <a href="https://www.exchangerate-api.com" target="_blank" rel="noreferrer">ExchangeRate-API</a>
      </p>}
      <p>
        {kind === "flight"
          ? t("Round trip · all travelers", "ذهاب وعودة · جميع المسافرين")
          : t(
              "Full stay · all quoted rooms",
              "كامل الإقامة · كل الغرف في العرض",
            )}
      </p>
      {kind === "hotel" && offer.provider === "serpapi" && <small>{t("Via SerpAPI", "عبر SerpAPI")}</small>}
      {kind === "hotel" && <HotelPriceNote offer={offer} />}
      {kind === "flight" ? <FlightBookingLink key={offer.id} className="button" offer={offer}>
        {t("Search flights with provider", "ابحث عن الطيران لدى المزوّد")}
      </FlightBookingLink> : <HotelBookingLink key={offer.id} className="button" offer={offer} planId={planId} />}
    </article>
  );
}
function BudgetForm({ plan, onSubmit }) {
  const { t } = useApp();
  return (
    <form
      className="stack"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(Object.fromEntries(new FormData(e.currentTarget)));
      }}
    >
      <p className="muted">
        {t("Amounts stay in ", "تظل المبالغ بعملة ")}
        {plan.budget.currency}
        {t(
          ". This creates a new plan version.",
          "، ويُنشئ هذا نسخة جديدة للخطة.",
        )}
      </p>
      {[
        [
          "totalBudget",
          "Total budget",
          "الميزانية الإجمالية",
          plan.budget.totalBudget,
        ],
        [
          "foodDaily",
          "Food per traveler / day",
          "الطعام لكل مسافر / يوم",
          plan.input.preferences.foodDaily,
        ],
        [
          "transportDaily",
          "Transport per group / day",
          "التنقل للمجموعة / يوم",
          plan.input.preferences.transportDaily,
        ],
        [
          "otherCosts",
          "Other trip costs",
          "مصاريف أخرى للرحلة",
          plan.input.preferences.otherCosts,
        ],
      ].map(([key, en, ar, value]) => (
        <Field
          key={key}
          name={key}
          label={t(en, ar)}
          defaultValue={value}
          type="number"
          min={key === "totalBudget" ? "0.01" : "0"}
          max="99999999"
          step="0.01"
          required
        />
      ))}
      <button className="button">
        {t("Save new version", "حفظ نسخة جديدة")}
      </button>
    </form>
  );
}
function RegenerateForm({ plan, onSubmit, cheaper = false, day = false }) {
  const { t } = useApp();
  return (
    <form
      className="stack"
      onSubmit={(e) => {
        e.preventDefault();
        const form = new FormData(e.currentTarget),
          body = {
            pace: form.get("pace"),
          };
        if (form.get("interest")) body.interest = form.get("interest");
        if (!day) body.cheaper = form.has("cheaper");
        onSubmit(body);
      }}
    >
      <p className="muted">
        {t(
          "Your current version will be preserved.",
          "سيتم الاحتفاظ بنسختك الحالية.",
        )}
      </p>
      <Field label={t("Travel pace", "إيقاع الرحلة")}>
        <select name="pace" defaultValue={plan.input.preferences.pace}>
          <option value="relaxed">{t("Relaxed", "هادئ")}</option>
          <option value="balanced">{t("Balanced", "متوازن")}</option>
          <option value="busy">{t("Busy", "مكثّف")}</option>
        </select>
      </Field>
      <Field label={t("Focus on an interest", "التركيز على اهتمام")}>
        <select name="interest" defaultValue="">
          <option value="">{t("Keep my interests", "احتفظ باهتماماتي")}</option>
          {Object.entries(interests).filter(([key]) => key !== "oldDamascus" || plan.input.destinationCode === "DAM").map(([key, names]) => (
            <option key={key} value={key}>
              {t(...names)}
            </option>
          ))}
        </select>
      </Field>
      {!day && (
        <label className="check-field">
          <input type="checkbox" name="cheaper" defaultChecked={cheaper} />
          {t(
            "Prefer cheaper flight and hotel offers",
            "أفضل عروض الطيران والفنادق الأقل تكلفة",
          )}
        </label>
      )}
      <button className="button">
        {t("Create new version", "إنشاء نسخة جديدة")}
      </button>
    </form>
  );
}
function DayEditor({ plan, day, catalog, onRetry, onSave, onRegenerate }) {
  const { t } = useApp();
  const window = dailyWindows(plan.input, plan.flight, day.dayNumber)[0];
  const [tab, setTab] = useState("edit"),
    [items, setItems] = useState(day.items.map(({ place, ...item }) => item));
  const places = catalog?.places;
  const nextSlot = nextActivitySlot(window, items);
  function update(i, key, value) {
    setItems((old) =>
      old.map((item, index) =>
        index === i ? { ...item, [key]: value } : item,
      ),
    );
  }
  return (
    <div className="stack">
      <div className="chips">
        <button
          className={"chip " + (tab === "edit" ? "selected" : "")}
          onClick={() => setTab("edit")}
        >
          {t("Edit activities", "تعديل الأنشطة")}
        </button>
        <button
          className={"chip " + (tab === "regenerate" ? "selected" : "")}
          onClick={() => setTab("regenerate")}
        >
          {t("Regenerate day", "إعادة إنشاء اليوم")}
        </button>
      </div>
      {tab === "regenerate" ? (
        <RegenerateForm plan={plan} day onSubmit={onRegenerate} />
      ) : (
        <form
          className="stack"
          onSubmit={(e) => {
            e.preventDefault();
            onSave({ dayNumber: day.dayNumber, date: day.date, items });
          }}
        >
          <ErrorMessage error={catalog?.error} />
          {catalog?.error ? <button type="button" className="button secondary" onClick={onRetry}>{t("Retry loading places", "إعادة تحميل الأماكن")}</button>
            : !places && <p role="status">{t("Loading place options…", "جارٍ تحميل خيارات الأماكن…")}</p>}
          <p className="notice">
            {!window.canVisit && t("No sightseeing time is available on this day because of flight times. You can remove activities or choose another day.", "لا يوجد وقت متاح للزيارات بهذا اليوم بسبب مواعيد الطيران. فيك تحذف الأنشطة أو تختار يوماً آخر.")}
            {" "}{t("Allow 2 hours after arrival and 3 hours before the return flight.", "نترك ساعتين بعد الوصول وثلاث ساعات قبل رحلة العودة.")}
          </p>
          <p className="muted">
            {t(
              "All other days stay unchanged. Allow at least 30 minutes between activities; flight buffers and opening hours are checked when you save.",
              "تبقى الأيام الأخرى دون تغيير. اترك ٣٠ دقيقة على الأقل بين الأنشطة؛ تُفحص أوقات الطيران وساعات العمل عند الحفظ.",
            )}
          </p>
          {items.map((item, i) => (
            <div className="day-editor-row" key={i}>
              <Field label={t("Place", "المكان")}>
                <select
                  value={item.placeId}
                  disabled={!places}
                  onChange={(e) => update(i, "placeId", e.target.value)}
                  required
                >
                  {[
                    ...new Map(
                      [
                        ...(places || []),
                        ...day.items.map((it) => it.place),
                      ].map((p) => [p.id, p]),
                    ).values(),
                  ].map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name || p.id}
                    </option>
                  ))}
                </select>
              </Field>
              {plan.input.destinationCode === "QCA" && day.dayNumber === 1 && i === 0 && item.startTime === umrahSlot(plan.input, plan.flight).startTime && item.endTime === umrahSlot(plan.input, plan.flight).endTime ? <p><bdi>{item.startTime}–{item.endTime}</bdi>{umrahDateNote(plan, day, item, i, t)}</p> : <div className="form-grid">
                <Field
                  label={t("Start time", "وقت البدء")}
                  type="time"
                  value={item.startTime}
                  min={window.startTime}
                  max={item.endTime < window.endTime ? item.endTime : window.endTime}
                  required
                  onChange={(e) => update(i, "startTime", e.target.value)}
                />
                <Field
                  label={t("End time", "وقت الانتهاء")}
                  type="time"
                  value={item.endTime}
                  min={item.startTime > window.startTime ? item.startTime : window.startTime}
                  max={window.endTime}
                  required
                  onChange={(e) => update(i, "endTime", e.target.value)}
                />
              </div>}
              <Field
                label={t("Note", "ملاحظة")}
                value={item.reason}
                maxLength={1000}
                onChange={(e) => update(i, "reason", e.target.value)}
              />
              <button
                className="text-button danger"
                type="button"
                onClick={() =>
                  setItems(items.filter((_, index) => index !== i))
                }
              >
                {t("Remove activity", "حذف النشاط")}
              </button>
            </div>
          ))}
          <button
            type="button"
            className="button secondary"
            disabled={!places?.length || items.length >= 8 || !nextSlot || !places.some((p) => !items.some((item) => item.placeId === p.id))}
            onClick={() => {
              const p = places.find(
                (p) => !items.some((i) => i.placeId === p.id),
              );
              if (p && nextSlot)
                setItems([
                  ...items,
                  {
                    placeId: p.id,
                    ...nextSlot,
                    reason: "",
                  },
                ]);
            }}
          >
            {t("+ Add activity", "+ إضافة نشاط")}
          </button>
          <button className="button">
            {t("Save day as new version", "حفظ اليوم في نسخة جديدة")}
          </button>
        </form>
      )}
    </div>
  );
}

