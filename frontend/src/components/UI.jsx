import { cloneElement, useEffect, useId, useRef } from "react";
import { iconUrl, safeUrl } from "../lib/assets";
import { useApp } from "../lib/context";
import { errors, interests } from "../lib/locales";
import { EnglishCalendar } from "./EnglishCalendar";
export function Icon({ name, className = "" }) {
  return (
    <img
      className={"icon " + className}
      src={iconUrl(name)}
      alt=""
      aria-hidden="true"
    />
  );
}
export function Field({ label, hint, children, ...props }) {
  const id = useId(),
    labelId = id + "-label";
  const accessibility = {
    "aria-labelledby": labelId,
    "aria-describedby": hint ? id : undefined,
  };
  return (
    <label className="field">
      <span id={labelId}>{label}</span>
      {children ? (
        cloneElement(children, accessibility)
      ) : (
        <TravelInput {...props} {...accessibility} />
      )}
      {hint && <small id={id}>{hint}</small>}
    </label>
  );
}
// Native date/time editors may use the OS language even on an English page.
// Keep the calendar available, with an editable ISO value for English.
export function TravelInput({ type, onChange, value, ...props }) {
  const { language } = useApp();
  const text = useRef(null);
  const picker = useRef(null);
  const englishDate = language === "en" && ["date", "time"].includes(type);
  useEffect(() => {
    if (!englishDate) return;
    const valid = !value || (picker.current.value === value && picker.current.validity.valid);
    text.current.setCustomValidity(valid ? "" : type === "time" ? "Enter a valid time within the allowed range." : "Enter a valid date within the allowed range.");
  }, [englishDate, type, value, props.min, props.max]);
  if (language === "en" && type === "number") return <EnglishNumber {...props} value={value} onChange={onChange} />;
  if (!englishDate) return <input {...props} lang={language === "en" ? "en-US" : "ar"} type={type} value={value} onChange={onChange} />;
  const format = type === "date" ? "YYYY-MM-DD" : "HH:MM";
  return <span className="english-date-input" dir="ltr" lang="en-US">
    <input {...props} ref={text} type="text" value={value} placeholder={format} maxLength={format.length}
      pattern={type === "date" ? "[0-9]{4}-[0-9]{2}-[0-9]{2}" : "[0-9]{2}:[0-9]{2}"} onChange={onChange} />
    {type === "date" && <EnglishCalendar value={value} min={props.min} max={props.max}
      onSelect={day => onChange({ target: { value: day } })} />}
    <span className="native-date-control" hidden={type === "date"}>
      <span aria-hidden="true">{type === "date" ? "▦" : "◷"}</span>
      <input ref={picker} aria-label={type === "date" ? "Open calendar" : "Choose time"} type={type}
        min={props.min} max={props.max} value={value && (type === "date" ? /^\d{4}-\d{2}-\d{2}$/ : /^\d{2}:\d{2}$/).test(value) ? value : ""}
        onClick={e => { try { e.currentTarget.showPicker?.(); } catch {} }} onChange={onChange} />
    </span>
  </span>;
}
function EnglishNumber({ value, onChange, min, max, step, ...props }) {
  const input = useRef(null);
  function validate(node) {
    const number = document.createElement("input");
    number.type = "number";
    for (const [key, limit] of Object.entries({ min, max, step })) if (limit != null) number[key] = limit;
    number.value = node.value;
    node.setCustomValidity(node.value && (!number.value || !number.validity.valid)
      ? "Enter a number within the allowed range." : "");
  }
  useEffect(() => { validate(input.current); }, [value, min, max, step]);
  return <input {...props} ref={input} type="text" lang="en-US" dir="ltr"
    inputMode={step && step !== "1" ? "decimal" : "numeric"} value={value}
    onChange={event => {
      const node = event.target;
      node.value = node.value.replace(/[٠-٩۰-۹]/g, c => String(c.charCodeAt(0) % 16)).replace(/٫/g, ".");
      if (!/^\d*\.?\d*$/.test(node.value) || ((!step || step === "1") && node.value.includes("."))) {
        node.value = value ?? "";
        validate(node);
        return;
      }
      validate(node);
      onChange?.(event);
    }} />;
}
export function ErrorMessage({ error }) {
  const { t, language } = useApp();
  return error ? (
    <div role="alert" className="notice error">
      {language === "ar"
        ? errors[error.code] ||
          "تعذّر تنفيذ الطلب. راجع المدخلات وأعد المحاولة."
        : error.message}
      {error.code && <small>{t("Error code: ", "رمز الخطأ: ")}<bdi>{error.code}</bdi></small>}
      {error.code === "FLIGHT_TIME_CONFLICT" && error.details?.window && (
        <small>
          {error.details.window.canVisit
            ? <>{t("Allowed times: ", "الأوقات المسموحة: ")}<bdi>{error.details.window.startTime} – {error.details.window.endTime}</bdi>{t(" (destination local time).", " بتوقيت الوجهة.")}</>
            : t("This day has no available sightseeing time because of the flight schedule.", "لا يوجد وقت متاح للزيارات بهذا اليوم بسبب مواعيد الطيران.")}
        </small>
      )}
      {error.details && error.code === "VALIDATION_ERROR" && (
        <small>
          {t(
            "Check the selected dates, amounts, and activity times.",
            "راجع التواريخ والمبالغ وأوقات الأنشطة.",
          )}
        </small>
      )}
    </div>
  ) : null;
}
export function Loading({ label }) {
  const { t } = useApp();
  return (
    <div className="loading" role="status">
      <span className="spinner" />
      {label || t("Loading your journey…", "جارٍ تحميل رحلتك…")}
    </div>
  );
}
export function Empty({ title, children }) {
  return (
    <div className="empty">
      <Icon name="heritage" />
      <h3>{title}</h3>
      {children}
    </div>
  );
}
export function LanguageButton() {
  const { language, toggleLanguage } = useApp();
  return (
    <button
      className="language"
      onClick={toggleLanguage}
      aria-label={
        language === "en" ? "Switch to Arabic" : "التبديل إلى الإنجليزية"
      }
      dir="ltr"
    >
      <Icon name="language" />
      <span className={language === "en" ? "active" : ""}>EN</span>
      <span>|</span>
      <span className={language === "ar" ? "active" : ""}>AR</span>
    </button>
  );
}
export function Modal({ title, onClose, children, wide = false }) {
  const ref = useRef(),
    titleId = useId();
  const { t } = useApp();
  useEffect(() => {
    const el = ref.current;
    const previous = document.activeElement;
    el.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
      previous?.focus?.();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={"modal" + (wide ? " wide" : "")}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="modal-heading">
        <h2 id={titleId}>{title}</h2>
        <button
          className="icon-button"
          onClick={onClose}
          aria-label={t("Close", "إغلاق")}
        >
          ×
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function InterestPicker({ value, onChange, destinationCode }) {
  const { t } = useApp();
  return (
    <div className="chips">
      {Object.entries(interests).filter(([key]) => key !== "oldDamascus" || destinationCode === "DAM").map(([key, labels]) => (
        <button
          key={key}
          type="button"
          aria-pressed={value.includes(key)}
          className={"chip " + (value.includes(key) ? "selected" : "")}
          onClick={() =>
            onChange(
              value.includes(key)
                ? value.filter((x) => x !== key)
                : [...value, key],
            )
          }
        >
          {t(...labels)}
        </button>
      ))}
    </div>
  );
}
export function ExternalLink({ href, children, ...props }) {
  const url = safeUrl(href);
  return url ? (
    <a href={url} target="_blank" rel="noopener noreferrer" {...props}>
      {children}
      <span aria-hidden="true"> ↗</span>
    </a>
  ) : null;
}
export function ModeNotice({ mode, aiMode }) {
  const { t } = useApp();
  return <>
    {aiMode === "ollama" && <p className="notice compact">
      {t("Experimental local language model is generating this itinerary. Times are estimates; the app validates places, routes and schedule constraints.",
        "هذه نسخة تجريبية تستخدم موديلًا لغويًا محليًا لتوليد الخطة. الأوقات تقديرية، والتطبيق يتحقق من الأماكن والمسارات وقيود الجدول.")}
    </p>}
    {mode === "mixed" && <p className="notice compact">
      {t("Some services use sample data. Check each offer's provider before relying on it.",
        "بعض الخدمات تستخدم بيانات تجريبية. راجع مصدر كل عرض قبل الاعتماد عليه.")}
    </p>}
    {mode === "mock" && <p className="notice compact">
      {t("Development mode · sample offers and places, not live prices.",
        "وضع تجريبي · عروض وأماكن للاختبار، وليست أسعاراً مباشرة.")}
    </p>}
  </>;
}
