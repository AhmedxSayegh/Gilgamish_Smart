import { Link, useParams } from "react-router-dom";
import { useApp } from "../lib/context";
import { cityGuides, guideForSlug } from "../lib/cityGuides";
import { CityGuideCards } from "../components/CityGuideCards";
import { cityHighlights } from "../lib/cityHighlights";

function GuideIcon({ type }) {
  const paths = {
    season: (
      <>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" />
      </>
    ),
    visa: (
      <>
        <rect x="5" y="3" width="14" height="18" rx="2" />
        <circle cx="12" cy="10" r="3" />
        <path d="M8 17h8M12 7v6M9 10h6" />
      </>
    ),
    customs: (
      <>
        <path d="M4 10h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5zM17 11h2a3 3 0 0 1 0 6h-2M8 3v3m5-3v3M3 22h16" />
      </>
    ),
    safety: (
      <>
        <path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6z" />
        <path d="m8 12 3 3 5-6" />
      </>
    ),
    money: (
      <>
        <rect x="3" y="5" width="18" height="15" rx="3" />
        <path d="M3 9h18M16 13h5v4h-5a2 2 0 0 1 0-4Z" />
      </>
    ),
    attention: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v6m0 3v1" />
      </>
    ),
  };
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[type]}
    </svg>
  );
}

export function CityGuide() {
  const { slug } = useParams();
  const { t } = useApp();
  const guide = guideForSlug(slug);
  if (!guide)
    return (
      <section className="container page-space guide-not-found">
        <span className="eyebrow">{t("City guides", "أدلة المدن")}</span>
        <h1>
          {t(
            "This city guide is not available.",
            "دليل هذه المدينة غير متوفر.",
          )}
        </h1>
        <p>
          {t(
            "Explore one of our ten city guides.",
            "استكشف أحد أدلتنا للمدن العشر.",
          )}
        </p>
        <Link className="button" to="/#city-guides">
          {t("Browse city guides", "تصفح أدلة المدن")}
        </Link>
      </section>
    );
  const sources = [
    ...new Map(
      guide.sections
        .flatMap((section) => section.sources)
        .map((item) => [item.url, item]),
    ).values(),
  ];
  const currentIndex = cityGuides.indexOf(guide);
  const highlights = cityHighlights[guide.code];
  const related = Array.from(
    { length: 3 },
    (_, index) => cityGuides[(currentIndex + index + 1) % cityGuides.length],
  );
  return (
    <article className="city-guide-page container">
      <nav
        className="guide-breadcrumb"
        aria-label={t("Breadcrumb", "مسار الصفحة")}
      >
        <Link to="/">{t("Home", "الرئيسية")}</Link>
        <span aria-hidden="true">/</span>
        <Link to="/#city-guides">{t("City guides", "أدلة المدن")}</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{t(guide.name, guide.ar)}</span>
      </nav>
      <header className="guide-hero">
        <img
          src={guide.image}
          alt=""
          width="1280"
          height="500"
          fetchPriority="high"
        />
        <div className="city-guide-shade" />
        <div className="guide-hero-copy">
          <span className="guide-country">
            {t(guide.country, guide.countryAr)}
          </span>
          <h1>{t(`${guide.name} travel guide`, `دليل ${guide.ar}`)}</h1>
          <p>{t(...guide.summary)}</p>
        </div>
      </header>
      <dl className="guide-facts">
        {[
          [t("Country capital", "عاصمة الدولة"), guide.capital],
          [t("Currency", "العملة"), guide.currency],
          [t("Language", "اللغة"), guide.language],
        ].map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{t(...value)}</dd>
          </div>
        ))}
      </dl>
      <div className="guide-review-note">
        <p>
          {t(
            "Entry rules depend on your nationality and can change. Recheck official sources before booking.",
            "تختلف شروط الدخول حسب جنسيتك وقد تتغير؛ راجع المصادر الرسمية قبل الحجز.",
          )}
        </p>
      </div>
      <section
        className="guide-overview"
        aria-labelledby="guide-overview-heading"
      >
        <span className="eyebrow">
          {t("Discover the city", "تعرّف على المدينة")}
        </span>
        <h2 id="guide-overview-heading">
          {t(`About ${guide.name}`, `نبذة عن ${guide.ar}`)}
        </h2>
        <p>{t(...highlights.overview)}</p>
      </section>
      <section
        className="guide-landmarks"
        aria-labelledby="guide-landmarks-heading"
      >
        <h2 id="guide-landmarks-heading">
          {t("Top landmarks", "أبرز المعالم السياحية")}
        </h2>
        <div className="guide-landmark-grid">
          {highlights.landmarks.map((landmark, index) => (
            <article className="guide-landmark" key={landmark.name[0]}>
              <span className="guide-landmark-number" aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3>{t(...landmark.name)}</h3>
              <p>{t(...landmark.description)}</p>
            </article>
          ))}
        </div>
        <a
          className="guide-landmark-source"
          href={highlights.source}
          target="_blank"
          rel="noreferrer"
        >
          {t("Explore the city's heritage ↗", "تعرّف أكثر على تراث المدينة ↗")}
        </a>
      </section>
      <section
        className="guide-details-grid"
        aria-label={t("Practical travel information", "معلومات السفر العملية")}
      >
        {guide.sections.map((section) => (
          <section className="guide-detail-card" key={section.key}>
            <div className="guide-detail-heading">
              <span className="guide-icon">
                <GuideIcon type={section.key} />
              </span>
              <h2>{t(...section.label)}</h2>
            </div>
            <h3>{t(...section.title)}</h3>
            <p>{t(...section.body)}</p>
            <div className="guide-inline-sources">
              {section.sources.map((item) => (
                <a
                  key={item.url}
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  {t(...item.label)} <span aria-hidden="true">↗</span>
                </a>
              ))}
            </div>
          </section>
        ))}
      </section>
      <section
        className="guide-sources"
        aria-labelledby="guide-sources-heading"
      >
        <div>
          <span className="eyebrow">
            {t("Go to the source", "ارجع إلى المصدر")}
          </span>
          <h2 id="guide-sources-heading">
            {t(
              "Official sources for this guide",
              "المصادر الرسمية لهذا الدليل",
            )}
          </h2>
          <p>
            {t(
              "A reviewed starting point for your research. Follow the relevant authority's latest guidance for your own situation.",
              "نقطة بداية موثقة للبحث؛ اعتمد أحدث تعليمات الجهة المختصة بما يناسب وضعك.",
            )}
          </p>
        </div>
        <ul>
          {sources.map((item) => (
            <li key={item.url}>
              <a href={item.url} target="_blank" rel="noreferrer">
                {t(...item.label)} <span aria-hidden="true">↗</span>
              </a>
            </li>
          ))}
        </ul>
      </section>
      <section className="guide-plan-callout">
        <div>
          <h2>
            {t(
              `Make ${guide.name} your next chapter`,
              `خطّط رحلتك إلى ${guide.ar}`,
            )}
          </h2>
          <p>
            {t(
              "Choose your dates, interests and budget in the trip planner.",
              "اختر تواريخك واهتماماتك وميزانيتك في مخطط الرحلة.",
            )}
          </p>
        </div>
        <Link
          className="button"
          to={`/planner?destination=${encodeURIComponent(guide.name)}`}
        >
          {t("Plan a trip", "خطّط رحلة")}{" "}
          <span className="guide-arrow" aria-hidden="true">
            →
          </span>
        </Link>
      </section>
      <section
        className="guide-related"
        aria-labelledby="related-guides-heading"
      >
        <h2 id="related-guides-heading">
          {t("More cities to discover", "مدن أخرى لتكتشفها")}
        </h2>
        <CityGuideCards guides={related} />
        <Link className="guide-back-link" to="/#city-guides">
          {t("View all ten city guides", "عرض أدلة المدن العشر")}
        </Link>
      </section>
    </article>
  );
}
