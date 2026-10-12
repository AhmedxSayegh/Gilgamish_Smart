import { useEffect, useState } from "react";
import { useApp } from "../lib/context";
import { api, mutation } from "../lib/api";
import { ErrorMessage, Field, InterestPicker, Loading } from "../components/UI";
export function Profile() {
  const { t, user, setUser, notify } = useApp();
  const [name, setName] = useState(user.name),
    [preferences, setPreferences] = useState(null),
    [error, setError] = useState(null),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    api("/users/me/preferences").then(setPreferences).catch(setError);
  }, []);
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      setUser(await mutation("/users/me", "PATCH", { name }));
      setPreferences(
        await mutation("/users/me/preferences", "PATCH", preferences),
      );
      notify(t("Your preferences are saved.", "تم حفظ تفضيلاتك."));
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  const pref = (key, value) => setPreferences({ ...preferences, [key]: value });
  return (
    <section className="narrow-container profile-page">
      <span className="eyebrow">GILGAMISH</span>
      <h1>{t("Your travel profile", "ملفك للسفر")}</h1>
      <p className="lead">
        {t(
          "A little about you. Better journeys ahead.",
          "قليل عنك، لرحلات أفضل.",
        )}
      </p>
      <ErrorMessage error={error} />
      {!preferences ? (
        <Loading />
      ) : (
        <form onSubmit={submit} className="panel stack">
          <fieldset disabled={busy}>
            <div className="form-grid">
              <Field
                label={t("Full name", "الاسم الكامل")}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                minLength={2}
                maxLength={100}
              />
              <Field
                label={t("Email", "البريد الإلكتروني")}
                value={user.email}
                type="email"
                readOnly
              />
              <Field label={t("Default currency", "العملة الافتراضية")}>
                <select
                  value={preferences.currency}
                  onChange={(e) => pref("currency", e.target.value)}
                >
                  {["USD", "SAR", "EUR", "GBP", "AED", "TRY"].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </Field>
              <Field label={t("Travel pace", "إيقاع الرحلة")}>
                <select
                  value={preferences.pace}
                  onChange={(e) => pref("pace", e.target.value)}
                >
                  <option value="relaxed">{t("Relaxed", "هادئ")}</option>
                  <option value="balanced">{t("Balanced", "متوازن")}</option>
                  <option value="busy">{t("Busy", "مكثّف")}</option>
                </select>
              </Field>
              <Field label={t("Hotel stars", "نجوم الفندق")}>
                <select
                  value={preferences.hotelStars}
                  onChange={(e) => pref("hotelStars", Number(e.target.value))}
                >
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>
                      {n} ★
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={t("Flight preference", "تفضيل الطيران")}>
                <select
                  value={preferences.flightOption}
                  onChange={(e) => pref("flightOption", e.target.value)}
                >
                  <option value="cheapest">
                    {t("Lowest price", "أقل سعر")}
                  </option>
                  <option value="shortest">
                    {t("Shortest duration", "أقصر مدة")}
                  </option>
                </select>
              </Field>
            </div>
            <h3>{t("Your interests", "اهتماماتك")}</h3>
            <InterestPicker
              value={preferences.interests}
              onChange={(value) => pref("interests", value)}
            />
            <button className="button">
              {busy
                ? t("Saving…", "جارٍ الحفظ…")
                : t("Save preferences", "حفظ التفضيلات")}
            </button>
          </fieldset>
        </form>
      )}
    </section>
  );
}
