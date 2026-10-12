import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, mutation } from "../lib/api";
import { assets, cityFor } from "../lib/assets";
import { useApp } from "../lib/context";
import {
  Loading,
  ErrorMessage,
  Empty,
  Icon,
  Modal,
  ModeNotice,
} from "../components/UI";
export function FAQ() {
  const { t } = useApp();
  const qs = [
    [
      "How does the AI plan trips?",
      "كيف يخطّط الذكاء الاصطناعي الرحلات؟",
      "It combines your preferences and budget with provider results, then checks the daily schedule. Development mode uses sample data.",
      "يجمع تفضيلاتك وميزانيتك مع نتائج المزوّدين ثم يتحقّق من الجدول اليومي. يستخدم الوضع التجريبي بيانات اختبار.",
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
  return (
    <div className="faq">
      {qs.map((q, i) => (
        <details key={q[0]} open={i === 0 ? true : undefined}>
          <summary>
            {t(q[0], q[1])}
            <span className="closed-icon">
              <Icon name="chevronDown" />
            </span>
            <span className="opened-icon">
              <Icon name="chevronUp" />
            </span>
          </summary>
          <p>{t(q[2], q[3])}</p>
        </details>
      ))}
    </div>
  );
}
export function Dashboard({ allTrips = false }) {
  const { t, user, money, date, mode, notify } = useApp();
  const [trips, setTrips] = useState(null),
    [favorites, setFavorites] = useState([]),
    [selected, setSelected] = useState(null),
    [error, setError] = useState(null),
    [confirm, setConfirm] = useState(null),
    [busy, setBusy] = useState(false);
  async function load() {
    setError(null);
    try {
      const [ts, fs] = await Promise.all([api("/trips"), api("/favorites")]);
      setTrips(ts);
      setFavorites(fs);
      const latest = ts.flatMap((tr) => tr.plans).find((p) => p.isSelected);
      setSelected(latest ? await api("/plans/" + latest.id) : null);
    } catch (err) {
      setError(err);
    }
  }
  useEffect(() => {
    load();
  }, []);
  if (!trips)
    return (
      <div className="container page-space">
        <ErrorMessage error={error} />
        {error ? (
          <button className="button" onClick={load}>
            {t("Retry", "إعادة المحاولة")}
          </button>
        ) : (
          <Loading />
        )}
      </div>
    );
  const saved = trips.flatMap((tr) => {
      const p = tr.plans.find((p) => p.isSelected) || tr.plans[0];
      return p?.isSaved ? [{ ...p, trip: tr }] : [];
    }),
    b = selected?.budget;
  async function removeFavorite(id) {
    try {
      await mutation("/plans/" + id + "/favorite", "DELETE");
      setFavorites(favorites.filter((p) => p.id !== id));
    } catch (err) {
      setError(err);
    }
  }
  return (
    <section className="container dashboard-page">
      <div className="dashboard-heading">
        <div>
          <span className="eyebrow">GILGAMISH</span>
          <h1>
            {allTrips
              ? t("My trips", "رحلاتي")
              : t("Welcome back, ", "مرحباً بعودتك، ")}
            {!allTrips && <em>{user.name.split(" ")[0]}</em>}
          </h1>
        </div>
        <Link className="button small" to="/planner">
          + {t("Trip Planner", "خطّط رحلتك")}
        </Link>
      </div>
      {allTrips ? (
        <>
          <ModeNotice mode={mode} />
          <ErrorMessage error={error} />
          <div className="trip-list">
            {trips.map((tr) => (
              <article className="panel trip-row" key={tr.id}>
                <div>
                  <h3>{tr.destination}</h3>
                  <p>
                    {date(tr.startDate)} — {date(tr.endDate)}
                  </p>
                  <small>
                    {tr.origin} → {tr.destination} ·{" "}
                    {money(tr.totalBudget, tr.currency)} · {tr.plans.length}{" "}
                    {t("versions", "نسخ")}
                  </small>
                </div>
                <div className="button-row">
                  <Link
                    className="button secondary small"
                    to={"/planner?trip=" + tr.id}
                  >
                    {t("Edit trip", "تعديل الرحلة")}
                  </Link>
                  {tr.plans.length > 0 && (
                    <Link
                      className="button small"
                      to={
                        "/plans/" +
                        (tr.plans.find((p) => p.isSelected) || tr.plans[0]).id
                      }
                    >
                      {t("View plan", "عرض الخطة")}
                    </Link>
                  )}
                  <button
                    className="text-button danger"
                    onClick={() => setConfirm(tr)}
                  >
                    {t("Delete", "حذف")}
                  </button>
                </div>
              </article>
            ))}
          </div>
          {!trips.length && (
            <Empty
              title={t(
                "Your next story starts here",
                "حكايتك القادمة تبدأ هنا",
              )}
            >
              <Link to="/planner" className="button">
                {t("Plan a trip", "خطّط رحلة")}
              </Link>
            </Empty>
          )}
        </>
      ) : (
        <>
          <ErrorMessage error={error} />
          <div className="summary-grid">
            <article className="panel budget-overview">
              <p className="summary-label">
                <Icon name="overview" />
                {t("Budget overview", "نظرة على الميزانية")}
              </p>
              {b ? (
                <>
                  <div className="budget-amount">
                    {money(b.totalCost, b.currency)}{" "}
                    <small>/ {money(b.totalBudget, b.currency)}</small>
                  </div>
                  <progress
                    max={Math.max(1, Number(b.totalBudget))}
                    value={Math.max(0, Number(b.totalCost))}
                    aria-label={t("Budget used", "الميزانية المستخدمة")}
                  />
                  <div className="budget-caption">
                    <span>
                      {t("Estimated: ", "التقدير: ")}
                      {money(b.totalCost, b.currency)}
                    </span>
                    <span>
                      {t("Remaining: ", "المتبقي: ")}
                      {money(b.remainingBudget, b.currency)}
                    </span>
                  </div>
                  <small className="muted">
                    {t(
                      "Latest selected plan · travel estimate, not spending",
                      "آخر خطة مختارة · تقدير للسفر وليس إنفاقاً فعلياً",
                    )}
                  </small>
                </>
              ) : (
                <>
                  <div className="budget-amount">—</div>
                  <progress max="100" value="0" />
                  <p className="muted">
                    {t(
                      "Create a plan to see your budget.",
                      "أنشئ خطة لعرض ميزانيتك.",
                    )}
                  </p>
                </>
              )}
            </article>
            <article className="panel saved-count">
              <p className="summary-label">
                <Icon name="savedCount" />
                {t("Saved trips", "الرحلات المحفوظة")}
              </p>
              <strong>{saved.length}</strong>
              <p>{t("trips", "رحلات")}</p>
            </article>
          </div>
          <div className="section-heading">
            <h2>{t("Saved trips", "الرحلات المحفوظة")}</h2>
            <Link to="/trips" className="text-button">
              {t("All trips", "كل الرحلات")} →
            </Link>
          </div>
          <div className="saved-grid">
            {saved.slice(0, 6).map((p) => {
              const city = cityFor(p.trip.destinationCode);
              return (
                <article className="city-image saved-trip" key={p.id}>
                  <img src={city?.dashboard || assets.hero} alt="" />
                  <div className="image-shade" />
                  <Link className="city-caption" to={"/plans/" + p.id}>
                    <h3>{city ? t(city.name, city.ar) : p.trip.destination}</h3>
                    <p>
                      {city
                        ? t(city.country, city.countryAr)
                        : p.trip.destinationCode}
                    </p>
                  </Link>
                  <button
                    className="saved-toggle"
                    aria-label={t("Unsave ", "إلغاء حفظ ") + p.title}
                    onClick={async () => {
                      try {
                        await mutation("/plans/" + p.id, "PATCH", {
                          isSaved: false,
                        });
                        await load();
                      } catch (err) {
                        setError(err);
                      }
                    }}
                  >
                    <Icon name="bookmark" />
                  </button>
                </article>
              );
            })}
            {!saved.length && (
              <Empty
                title={t(
                  "Your saved journeys will appear here",
                  "ستظهر رحلاتك المحفوظة هنا",
                )}
              >
                <p>
                  {t(
                    "Save a generated plan to keep it close.",
                    "احفظ خطتك لتعود إليها بسهولة.",
                  )}
                </p>
                <Link to="/planner" className="text-button">
                  {t("Plan your first trip", "خطّط رحلتك الأولى")} →
                </Link>
              </Empty>
            )}
          </div>
          <div className="section-heading">
            <h2>{t("Favorites", "المفضّلة")}</h2>
          </div>
          <div className="favorites-grid">
            {favorites.map((p) => {
              const city = cityFor(p.input.destinationCode);
              return (
                <article className="favorite-card" key={p.id}>
                  <img src={city?.dashboard || assets.hero} alt="" />
                  <Link to={"/plans/" + p.id}>
                    <h3>
                      {city ? t(city.name, city.ar) : p.input.destination}
                    </h3>
                    <p>
                      {city
                        ? t(city.country, city.countryAr)
                        : t("Version ", "نسخة ") + p.version}
                    </p>
                  </Link>
                  <button
                    className="plain-icon"
                    onClick={() => removeFavorite(p.id)}
                    aria-label={
                      t("Remove favorite ", "إزالة من المفضّلة ") + p.title
                    }
                  >
                    <Icon name="heart" />
                  </button>
                </article>
              );
            })}
            {!favorites.length && (
              <p className="muted favorite-empty">
                {t(
                  "Mark a plan as a favorite to find it here.",
                  "أضف خطة إلى المفضّلة لتجدها هنا.",
                )}
              </p>
            )}
          </div>
          <div className="section-heading">
            <h2>{t("FAQ & Support", "الأسئلة الشائعة والدعم")}</h2>
          </div>
          <FAQ />
        </>
      )}
      {confirm && (
        <Modal
          title={t("Delete this trip?", "حذف هذه الرحلة؟")}
          onClose={() => !busy && setConfirm(null)}
        >
          <p>
            {t(
              "This removes the trip, all its plan versions, and its favorites.",
              "سيحذف هذا الرحلة وجميع نسخ خططها ومفضّلاتها.",
            )}
          </p>
          <ErrorMessage error={error} />
          <div className="button-row">
            <button
              className="button secondary"
              onClick={() => setConfirm(null)}
              disabled={busy}
            >
              {t("Cancel", "إلغاء")}
            </button>
            <button
              className="button"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await mutation("/trips/" + confirm.id, "DELETE");
                  setConfirm(null);
                  await load();
                  notify(t("Trip deleted.", "تم حذف الرحلة."));
                } catch (err) {
                  setError(err);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {t("Delete trip", "حذف الرحلة")}
            </button>
          </div>
        </Modal>
      )}
    </section>
  );
}
