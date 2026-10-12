import { createContext, useContext, useEffect, useState } from "react";
import { api, mutation, setCsrf } from "./api";
const Context = createContext(null);
export function AppProvider({ children }) {
  const [language, setLanguage] = useState(() =>
    localStorage.getItem("gilgamish-language") === "ar" ? "ar" : "en",
  );
  const [user, setUser] = useState(null),
    [loading, setLoading] = useState(true),
    [sessionError, setSessionError] = useState(null);
  const [mode, setMode] = useState(null),
    [toast, setToast] = useState("");
  const t = (en, ar) => (language === "ar" ? (ar ?? en) : en);
  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
    localStorage.setItem("gilgamish-language", language);
  }, [language]);
  async function restore() {
    setLoading(true);
    setSessionError(null);
    try {
      const data = await api("/auth/me");
      setUser(data.user);
      setCsrf(data.csrfToken);
      setLanguage(data.user.language);
    } catch (error) {
      if (error.status !== 401) setSessionError(error);
      setUser(null);
      setCsrf(null);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    restore();
    api("/health")
      .then((data) => setMode(data.mode))
      .catch(() => {});
  }, []);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(""), 6000);
    return () => clearTimeout(id);
  }, [toast]);
  async function authenticate(kind, body) {
    const data = await mutation("/auth/" + kind, "POST", body);
    setCsrf(data.csrfToken);
    setUser(data.user);
    setLanguage(data.user.language);
    return data.user;
  }
  async function toggleLanguage() {
    const next = language === "en" ? "ar" : "en";
    setLanguage(next);
    if (user)
      try {
        setUser(await mutation("/users/me", "PATCH", { language: next }));
      } catch {
        setToast(
          next === "ar"
            ? "تغيّرت لغة العرض؛ تعذّر حفظ التفضيل في الحساب."
            : "Display language changed; account preference could not be saved.",
        );
      }
  }
  async function logout() {
    await mutation("/auth/logout", "POST");
    setCsrf(null);
    setUser(null);
    sessionStorage.removeItem("gilgamish-planner");
  }
  const money = (value, currency = "USD") =>
    new Intl.NumberFormat(language === "ar" ? "ar-SA" : "en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(Number(value || 0));
  const date = (value) =>
    value
      ? new Intl.DateTimeFormat(
          language === "ar" ? "ar-SA-u-ca-gregory" : "en-US",
          { year: "numeric", month: "short", day: "numeric" },
        ).format(new Date(value.slice(0, 10) + "T12:00:00"))
      : "";
  return (
    <Context.Provider
      value={{
        t,
        language,
        user,
        setUser,
        loading,
        sessionError,
        restore,
        mode,
        authenticate,
        logout,
        toggleLanguage,
        money,
        date,
        notify: setToast,
      }}
    >
      {children}
      {toast && (
        <div className="toast" role="status">
          {toast}
          <button
            onClick={() => setToast("")}
            aria-label={t("Dismiss", "إغلاق")}
          >
            ×
          </button>
        </div>
      )}
    </Context.Provider>
  );
}
export const useApp = () => useContext(Context);
