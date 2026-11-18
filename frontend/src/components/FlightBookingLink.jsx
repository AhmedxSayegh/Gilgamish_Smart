import { useState } from "react";
import { mutation } from "../lib/api";
import { useApp } from "../lib/context";
import { ExternalLink, Modal } from "./UI";

export function FlightBookingLink({ offer, className = "text-button", children }) {
  const { t } = useApp();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [failed, setFailed] = useState(false);
  const lookup = async () => {
    setOpen(true); setLoading(true); setFailed(false); setResult(null);
    try { setResult(await mutation("/flights/booking-links", "POST", { offerId: offer.providerOfferId })); }
    catch { setFailed(true); }
    finally { setLoading(false); }
  };
  if (offer.provider !== "ignav") return <ExternalLink className={className} href={offer.bookingUrl}>{children}</ExternalLink>;
  return <>
    <button type="button" className={className} disabled={loading} onClick={lookup}>{loading ? t("Loading links…", "جارٍ جلب الروابط…") : children}</button>
    {open && <Modal title={t("Flight booking links", "روابط حجز الطيران")} onClose={() => setOpen(false)}>
      {loading && <p role="status">{t("Retrieving the provider's booking links…", "جارٍ جلب روابط الحجز من المزوّد…")}</p>}
      {failed && <div role="alert"><p>{t("Could not retrieve booking links. Please try again.", "تعذّر جلب روابط الحجز. حاول مرة أخرى.")}</p><button type="button" className="button secondary" onClick={lookup}>{t("Try again", "حاول مجدداً")}</button></div>}
      {result && <>
        <p>{t("Confirm dates, passengers, baggage and the final price on the seller's website. No booking is made here.", "راجع التواريخ والمسافرين والأمتعة والسعر النهائي على موقع البائع. لا يتم إجراء حجز هنا.")}</p>
        {!result.options.length ? <p role="status">{t("The provider has no usable booking links for this offer right now. Try another offer or refresh your flight search.", "لا تتوفر روابط حجز لهذا العرض حالياً لدى المزوّد. جرّب عرضاً آخر أو أعد البحث عن الرحلات.")}</p> : <>
          {result.options.length > 1 && <p className="notice">{t("Separate bookings are required: choose one seller link from each group below to cover the whole trip.", "تحتاج الرحلة حجوزات منفصلة: اختر رابط بائع واحد من كل مجموعة أدناه لتغطية الرحلة كاملة.")}</p>}
          {result.options.map((option, index) => <section key={index} style={{marginBlock: 20}}>
            <h3>{option.legs.includes("outbound") && option.legs.includes("inbound") ? t("Round trip", "الذهاب والعودة") : option.legs.includes("inbound") ? t("Return flight", "رحلة العودة") : option.legs.includes("outbound") ? t("Outbound flight", "رحلة الذهاب") : t(`Booking ${index + 1}`, `الحجز ${index + 1}`)}</h3>
            <div className="button-row">{option.links.map((link, i) => <ExternalLink key={i} className="button secondary small" href={link.url}>{link.providerName}{link.specificity === "search_results" ? t(" · Search results", " · نتائج البحث") : ""}</ExternalLink>)}</div>
          </section>)}
        </>}
      </>}
    </Modal>}
  </>;
}
