import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api, mutation } from "../lib/api";
import { useApp } from "../lib/context";
import { cityFor } from "../lib/assets";
import { localizedAirlineName } from "../lib/airlineNames";
import { FlightBookingLink } from "../components/FlightBookingLink";
import { AirlineLogo } from "../components/AirlineLogo";
import { demoCities, searchAirportSuggestions, demoCityByCode } from "../../../shared/demoCities.mjs";
import { HotelBookingLink, HotelPriceNote } from "../components/HotelBookingLink";
import {
  Field,
  ErrorMessage,
  Loading,
  InterestPicker,
  ModeNotice,
  Icon,
  ExternalLink,
} from "../components/UI";
const tomorrow = (offset) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
};
export function CityField({ label, name, code, onChange, airportMode = false }) {
  const { t, language } = useApp();
  const [query, setQuery] = useState(name || ""),
    [results, setResults] = useState([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(null),
    [open, setOpen] = useState(false);
  const wrapper = useRef();
  useEffect(() => {
    const city = cityFor(code);
    setQuery(airportMode && code ? code : city ? t(city.name, city.ar) : name || "");
  }, [name, code, language, airportMode]);
  useEffect(() => {
    if (!open || query.trim().length < 2) {
      setResults([]);
      return;
    }
    const controller = new AbortController();
    const id = setTimeout(async () => {
      setBusy(true);
      setError(null);
      try {
        setResults(
          await api(
            "/destinations/search?q=" + encodeURIComponent(query.trim()),
            { signal: controller.signal },
          ),
        );
      } catch (e) {
        if (e.name !== "AbortError") {
          setResults([]);
          setError(e);
        }
      } finally {
        if (!controller.signal.aborted) setBusy(false);
      }
    }, 250);
    return () => {
      clearTimeout(id);
      controller.abort();
    };
  }, [query, open]);
  const localOptions = airportMode ? (query ? searchAirportSuggestions(query) : demoCities).filter(city => city.code === city.flightCode) : [];
  const options = airportMode ? [...new Map([...results, ...localOptions].map(city => [city.code, city])).values()].sort((a,b) => Number(localOptions.includes(b)) - Number(localOptions.includes(a))) : results;
  return (
    <div
      className="city-field"
      ref={wrapper}
      onBlur={(e) => {
        if (!wrapper.current.contains(e.relatedTarget)) setOpen(false);
      }}
    >
      <Field label={label}>
        <input
          value={query}
          required
          minLength={2}
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          placeholder={t(
            "Search any city or airport worldwide",
            "ابحث عن مدينة أو مطار حول العالم",
          )}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            onChange(e.target.value, "");
            setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);
          }}
        />
      </Field>
      {code && (
        <small className="city-selected">
          {code} · {t("Selected", "تم الاختيار")}
        </small>
      )}
      {cityFor(code)?.flightCode !== code && cityFor(code) && <small className="city-selected">
        {t("Flights via Jeddah (JED); your destination remains Makkah.", "الطيران عبر جدة (JED)، ووجهتك وبرنامجك يبقيان في مكة.")}
      </small>}
      {open && (airportMode || query.length >= 2) && (
        <div className="city-results" role="listbox" aria-label={label}>
          <ErrorMessage error={options.length ? null : error} />
          {busy && !airportMode ? (
            <p role="status">{t("Searching…", "جارٍ البحث…")}</p>
          ) : options.length ? (
            options.map((city) => (
              <button
                key={city.id || city.code}
                type="button"
                role="option"
                aria-selected={code === (city.cityCode || city.code)}
                onClick={() => {
                  onChange(city.name, airportMode ? (city.flightCode || city.code) : (city.cityCode || city.code));
                  setQuery(airportMode ? (city.flightCode || city.code) : city.name);
                  setOpen(false);
                }}
              >
                <span>{t(city.name, city.nameAr || city.name)}{city.country && <small> · {t(city.country, city.countryAr || city.country)}</small>}{city.airportName && <small className="city-airport-name">{city.airportName}</small>}</span>
                <strong>{airportMode ? (city.flightCode || city.code) : (city.cityCode || city.code)}</strong>
              </button>
            ))
          ) : !error ? (
            <p>
              {t(
                "No matching city or airport. Try its name or airport code.",
                "ما لقينا مدينة أو مطار بهالاسم. جرّب الاسم أو رمز المطار.",
              )}
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
export function OfferCard({ offer, kind, selected, onSelect, tripId, planId }) {
  const { t, money, date, language } = useApp();
  const flight = kind === "flight";
  return (
    <article className={"offer-card " + (selected ? "selected" : "")}>
      <div className="offer-top">
        {flight ? <AirlineLogo offer={offer} /> : <span className="round-icon"><Icon name="heritage" /></span>}
        <div>
          <h3>
            {flight ? localizedAirlineName(offer, language) : t(offer.name, offer.nameAr || offer.name)}
          </h3>
          <p>
            {flight
              ? `${offer.origin} → ${offer.destination}`
              : offer.stars
                ? `${offer.stars} ${t("stars", "نجوم")}`
                : t("Star rating unavailable", "تصنيف النجوم غير متاح")}
          </p>
        </div>
        <strong>{money(offer.price, offer.currency)}</strong>
      </div>
      {offer.conversion && <p className="notice compact">
        {t("Estimated conversion. Original fare: ", "تحويل تقديري. السعر الأصلي: ")}
        {money(offer.originalPrice, offer.originalCurrency)} · {t("Rate date: ", "تاريخ سعر الصرف: ")}
        {offer.conversion.updatedAt.slice(0, 10)} · <a href="https://www.exchangerate-api.com" target="_blank" rel="noreferrer">ExchangeRate-API</a>
      </p>}
      {flight ? (
        <>
          <dl className="flight-legs">
            {[[t("Outbound", "الذهاب"), offer.departureTime, offer.arrivalTime],
              [t("Return", "العودة"), offer.returnDepartureTime, offer.returnArrivalTime]].map(([leg, start, end]) => (
              <div key={leg}><dt>{leg}</dt><dd>
                <span>{date(start)}{end && start?.slice(0,10) !== end.slice(0,10) && <> – {date(end)}</>}</span>
                <bdi>{start?.slice(11,16)} → {end?.slice(11,16)}</bdi>
              </dd></div>
            ))}
          </dl>
          <p>
            {t("Stops: ", "التوقفات: ")}
            {offer.stops} / {offer.returnStops ?? offer.stops} ·{" "}
            {t("Round trip, all travelers", "ذهاب وعودة، لجميع المسافرين")}
          </p>
        </>
      ) : (
        <>
          <dl className="flight-legs">
            <div><dt>{t("Check-in", "تسجيل الدخول")}</dt><dd>{date(offer.checkIn)}</dd></div>
            <div><dt>{t("Check-out", "تسجيل الخروج")}</dt><dd>{date(offer.checkOut)}</dd></div>
            <div><dt>{t("Rooms", "عدد الغرف")}</dt><dd>{offer.rooms || 1}</dd></div>
            {offer.nightlyPrice != null && <div>
              <dt>{offer.provider === "damascus_local" ? t("Estimated rate per room / night", "سعر الغرفة التقديري لليلة") : t("Nightly rate", "سعر الليلة")}</dt>
              <dd>{money(offer.nightlyPrice, offer.currency)}</dd>
            </div>}
          </dl>
          {offer.description && <p>{t(offer.description, offer.descriptionAr || offer.description)}</p>}
          {offer.provider !== "damascus_local" && <HotelPriceNote offer={offer} />}
        </>
      )}

      {offer.recommendation && (
        <div className="notice compact">
          <strong>{t("Recommendation", "الاقتراح")} #{offer.recommendation.rank}</strong>
          {offer.recommendation.reasons.map((reason) => (
            <p key={reason}>{t(...({
              pricePriority: ["Lowest price first", "الأقل سعراً أولاً"],
              durationPriority: ["Shortest duration first", "الأقصر مدة أولاً"],
              stopsPriority: ["Fewer stops", "توقفات أقل"],
              starsPriority: ["Closest hotel category", "الأقرب لفئتك الفندقية"],
              budgetPossible: ["Within budget with the lowest-cost pairing, before activities.", "ضمن الميزانية مع أرخص توليفة، قبل الأنشطة."],
              overBudget: ["Above budget before activities.", "يتجاوز الميزانية قبل الأنشطة."],
            })[reason])}</p>
          ))}
        </div>
      )}
      <div className="button-row">
        <button
          type="button"
          className={"button small " + (selected ? "" : "secondary")}
          aria-pressed={selected}
          onClick={() => onSelect(offer.id)}
        >
          {selected ? t("Selected", "تم الاختيار") : t("Select", "اختيار")}
        </button>
        {flight ? <FlightBookingLink key={offer.id} offer={offer} className="button secondary small">
          {t("Provider search", "البحث لدى المزوّد")}
        </FlightBookingLink> : <HotelBookingLink key={offer.id} offer={offer} tripId={tripId} planId={planId} />}
      </div>
    </article>
  );
}
export function Planner() {
  const { t, language, mode, aiMode, notify } = useApp(),
    navigate = useNavigate();
  const [search] = useSearchParams();
  const editId = search.get("trip");
  const [trip, setTrip] = useState(() => ({
    origin: "",
    originCode: "",
    destination: search.get("destination") || "",
    destinationCode: "",
    startDate: search.get("startDate") || tomorrow(30),
    endDate: tomorrow(34),
    adults: 1,
    children: 0,
    totalBudget: search.get("budget") || "3000",
    currency: search.get("currency") || "USD",
    interests: [],
    language,
    preferences: {
      flightOption: "cheapest",
      directPreferred: false,
      hotelStars: 3,
      pace: "balanced",
      foodDaily: "40",
      transportDaily: "25",
      otherCosts: "0",
    },
  }));
  const [step, setStep] = useState(0),
    [tripId, setTripId] = useState(editId),
    [offers, setOffers] = useState({ flights: [], hotels: [] }),
    [choice, setChoice] = useState({ flightId: "", hotelId: "" }),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(null),
    [initial, setInitial] = useState(!!editId);
  useEffect(() => {
    if (editId)
      api("/trips/" + editId)
        .then((data) => {
          const { id, status, createdAt, plans, ...input } = data;
          setTrip(input);
        })
        .catch(setError)
        .finally(() => setInitial(false));
    else
      api("/users/me/preferences")
        .then((p) =>
          setTrip((tr) => ({
            ...tr,
            currency: search.get("currency") || p.currency,
          })),
        )
        .catch(() => {});
  }, [editId]);
  const set = (key, value) => setTrip((prev) => ({ ...prev, [key]: value }));
  const pref = (key, value) =>
    setTrip((prev) => ({
      ...prev,
      preferences: { ...prev.preferences, [key]: value },
    }));
  const fail = (en, ar) => setError(new Error(t(en, ar)));
  async function next(e) {
    e.preventDefault();
    setError(null);
    if (step === 0) {
      if (!trip.originCode || !trip.destinationCode)
        return fail(
          "Select origin and destination from the search results.",
          "اختر المغادرة والوجهة من نتائج البحث.",
        );
      if (trip.originCode === trip.destinationCode)
        return fail(
          "Origin and destination must differ.",
          "يجب أن تختلف المغادرة عن الوجهة.",
        );
      const nights =
        (Date.parse(trip.endDate) - Date.parse(trip.startDate)) / 864e5;
      if (
        nights < 1 ||
        nights > 21 ||
        trip.startDate < new Date().toISOString().slice(0, 10)
      )
        return fail(
          "Choose future dates for 1–21 nights.",
          "اختر تواريخ مستقبلية لمدة ١–٢١ ليلة.",
        );
      if (trip.adults + trip.children > 9)
        return fail(
          "Choose no more than nine travelers.",
          "اختر تسعة مسافرين كحد أقصى.",
        );
      setStep(1);
      return;
    }
    if (step === 1) {
      if (!trip.preferences.pace || !trip.preferences.flightOption || !trip.preferences.hotelStars)
        return fail("Choose your travel pace, flight preference and hotel stars.", "اختر إيقاع الرحلة وتفضيل الطيران وفئة الفندق.");
      if (!trip.interests.length)
        return fail(
          "Select at least one interest.",
          "اختر اهتماماً واحداً على الأقل.",
        );
      setBusy(true);
      try {
        const saved = await mutation(
          tripId ? "/trips/" + tripId : "/trips",
          tripId ? "PATCH" : "POST",
          { ...trip, language },
        );
        setTripId(saved.id);
        setChoice({ flightId: "", hotelId: "" });
        const results = await api("/recommendations?tripId=" + saved.id);
        setOffers({ flights: results.flights, hotels: results.hotels });
        setStep(2);
      } catch (err) {
        setError(err);
      } finally {
        setBusy(false);
      }
      return;
    }
    if (!choice.flightId || !choice.hotelId)
      return fail(
        "Select a flight and a hotel first.",
        "اختر رحلة طيران وفندقاً أولاً.",
      );
    setBusy(true);
    try {
      if (trip.children > 0 && offers.hotels.find(h => h.id === choice.hotelId)?.provider === "serpapi") notify(t("Hotel price covers adults only. Confirm child rates with the hotel.", "سعر الفندق يشمل البالغين فقط. تأكّد من تكلفة إقامة الأطفال مع الفندق."));
      const plan = await mutation("/plans/generate", "POST", {
        tripId,
        ...choice,
      });
      navigate("/plans/" + plan.id);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }
  async function refreshOffers() {
    setBusy(true);
    setError(null);
    try {
      const results = await api("/recommendations?tripId=" + tripId);
      setOffers({ flights: results.flights, hotels: results.hotels });
      setChoice({ flightId: "", hotelId: "" });
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  if (initial) return <Loading />;
  return (
    <section className="container planner-page">
      <h1>{t("Plan your trip", "خطّط لرحلتك")}</h1>
      <ol className="steps">
        {[
          ["Your journey", "رحلتك"],
          ["Your preferences", "تفضيلاتك"],
          ["Choose & generate", "اختر وأنشئ"],
        ].map((s, i) => (
          <li
            key={i}
            aria-current={step === i ? "step" : undefined}
            className={step >= i ? "active" : ""}
          >
            <span>{i + 1}</span>
            {t(...s)}
          </li>
        ))}
      </ol>
      <ModeNotice mode={mode} aiMode={aiMode} />

      <form onSubmit={next}>
        <ErrorMessage error={error} />
        {busy && (
          <Loading
            label={
              step === 2
                ? t("Crafting your itinerary…", "جارٍ تصميم برنامجك…")
                : t("Finding travel options…", "جارٍ البحث عن خيارات السفر…")
            }
          />
        )}
        <fieldset disabled={busy}>
          <div hidden={step !== 0} className="panel planner-panel">
            <h2>
              {t("Trip details", "تفاصيل الرحلة")}
            </h2>
            <div className="form-grid">
              <CityField
                label={t("Origin", "المغادرة")}
                name={trip.origin}
                code={trip.originCode}
                onChange={(name, code) =>
                  setTrip({ ...trip, origin: name, originCode: code })
                }
              />
              <CityField
                label={t("Destination", "الوجهة")}
                name={trip.destination}
                code={trip.destinationCode}
                onChange={(name, code) =>
                  setTrip({ ...trip, destination: name, destinationCode: code, interests: code === "DAM" ? trip.interests : trip.interests.filter(i => i !== "oldDamascus") })
                }
              />
              <Field
                label={t("Departure date", "تاريخ المغادرة")}
                type="date"
                value={trip.startDate}
                min={tomorrow(0)}
                onChange={(e) => set("startDate", e.target.value)}
                required
              />
              <Field
                label={t("Return date", "تاريخ العودة")}
                type="date"
                value={trip.endDate}
                min={trip.startDate}
                onChange={(e) => set("endDate", e.target.value)}
                required
              />
              <Field
                label={t("Adults (12+)", "البالغون (١٢+)")}
                type="number"
                min="1"
                max="9"
                value={trip.adults}
                onChange={(e) => set("adults", Number(e.target.value))}
                required
              />
              <Field
                label={t("Children (2–11)", "الأطفال (٢–١١)")}
                type="number"
                min="0"
                max="8"
                value={trip.children}
                onChange={(e) => set("children", Number(e.target.value))}
                required
              />
              <Field
                label={t("Total trip budget", "ميزانية الرحلة الإجمالية")}
                type="number"
                min="0.01"
                max="99999999"
                step="0.01"
                value={trip.totalBudget}
                onChange={(e) => set("totalBudget", e.target.value)}
                required
              />
              <Field label={t("Currency", "العملة")}>
                <select
                  value={trip.currency}
                  onChange={(e) => set("currency", e.target.value)}
                >
                  {["USD", "SAR", "EUR", "GBP", "AED", "TRY"].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </Field>
            </div>

          </div>
          <div hidden={step !== 1} className="panel planner-panel">
            <h2>
              {t("Make this journey yours.", "اجعل هذه الرحلة على ذوقك.")}
            </h2>
            {["JED", "QCA"].includes(trip.destinationCode) && (
              <fieldset className="stay-city-choice">
                <legend>{t("Arriving in Jeddah — where will you stay?", "وصولك إلى جدة — وين رح تكون إقامتك؟")}</legend>
                <div className="form-grid">
                  {[
                    ["JED", "Stay in Jeddah", "رحلتي إلى جدة", "Hotels and activities in Jeddah.", "الفندق والخطة والأماكن السياحية في جدة."],
                    ["QCA", "Continue to Makkah", "رحلتي إلى مكة المكرمة", "Hotels and activities in Makkah; flights arrive in Jeddah.", "الفندق والخطة والأماكن في مكة، والطيران إلى جدة."],
                  ].map(([code, en, ar, descriptionEn, descriptionAr]) => (
                    <label key={code} className={"stay-city-option " + (trip.destinationCode === code ? "selected" : "")}>
                      <input type="radio" name="stayCity" value={code} checked={trip.destinationCode === code}
                        onChange={() => setTrip((previous) => ({ ...previous, destination: demoCityByCode(code).name, destinationCode: code }))} />
                      <span><strong>{t(en, ar)}</strong><small>{t(descriptionEn, descriptionAr)}</small></span>
                    </label>
                  ))}
                </div>
                {trip.destinationCode === "QCA" && <p className="muted">{t("Arrange ground transport between Jeddah airport and Makkah. Its cost is separate from the flight and hotel.", "رتّب النقل البري بين مطار جدة ومكة؛ تكلفته منفصلة عن سعر الطيران والفندق.")}</p>}
              </fieldset>
            )}
            <label className="field">
              <span>{t("Your interests", "اهتماماتك")}</span>
            </label>
            <InterestPicker destinationCode={trip.destinationCode}
              value={trip.interests}
              onChange={(v) => set("interests", v)}
            />
            <div className="form-grid">
              <Field label={t("Travel pace", "إيقاع الرحلة")}>
                <select
                  value={trip.preferences.pace}
                  onChange={(e) => pref("pace", e.target.value)}
                >
                  <option value="" disabled>{t("Select…", "اختر…")}</option>
                  <option value="relaxed">{t("Relaxed", "هادئ")}</option>
                  <option value="balanced">{t("Balanced", "متوازن")}</option>
                  <option value="busy">{t("Busy", "مكثّف")}</option>
                </select>
              </Field>
              <Field label={t("Flight preference", "تفضيل الطيران")}>
                <select
                  value={trip.preferences.flightOption}
                  onChange={(e) => pref("flightOption", e.target.value)}
                >
                  <option value="" disabled>{t("Select…", "اختر…")}</option>
                  <option value="cheapest">
                    {t("Lowest price", "أقل سعر")}
                  </option>
                  <option value="shortest">
                    {t("Shortest duration", "أقصر مدة")}
                  </option>
                </select>
              </Field>
              <Field label={t("Hotel stars", "نجوم الفندق")}>
                <select
                  value={trip.preferences.hotelStars}
                  onChange={(e) => pref("hotelStars", Number(e.target.value))}
                >
                  <option value="" disabled>{t("Select…", "اختر…")}</option>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option value={n} key={n}>
                      {n} ★
                    </option>
                  ))}
                </select>
              </Field>
              <label className="check-field">
                <input
                  type="checkbox"
                  checked={trip.preferences.directPreferred}
                  onChange={(e) => pref("directPreferred", e.target.checked)}
                />
                {t("Prefer direct flights", "أفضل الرحلات المباشرة")}
              </label>
              {[
                [
                  "foodDaily",
                  "Food per traveler / day",
                  "الطعام لكل مسافر / يوم",
                ],
                [
                  "transportDaily",
                  "Transport per group / day",
                  "التنقل للمجموعة / يوم",
                ],
                [
                  "otherCosts",
                  "Other costs for the trip",
                  "مصاريف أخرى للرحلة",
                ],
              ].map(([key, en, ar]) => (
                <Field
                  key={key}
                  label={t(en, ar) + " (" + trip.currency + ")"}
                  type="number"
                  min="0"
                  max="99999999"
                  step="0.01"
                  value={trip.preferences[key]}
                  onChange={(e) => pref(key, e.target.value)}
                  required
                />
              ))}
            </div>

          </div>
          {step === 2 && (
            <div className="offers-section">
              <div className="section-heading">
                <h2>{t("Your top flight recommendations", "أفضل اقتراحات الطيران لك")}</h2>
                <button
                  type="button"
                  className="text-button"
                  onClick={refreshOffers}
                >
                  {t("Refresh offers", "تحديث العروض")}
                </button>
              </div>
              <p className="muted">{t("Up to three options in each category, ranked for your preferences and budget. Choose one flight and one hotel to generate your personalized itinerary.", "حتى ٣ خيارات من كل فئة حسب تفضيلاتك وميزانيتك. اختر رحلة طيران وفندقاً لتوليد خطتك حسب اهتماماتك.")}</p>

              <div className="offer-list">
                {offers.flights.map((f) => (
                  <OfferCard
                    key={f.id}
                    offer={f}
                    kind="flight"
                    selected={choice.flightId === f.id}
                    onSelect={(id) => setChoice({ ...choice, flightId: id })}
                  />
                ))}
              </div>
              {!offers.flights.length && (
                <p className="notice">
                  {t(
                    "No flights found. Change dates or destination and retry.",
                    "لم يتم العثور على رحلات طيران. غيّر التواريخ أو الوجهة وأعد المحاولة.",
                  )}
                </p>
              )}
              <h2>{t("Your top hotel recommendations", "أفضل اقتراحات الفنادق لك")} — {cityFor(trip.destinationCode) ? t(cityFor(trip.destinationCode).name, cityFor(trip.destinationCode).ar) : trip.destination}</h2>
              <div className="offer-list">
                {offers.hotels.map((h) => (
                  <OfferCard
                    key={h.id}
                    offer={h}
                    kind="hotel"
                    tripId={tripId}
                    selected={choice.hotelId === h.id}
                    onSelect={(id) => setChoice({ ...choice, hotelId: id })}
                  />
                ))}
              </div>
              {!offers.hotels.length && (
                <p className="notice">
                  {t(
                    "No hotels found. Change dates or preferences and retry.",
                    "لم يتم العثور على فنادق. غيّر التواريخ أو التفضيلات وأعد المحاولة.",
                  )}
                </p>
              )}
            </div>
          )}
          <div className="planner-actions">
            {step > 0 && (
              <button
                className="button secondary"
                type="button"
                onClick={() => {
                  setError(null);
                  setStep(step - 1);
                }}
              >
                {t("Back", "رجوع")}
              </button>
            )}
            <button className="button" type="submit">
              {step === 2
                ? t("Generate my plan", "أنشئ خطتي")
                : step === 1
                  ? t("Find flights & hotels", "ابحث عن الطيران والفنادق")
                  : t("Continue", "متابعة")}
              <Icon name="arrow" />
            </button>
          </div>
        </fieldset>
      </form>
    </section>
  );
}
