import { cloneElement, useEffect, useId, useRef } from "react";
import { iconUrl, safeUrl } from "../lib/assets";
import { useApp } from "../lib/context";
import { errors, interests } from "../lib/locales";
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
        <input {...props} {...accessibility} />
      )}
      {hint && <small id={id}>{hint}</small>}
    </label>
  );
}
export function ErrorMessage({ error }) {
  const { t, language } = useApp();
  return error ? (
    <div role="alert" className="notice error">
      {language === "ar"
        ? errors[error.code] ||
          "تعذّر تنفيذ الطلب. راجع المدخلات وأعد المحاولة."
        : error.message}
      {error.details && (
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
export function InterestPicker({ value, onChange }) {
  const { t } = useApp();
  return (
    <div className="chips">
      {Object.entries(interests).map(([key, labels]) => (
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
export function ModeNotice({ mode }) {
  const { t } = useApp();
  return mode === "mock" ? (
    <p className="notice compact">
      {t(
        "Development mode · sample offers and places, not live prices.",
        "وضع تجريبي · عروض وأماكن للاختبار، وليست أسعاراً مباشرة.",
      )}
    </p>
  ) : null;
}
