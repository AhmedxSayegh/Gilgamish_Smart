import { useState } from "react";
import { api } from "../lib/api";
import { useApp } from "../lib/context";
import { ErrorMessage, ExternalLink, Modal } from "./UI";

export function HotelPriceNote({ offer }) {
  const { t } = useApp();
  if (offer.provider === "damascus_local") return <div><p>{t(offer.description, offer.descriptionAr)}</p><small>{t("Estimated room rate per night", "سعر الغرفة التقديري لليلة")} · {offer.nightlyPrice} {offer.currency}</small></div>;
  if (offer.provider !== "serpapi") return null;
  return (
    <small className="muted">

      {offer.taxesIncluded === true
        ? t("Includes taxes and fees", "يشمل الضرائب والرسوم")
        : offer.taxesIncluded === false
          ? t("Excludes taxes and fees", "لا يشمل الضرائب والرسوم")
          : t("Taxes and fees not confirmed", "الضرائب والرسوم غير مؤكدة")}
    </small>
  );
}

export function HotelBookingLink({
  offer,
  tripId,
  planId,
  className = "button secondary small",
}) {
  const { t, money, date } = useApp();
  const [open, setOpen] = useState(false),
    [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null),
    [error, setError] = useState(null);
  async function lookup() {
    setOpen(true);
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const context = new URLSearchParams(planId ? { planId } : { tripId });
      setResult(
        await api(
          `/hotels/${encodeURIComponent(offer.propertyToken || offer.providerHotelId)}/booking-links?${context}`,
        ),
      );
    } catch (failure) {
      setError(failure);
    } finally {
      setLoading(false);
    }
  }
  if (offer.provider === "damascus_local") {
    return <><button type="button" className={className} onClick={() => setOpen(true)}>{t("Book now", "احجز الآن")}</button>
      {open && <Modal title={t("Hotel details & booking", "تفاصيل الفندق والحجز")} onClose={() => setOpen(false)}>
        <div className="stack"><h3>{t(offer.name, offer.nameAr)}</h3><HotelPriceNote offer={offer} />
          <p>{date(offer.checkIn)} — {date(offer.checkOut)} · {money(offer.price, offer.currency)}</p>
          <ExternalLink className="button" href={offer.bookingUrl}>{t("Contact us on WhatsApp to book", "تواصل معنا للحجز عبر واتساب")}</ExternalLink>
        </div></Modal>}</>;
  }
  if (offer.provider !== "serpapi")
    return (
      <ExternalLink className={className} href={offer.bookingUrl}>
        {t("Book now", "احجز الآن")}
      </ExternalLink>
    );
  return (
    <>
      <button
        type="button"
        className={className}
        onClick={lookup}
        disabled={loading}
      >
        {loading
          ? t("Loading hotel…", "جارٍ تحميل الفندق…")
          : t("Book now", "احجز الآن")}
      </button>
      {open && (
        <Modal
          title={t("Hotel details & booking", "تفاصيل الفندق والحجز")}
          onClose={() => setOpen(false)}
        >
          {loading && (
            <p role="status">
              {t(
                "Retrieving hotel details and seller prices…",
                "جارٍ جلب تفاصيل الفندق وأسعار البائعين…",
              )}
            </p>
          )}
          <ErrorMessage error={error} />
          {error && (
            <button type="button" className="button secondary" onClick={lookup}>
              {t("Try again", "حاول مجدداً")}
            </button>
          )}
          {result && (
            <div className="stack hotel-booking">
              <h3>{result.hotel.name}</h3>
              {result.hotel.images?.[0] && (
                <img
                  className="hotel-booking-image"
                  src={result.hotel.images[0]}
                  alt={result.hotel.name}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
              )}
              {result.hotel.description && <p>{result.hotel.description}</p>}
              {result.hotel.address && <p>{result.hotel.address}</p>}
              {result.hotel.rating != null && (
                <p>
                  {t("Guest rating: ", "تقييم النزلاء: ")}
                  {result.hotel.rating} / 5
                </p>
              )}
              <p>
                {date(result.hotel.checkIn)} — {date(result.hotel.checkOut)} ·{" "}
                {result.hotel.adults}{" "}
                {t("adult(s) · One room", "بالغ · غرفة واحدة")}
              </p>
              {result.hotel.price != null && (
                <strong>
                  {t(
                    "Hotel search price, full stay: ",
                    "سعر البحث للفندق، كامل الإقامة: ",
                  )}
                  {money(result.hotel.price, result.hotel.currency)}
                </strong>
              )}
              <HotelPriceNote offer={result.hotel} />
              {!!result.hotel.amenities?.length && (
                <ul>
                  {result.hotel.amenities.map((amenity, index) => (
                    <li key={index}>{amenity}</li>
                  ))}
                </ul>
              )}
              <p className="notice">
                {t(
                  "Prices are snapshots. Confirm dates, guests, room, taxes, cancellation terms and the final price on the seller's website. Booking and payment happen there.",
                  "الأسعار تعكس وقت البحث. راجع التواريخ والنزلاء والغرفة والضرائب وشروط الإلغاء والسعر النهائي على موقع البائع. يتم الحجز والدفع هناك.",
                )}
              </p>

              {!result.links.length && (
                <p role="status">
                  {t(
                    "No booking links are available for this hotel right now. Try another hotel or search again.",
                    "لا تتوفر روابط حجز لهذا الفندق حالياً. جرّب فندقاً آخر أو أعد البحث.",
                  )}
                </p>
              )}
              {result.links.map((link, index) => (
                <article key={index} className="panel stack">
                  <strong>{link.source}</strong>
                  <p>
                    {link.type === "property_website" ? (
                      t(
                        "Hotel website · confirm your dates and price there",
                        "موقع الفندق · تأكد من التواريخ والسعر هناك",
                      )
                    ) : link.price != null ? (
                      <>
                        {money(link.price, link.currency)} ·{" "}
                        {t("Full stay", "كامل الإقامة")}
                      </>
                    ) : link.nightlyPrice != null ? (
                      <>
                        {money(link.nightlyPrice, link.currency)} ·{" "}
                        {t(
                          "Per night · total unavailable",
                          "لليلة · الإجمالي غير متاح",
                        )}
                      </>
                    ) : (
                      t(
                        "Price available on seller's website",
                        "السعر متاح على موقع البائع",
                      )
                    )}
                  </p>
                  {link.type === "seller_offer" && (
                    <small>
                      {link.taxesIncluded === true
                        ? t("Includes taxes and fees", "يشمل الضرائب والرسوم")
                        : link.taxesIncluded === false
                          ? t(
                              "Excludes taxes and fees",
                              "لا يشمل الضرائب والرسوم",
                            )
                          : t(
                              "Taxes and fees not confirmed",
                              "الضرائب والرسوم غير مؤكدة",
                            )}
                    </small>
                  )}
                  {link.freeCancellation === true && (
                    <small>
                      {t(
                        "Free cancellation advertised · check terms",
                        "إلغاء مجاني معلن · راجع الشروط",
                      )}
                    </small>
                  )}
                  <ExternalLink
                    href={link.url}
                    className="button secondary small"
                  >
                    {t("Book with ", "احجز لدى ")}
                    {link.source}
                  </ExternalLink>
                </article>
              ))}
            </div>
          )}
        </Modal>
      )}
    </>
  );
}
