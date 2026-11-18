import { Link } from "react-router-dom";
import { useApp } from "../lib/context";
import { cityGuides } from "../lib/cityGuides";
import "../city-guides.css";

export function CityGuideCards({ guides = cityGuides }) {
  const { t } = useApp();
  return (
    <div className="city-guide-grid">
      {guides.map((guide) => (
        <Link
          key={guide.code}
          to={`/guides/${guide.slug}`}
          className="city-guide-card"
          aria-label={t(
            `Explore the ${guide.name} guide`,
            `استكشف دليل ${guide.ar}`,
          )}
        >
          <img
            src={guide.image}
            alt=""
            loading="lazy"
            width="640"
            height="430"
          />
          <span className="city-guide-shade" />
          <div className="city-guide-caption">
            <h3>{t(guide.name, guide.ar)}</h3>
            <p>{t(...guide.summary)}</p>
            <span className="city-guide-link">
              {t("Explore the guide", "استكشف الدليل")}
              <span className="guide-arrow" aria-hidden="true">
                →
              </span>
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}

export function CityGuidesSection() {
  const { t } = useApp();
  return (
    <section
      className="container city-guides-section"
      id="city-guides"
      aria-labelledby="city-guides-heading"
    >
      <div className="section-intro">
        <span className="eyebrow">
          {t("Know before you go", "قبل أن تسافر")}
        </span>
        <h2 id="city-guides-heading">
          {t("Travel guide by city", "دليل السفر حسب المدينة")}
        </h2>
        <p>
          {t(
            "Choose a city for the best seasons, visas, customs, safety, currency and practical tips.",
            "اختر مدينة لتتعرف على أفضل أوقات الزيارة، التأشيرة، العادات، السلامة، العملة وأهم النصائح.",
          )}
        </p>
      </div>
      <CityGuideCards />
    </section>
  );
}
