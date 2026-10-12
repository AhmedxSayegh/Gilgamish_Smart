import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, mutation } from "../lib/api";
import { assets, cityFor } from "../lib/assets";
import { useApp } from "../lib/context";
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
function PlaceAttribution({ place }) {
  const { t } = useApp();
  return (
    <>
      {place.provider === "google" && (
        <small className="attribution">Google Maps</small>
      )}
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
          <span className="eyebrow">
            {t("Your AI itinerary", "برنامج رحلتك الذكي")}
          </span>
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
            <br />
            {t(
              "A journey crafted around your interests, pace, and budget.",
              "رحلة مصمّمة وفق اهتماماتك وإيقاعك وميزانيتك.",
            )}
          </p>
        </div>
      </div>
      <div className="plan-actions">
        <button
          className="button secondary"
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
          <Icon name="save" />
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
      <div className="plan-columns">
        <aside className="panel plan-budget">
          <p className="summary-label">
            <Icon name="overview" />
            {t("Estimated cost", "التكلفة التقديرية")}
          </p>
          <div className="cost-total">{money(b.totalCost, b.currency)}</div>
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
                    {item.sourceType === "user_allowance"
                      ? t("Your allowance", "مخصصاتك")
                      : item.sourceType === "partial_known_costs"
                        ? t("Known fees only", "الرسوم المعروفة فقط")
                        : item.sourceType === "development_fixture"
                          ? t("Sample price", "سعر تجريبي")
                          : t("Search quote", "سعر البحث")}
                  </small>
                </dt>
                <dd>{money(item.amount, b.currency)}</dd>
              </div>
            ))}
          </dl>
          <div className="budget-remaining">
            <span>{t("Budget", "الميزانية")}</span>
            <strong>{money(b.totalBudget, b.currency)}</strong>
            <span>
              {b.overBudget
                ? t("Over budget", "تجاوز الميزانية")
                : t("Remaining", "المتبقي")}
            </span>
            <strong className={b.overBudget ? "danger" : ""}>
              {money(Math.abs(Number(b.remainingBudget)), b.currency)}
            </strong>
          </div>
          {!b.isComplete && (
            <p className="notice compact">
              {t(
                `${b.unknownActivityCount} activity fees are unknown. This total is incomplete.`,
                `${b.unknownActivityCount} رسوم أنشطة غير معروفة. هذا المجموع غير مكتمل.`,
              )}
            </p>
          )}
          <button className="text-button" onClick={() => show("budget")}>
            {t("Adjust budget", "تعديل الميزانية")} →
          </button>
          {b.overBudget && (
            <button
              className="button secondary small"
              onClick={() => show("cheaper")}
            >
              {t("Find cheaper options", "ابحث عن خيارات أوفر")}
            </button>
          )}
          <details className="plan-notes" open={plan.mode === "mock"}>
            <summary>
              {t("Sources & travel notes", "المصادر وملاحظات السفر")}
            </summary>
            {[
              ...new Set([
                ...(plan.mode === "mock" ? ["DEVELOPMENT_FIXTURES"] : []),
                ...plan.warnings,
              ]),
            ].map((code) => (
              <p key={code}>
                {t(
                  ...(warnings[typeof code === "string" ? code : code.code] || [
                    String(code),
                    String(code),
                  ]),
                )}
              </p>
            ))}
          </details>
        </aside>
        <section className="panel daily-itinerary">
          <h2>{t("Daily itinerary", "البرنامج اليومي")}</h2>
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
                        </span>
                        <ExternalLink href={item.place.mapsUrl}>
                          {item.place.name ||
                            t(
                              "Place details unavailable",
                              "تفاصيل المكان غير متاحة",
                            )}
                        </ExternalLink>
                        {!item.place.mapsUrl &&
                          (item.place.name || item.placeId)}
                        <small>{item.reason}</small>
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
                {place.estimatedCost == null
                  ? t("Fee unknown", "الرسوم غير معروفة")
                  : money(place.estimatedCost, place.currency)}{" "}
                · {t("per person", "لكل مسافر")}
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
                <p className="notice">
                  {t(
                    "These links open provider searches. Recheck dates, travelers, final prices and availability before booking. No reservation or payment is made here.",
                    "تفتح الروابط بحثاً لدى المزوّد. راجع التواريخ والمسافرين والأسعار النهائية والتوفّر قبل الحجز. لا نجري حجزاً أو دفعاً هنا.",
                  )}
                </p>
                {plan.mode === "mock" && (
                  <p className="notice">
                    {t(...warnings.DEVELOPMENT_FIXTURES)}
                  </p>
                )}
                <BookingSummary offer={plan.flight} kind="flight" />
                <BookingSummary offer={plan.hotel} kind="hotel" />
              </div>
            ) : typeof modal === "object" ? (
              <DayEditor
                plan={plan}
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
function BookingSummary({ offer, kind }) {
  const { t, money } = useApp();
  return (
    <article className="panel stack">
      <h3>
        {kind === "flight"
          ? offer.airlineName || offer.airlineCode
          : offer.name}
      </h3>
      <strong>{money(offer.price, offer.currency)}</strong>
      <p>
        {kind === "flight"
          ? t("Round trip · all travelers", "ذهاب وعودة · جميع المسافرين")
          : t(
              "Full stay · all quoted rooms",
              "كامل الإقامة · كل الغرف في العرض",
            )}
      </p>
      <small>
        {t("Quoted at: ", "وقت عرض السعر: ")}
        {new Date(offer.observedAt).toLocaleString()}
      </small>
      <ExternalLink className="button" href={offer.bookingUrl}>
        {kind === "flight"
          ? t("Search flights with provider", "ابحث عن الطيران لدى المزوّد")
          : t("Search hotels with provider", "ابحث عن الفنادق لدى المزوّد")}
      </ExternalLink>
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
            instruction: form.get("instruction") || "",
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
          {Object.entries(interests).map(([key, names]) => (
            <option key={key} value={key}>
              {t(...names)}
            </option>
          ))}
        </select>
      </Field>
      <Field
        label={t("Additional guidance", "توجيهات إضافية")}
        hint={
          plan.mode === "mock"
            ? t(
                "Development mode uses the structured controls; free-text interpretation requires live AI.",
                "يستخدم الوضع التجريبي الخيارات المنظّمة؛ فهم النص الحر يتطلّب خدمة ذكاء اصطناعي مباشرة.",
              )
            : null
        }
      >
        <textarea name="instruction" rows={3} maxLength={1000} />
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
function DayEditor({ plan, day, onSave, onRegenerate }) {
  const { t } = useApp();
  const [tab, setTab] = useState("edit"),
    [items, setItems] = useState(day.items.map(({ place, ...item }) => item)),
    [places, setPlaces] = useState(null),
    [error, setError] = useState(null);
  useEffect(() => {
    api("/places/search?tripId=" + plan.tripId)
      .then((data) => setPlaces(data.places))
      .catch(setError);
  }, [plan.tripId]);
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
          <ErrorMessage error={error} />
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
              <div className="form-grid">
                <Field
                  label={t("Start time", "وقت البدء")}
                  type="time"
                  value={item.startTime}
                  required
                  onChange={(e) => update(i, "startTime", e.target.value)}
                />
                <Field
                  label={t("End time", "وقت الانتهاء")}
                  type="time"
                  value={item.endTime}
                  required
                  onChange={(e) => update(i, "endTime", e.target.value)}
                />
              </div>
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
            disabled={!places?.length || items.length >= 8}
            onClick={() => {
              const p = places.find(
                (p) => !items.some((i) => i.placeId === p.id),
              );
              if (p)
                setItems([
                  ...items,
                  {
                    placeId: p.id,
                    startTime: "10:00",
                    endTime: "11:30",
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
