import { Link, useParams } from "react-router-dom";
import { useApp } from "../lib/context";
import { guideForSlug } from "../lib/cityGuides";
import { samplePlansFor } from "../lib/samplePlans";
import "../city-plans.css";

export function CityPlans() {
  const { slug } = useParams();
  const { t } = useApp();
  const city = guideForSlug(slug);
  if (!city)
    return (
      <section className="container page-space">
        <h1>{t("City not found", "المدينة غير موجودة")}</h1>
        <Link to="/#destinations">
          {t("Browse destinations", "تصفح الوجهات")}
        </Link>
      </section>
    );
  const plans = samplePlansFor(slug);
  return (
    <article className="container sample-city-page">
      <nav
        className="sample-breadcrumb"
        aria-label={t("Breadcrumb", "مسار الصفحة")}
      >
        <Link to="/#destinations">{t("Destinations", "الوجهات")}</Link>
        <span aria-hidden="true"> / </span>
        {t(city.name, city.ar)}
      </nav>
      <header className="sample-city-hero">
        <img src={city.image} alt="" />
        <div>
          <span>
            {t("Ideas for your next journey", "أفكار لرحلتك القادمة")}
          </span>
          <h1>
            {t(
              `Traveler plans for ${city.name}`,
              `خطط المسافرين في ${city.ar}`,
            )}
          </h1>
          <p>
            {t(
              "Three suggested itineraries with illustrative traveler reviews.",
              "ثلاث خطط متنوعة، مع برنامج يومي وتقييمات وتعليقات توضيحية.",
            )}
          </p>
        </div>
      </header>

      <section
        className="sample-plan-grid"
        aria-label={t("Ready-made itineraries", "الخطط الجاهزة")}
      >
        {plans.map((plan) => (
          <article className="sample-plan-card" key={plan.id}>
            <div className="sample-plan-top">
              <span className="sample-tag">{t(...plan.mood)}</span>
              <span
                className="sample-rating"
                aria-label={t(
                  `Illustrative rating ${plan.rating} out of 5`,
                  `تقييم توضيحي ${plan.rating} من ٥`,
                )}
              >
                ★ {plan.rating} / 5
              </span>
            </div>
            <h2>{t(...plan.title)}</h2>

            <p className="sample-duration">
              {plan.days.length}{" "}
              {t(
                plan.days.length === 1 ? "day" : "days",
                plan.days.length === 1 ? "يوم" : "أيام",
              )}{" "}
              · {t("Flexible schedule", "برنامج مرن")}
            </p>
            <details className="sample-plan-details">
              <summary className="button" aria-label={t("View plan", "الاطلاع على الخطة") + " — " + t(...plan.title)}>
                {t("View plan", "الاطلاع على الخطة")}
              </summary>
              <ol className="sample-days">
                {plan.days.map((day, index) => (
                  <li key={index}>
                    <h3>{t(`Day ${index + 1}`, `اليوم ${index + 1}`)}</h3>
                    <ul>
                      {day.map((activity, i) => (
                        <li key={i}>{t(...activity)}</li>
                      ))}
                    </ul>
                    <p>
                      {t(
                        "Allow time for meals, rest and travel between stops.",
                        "خصص وقتاً للطعام والراحة والتنقل بين المحطات.",
                      )}
                    </p>
                  </li>
                ))}
              </ol>
              <section
                className="sample-reviews"
                aria-label={t(
                  "Illustrative reviews",
                  "تعليقات توضيحية افتراضية",
                )}
              >
                <h3>{t("Traveler reviews", "تعليقات توضيحية")}</h3>
                {plan.reviews.map((review, i) => (
                  <blockquote key={i}>
                    <div>

                      <span
                        aria-label={t(
                          `${review.rating} out of 5`,
                          `${review.rating} من ٥`,
                        )}
                      >
                        {"★".repeat(review.rating)}
                        {"☆".repeat(5 - review.rating)}
                      </span>
                    </div>
                    <p>{t(...review.body)}</p>
                  </blockquote>
                ))}
              </section>
            </details>
          </article>
        ))}
      </section>
      <div className="sample-city-actions">
        <Link
          className="button"
          to={`/planner?destination=${encodeURIComponent(city.name)}`}
        >
          {t("Create my own trip", "أنشئ رحلتي الخاصة")}
        </Link>
        <Link className="button secondary" to={`/guides/${city.slug}`}>
          {t("Read the city guide", "اقرأ دليل المدينة")}
        </Link>
      </div>
    </article>
  );
}
