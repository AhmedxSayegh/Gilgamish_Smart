import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { assets, cities } from "../lib/assets";
import { useApp } from "../lib/context";
import { mutation } from "../lib/api";
import { Icon, Field, Modal, ErrorMessage } from "../components/UI";
const featureIcons = ["ai", "heritage", "wallet", "bilingual"];
export function Home() {
  const { t } = useApp(),
    navigate = useNavigate();
  const [destination, setDestination] = useState(""),
    [budget, setBudget] = useState(""),
    [date, setDate] = useState("");
  const features = [
    [
      "AI Itinerary",
      "برنامج ذكي",
      "Day-by-day plans tuned to your taste, pace, and budget.",
      "خطط يومية تناسب اهتماماتك وإيقاعك وميزانيتك.",
    ],
    [
      "Heritage First",
      "التراث أولاً",
      "Authentic experiences in historic cities, vetted by locals.",
      "تجارب أصيلة في مدن تاريخية بروح أهلها.",
    ],
    [
      "Smart Budgeting",
      "ميزانية ذكية",
      "Real-time cost estimates with transparent breakdowns.",
      "تقديرات للتكاليف مع تفاصيل واضحة للميزانية.",
    ],
    [
      "Bilingual",
      "بلغتين",
      "Designed natively for Arabic and English travelers.",
      "مصمّم للمسافرين بالعربية والإنجليزية.",
    ],
  ];
  const cityLink = (c) => "/planner?destination=" + encodeURIComponent(c.name);
  return (
    <>
      <section className="home-hero">
        <img className="hero-image" src={assets.hero} alt="" />
        <div className="hero-wash" />
        <div className="container hero-content">
          <div className="hero-copy">
            <span className="pill">
              <Icon name="sparkle" />
              {t("Smart travel planning", "تخطيط سفر ذكي")}
            </span>
            <h1>
              {t(
                <>
                  From planning to
                  <br />
                  booking,
                </>,
                <>
                  من التخطيط إلى
                  <br />
                  الحجز،
                </>,
              )}
              <em>
                {t(
                  <>
                    your journey starts
                    <br />
                    here
                  </>,
                  <>
                    رحلتك تبدأ
                    <br />
                    هنا
                  </>,
                )}
              </em>
            </h1>
            <p>
              {t(
                "Discover destinations, generate personalized itineraries, manage your budget, and book your trip — all in one intelligent platform.",
                "اكتشف الوجهات وأنشئ برامج مخصّصة وأدر ميزانيتك وانتقل لحجز رحلتك — كل ذلك في منصة ذكية واحدة.",
              )}
            </p>
            <div className="hero-buttons">
              <Link to="/planner" className="button">
                {t("Plan my trip", "خطّط رحلتي")}
                <Icon name="arrow" />
              </Link>
              <a className="button secondary translucent" href="#destinations">
                {t("Explore destinations", "استكشف الوجهات")}
              </a>
            </div>
          </div>
          <form
            className="quick-plan"
            onSubmit={(e) => {
              e.preventDefault();
              navigate(
                "/planner?" +
                  new URLSearchParams({
                    destination,
                    budget,
                    startDate: date,
                    currency: "USD",
                  }),
              );
            }}
          >
            <Field label={t("Destination", "الوجهة")}>
              <div className="input-icon">
                <Icon name="location" />
                <input
                  aria-label={t("Destination", "الوجهة")}
                  placeholder={t("Where to?", "إلى أين؟")}
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                />
              </div>
            </Field>
            <Field label={t("Budget (USD)", "الميزانية (USD)")}>
              <div className="input-icon">
                <Icon name="budget" />
                <input
                  aria-label={t("Budget (USD)", "الميزانية (USD)")}
                  type="number"
                  min="1"
                  max="99999999"
                  step="0.01"
                  placeholder={t("e.g. 2000", "مثلاً ٢٠٠٠")}
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                />
              </div>
            </Field>
            <Field label={t("Travel dates", "تواريخ السفر")}>
              <div className="input-icon">
                <Icon name="calendar" />
                <input
                  aria-label={t("Travel dates", "تواريخ السفر")}
                  type={date ? "date" : "text"}
                  placeholder={t("Pick dates", "اختر التواريخ")}
                  onFocus={(e) => (e.target.type = "date")}
                  onBlur={(e) => {
                    if (!date) e.target.type = "text";
                  }}
                  min={new Date().toISOString().slice(0, 10)}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
            </Field>
            <button className="button">
              <Icon name="generate" />
              {t("Generate plan", "أنشئ الخطة")}
            </button>
          </form>
        </div>
      </section>
      <section className="container home-features">
        <div className="section-intro">
          <h2>
            {t(
              <>
                An intelligent companion for
                <br />
                every traveler
              </>,
              <>
                رفيق ذكي
                <br />
                لكل مسافر
              </>,
            )}
          </h2>
          <p>{t("Smart travel planning", "تخطيط سفر ذكي")}</p>
        </div>
        <div className="feature-grid">
          {features.map((f, i) => (
            <article className="feature-card" key={f[0]}>
              <span className="feature-icon">
                <Icon name={featureIcons[i]} />
              </span>
              <h3>{t(f[0], f[1])}</h3>
              <p>{t(f[2], f[3])}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="container destinations" id="destinations">
        <div className="section-intro">
          <span className="eyebrow">{t("Destinations", "الوجهات")}</span>
          <h2>{t("Where stories live", "حيث تعيش الحكايات")}</h2>
          <p>
            {t(
              "From ancient capitals to modern wonders.",
              "من العواصم العريقة إلى عجائب العصر.",
            )}
          </p>
        </div>
        <div className="destination-feature">
          <article className="city-image featured">
            <img
              src={assets.damascus}
              alt={t("Old Damascus", "دمشق القديمة")}
              loading="lazy"
            />
            <div className="image-shade" />
            <span className="featured-label">
              {t("⭐ Featured", "⭐ وجهة مميّزة")}
            </span>
            <div className="city-caption">
              <h3>{t("Damascus", "دمشق")}</h3>
              <p>
                {t(
                  "Explore one of the oldest cities in the world, rich in history, culture, traditional markets, and authentic food.",
                  "استكشف واحدة من أقدم مدن العالم، الغنية بالتاريخ والثقافة والأسواق التقليدية والطعام الأصيل.",
                )}
              </p>
              <Link className="button cream small" to={cityLink(cities[0])}>
                {t("Explore", "استكشف")}
                <Icon name="arrowBrown" />
              </Link>
            </div>
          </article>
          <div className="damascus-grid">
            {[
              [assets.damascus, "Old Damascus", "دمشق القديمة"],
              [assets.mosque, "Umayyad Mosque", "الجامع الأموي"],
              [assets.souks, "Traditional Souks", "الأسواق التقليدية"],
              [assets.food, "Syrian Food", "الطعام السوري"],
            ].map(([image, en, ar]) => (
              <Link
                to={cityLink(cities[0])}
                className="city-image small-city"
                key={en}
              >
                <img src={image} alt="" loading="lazy" />
                <div className="image-shade" />
                <h3>{t(en, ar)}</h3>
              </Link>
            ))}
          </div>
        </div>
        <div className="destination-grid">
          {cities.slice(1).map((c) => (
            <Link className="city-image" to={cityLink(c)} key={c.code}>
              <img src={c.image} alt="" loading="lazy" />
              <div className="image-shade" />
              <div className="city-caption">
                <p>{t(c.country, c.countryAr)}</p>
                <h3>{t(c.name, c.ar)}</h3>
              </div>
            </Link>
          ))}
        </div>
      </section>
      <div className="container">
        <section className="home-cta">
          <h2>{t("Smarter journeys start here", "رحلات أذكى تبدأ هنا")}</h2>
          <p>
            {t(
              "Let Gilgamish Smart design your next escape.",
              "دع جلجامش سمارت يصمّم رحلتك القادمة.",
            )}
          </p>
          <Link className="button cream" to="/register">
            {t("Start planning free", "ابدأ التخطيط مجاناً")}
            <Icon name="arrowBrown" />
          </Link>
        </section>
      </div>
    </>
  );
}
export function About() {
  const { t } = useApp();
  const features = [
    [
      "Intelligent",
      "ذكي",
      "AI itineraries crafted around your taste, pace, and budget.",
      "برامج ذكية مصمّمة حسب ذوقك وإيقاعك وميزانيتك.",
    ],
    [
      "Integrated",
      "متكامل",
      "Plan, organize, and access all travel services — including destinations, itineraries, and bookings — in one platform.",
      "خطّط ونظّم واستكشف الوجهات والبرامج وروابط الحجز في منصة واحدة.",
    ],
    [
      "Budget-Aware",
      "يراعي ميزانيتك",
      "Accurate cost estimation and structured budget management for better financial planning.",
      "تقدير للتكاليف وإدارة منظّمة للميزانية لتخطيط مالي أفضل.",
    ],
    [
      "Bilingual",
      "بلغتين",
      "Designed natively for Arabic and English travelers alike.",
      "مصمّم للمسافرين بالعربية والإنجليزية على حد سواء.",
    ],
  ];
  return (
    <section className="about-page narrow-container">
      <span className="pill">{t("About us", "من نحن")}</span>
      <h1>{t("Travel designed for your journey.", "سفر مصمّم لرحلتك.")}</h1>
      <p className="lead">
        {t(
          "Gilgamish Smart is redefining the way people plan their journeys. With the power of AI, it creates personalized travel experiences, organizes every detail of your trip, and brings everything you need into one smart platform.",
          "يعيد جلجامش سمارت تعريف طريقة تخطيط الرحلات. بفضل الذكاء الاصطناعي، يقدّم تجارب سفر مخصّصة، وينظّم تفاصيل رحلتك، ويجمع كل ما تحتاج إليه في منصة ذكية واحدة.",
        )}
      </p>
      <div className="about-grid">
        {features.map((f, i) => (
          <article className="about-card" key={f[0]}>
            <span className="round-icon">
              <Icon name={featureIcons[i]} />
            </span>
            <h3>{t(f[0], f[1])}</h3>
            <p>{t(f[2], f[3])}</p>
          </article>
        ))}
      </div>
      <section className="mission">
        <h2>{t("Our mission", "رسالتنا")}</h2>
        <p>
          {t(
            "To simplify travel planning by delivering a unified platform that combines personalized itineraries, cost management, and booking services through intelligent technologies.",
            "تبسيط تخطيط السفر من خلال منصة موحّدة تجمع البرامج المخصّصة وإدارة التكاليف والوصول إلى خدمات الحجز بتقنيات ذكية.",
          )}
        </p>
      </section>
    </section>
  );
}
export function Contact() {
  const { t, user } = useApp();
  const [search, setSearch] = useSearchParams();
  const [show, setShow] = useState(search.has("message"));
  const [error, setError] = useState(null),
    [busy, setBusy] = useState(false),
    [receipt, setReceipt] = useState(null);
  const close = () => {
    setShow(false);
    setSearch({}, { replace: true });
  };
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      setReceipt(
        await mutation(
          "/contact",
          "POST",
          Object.fromEntries(new FormData(e.currentTarget)),
        ),
      );
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="contact-page">
      <span className="pill">{t("Contact", "تواصل معنا")}</span>
      <h1>
        {t("Travel made simple, smart, and personal.", "سفر بسيط وذكي يناسبك.")}
      </h1>
      <p className="lead">
        {t(
          "Questions, partnerships, or a custom journey in mind? Our team is here to help.",
          "هل لديك أسئلة أو مقترح شراكة أو رحلة مخصّصة؟ فريقنا هنا للمساعدة.",
        )}
      </p>
      <div className="contact-cards">
        {[
          ["email", "Email", "البريد الإلكتروني", "xxx@gilgamish.smart"],
          ["phone", "Phone", "الهاتف", "+966 000 000 0000"],
          [
            "office",
            "Office",
            "المكتب",
            t("Damascus · Riyadh", "دمشق · الرياض"),
          ],
        ].map(([icon, en, ar, value]) => (
          <button
            key={icon}
            className="contact-card"
            onClick={() => setShow(true)}
            aria-label={t("Send a message · " + en, "أرسل رسالة · " + ar)}
          >
            <span className="round-icon">
              <Icon name={icon} />
            </span>
            <span>
              <small>{t(en, ar)}</small>
              <span dir={icon === "office" ? undefined : "ltr"}>{value}</span>
            </span>
          </button>
        ))}
      </div>
      {show && (
        <Modal title={t("Send a message", "أرسل رسالة")} onClose={close}>
          {receipt ? (
            <div className="stack">
              <p role="status">
                {t("Your message has been saved.", "تم حفظ رسالتك.")}
              </p>
              <p className="muted">
                {t(
                  "Messages are stored for review; email delivery is not enabled. The contact details shown in this design are placeholders.",
                  "تُحفظ الرسائل للمراجعة؛ إرسال البريد غير مفعّل. بيانات التواصل في التصميم توضيحية.",
                )}
              </p>
              <small>
                {t("Reference", "المرجع")}: {receipt.id}
              </small>
              <button className="button" onClick={close}>
                {t("Done", "تم")}
              </button>
            </div>
          ) : (
            <form className="stack" onSubmit={submit}>
              <p className="muted">
                {t(
                  "Leave your details and a message for the team.",
                  "اترك بياناتك ورسالتك للفريق.",
                )}
              </p>
              <ErrorMessage error={error} />
              <Field
                label={t("Full name", "الاسم الكامل")}
                name="name"
                autoComplete="name"
                defaultValue={user?.name || ""}
                required
                minLength={2}
                maxLength={100}
              />
              <Field
                label={t("Email", "البريد الإلكتروني")}
                name="email"
                type="email"
                autoComplete="email"
                defaultValue={user?.email || ""}
                required
                maxLength={254}
              />
              <Field
                label={t("Subject", "الموضوع")}
                name="subject"
                required
                minLength={2}
                maxLength={150}
              />
              <Field label={t("Message", "الرسالة")}>
                <textarea
                  name="message"
                  required
                  minLength={10}
                  maxLength={5000}
                  rows={5}
                />
              </Field>
              <button className="button" disabled={busy}>
                {busy
                  ? t("Saving…", "جارٍ الحفظ…")
                  : t("Send message", "إرسال الرسالة")}
              </button>
            </form>
          )}
        </Modal>
      )}
    </section>
  );
}
