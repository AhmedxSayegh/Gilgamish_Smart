import { useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { assets } from "../lib/assets";
import { useApp } from "../lib/context";
import { Logo } from "../components/Layout";
import { LanguageButton, Field, ErrorMessage, Modal } from "../components/UI";
export function Auth({ register = false }) {
  const { t, language, user, authenticate } = useApp(),
    navigate = useNavigate();
  const [search] = useSearchParams();
  const next =
    search.get("next")?.startsWith("/") && !search.get("next").startsWith("//")
      ? search.get("next")
      : "/dashboard";
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(null),
    [social, setSocial] = useState("");
  if (user) return <Navigate to={next} replace />;
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const values = Object.fromEntries(new FormData(e.currentTarget));
    if (register) values.language = language;
    try {
      await authenticate(register ? "register" : "login", values);
      navigate(next, { replace: true });
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className={"auth-page " + (register ? "register" : "login")}>
      <section className="auth-image">
        <img className="auth-background" src={assets.hero} alt="" />
        <div className="auth-gradient" />
        <Logo />
        <div className="auth-story">
          <h2>
            {t(
              <>
                Travel,
                <br />
                the Gilgamish way.
              </>,
              <>
                سافر،
                <br />
                على طريقة جلجامش.
              </>,
            )}
          </h2>
          <p>
            {t(
              "Heritage-rich, AI-crafted journeys for the modern traveler.",
              "رحلات غنية بالتراث يصمّمها الذكاء الاصطناعي للمسافر العصري.",
            )}
          </p>
        </div>
      </section>
      <section className="auth-right">
        <div className="auth-language">
          <LanguageButton />
        </div>
        <div className="auth-form">
          <h1>
            {register
              ? t("Create your account", "أنشئ حسابك")
              : t("Welcome back", "مرحباً بعودتك")}
          </h1>
          <p>
            {register
              ? t(
                  "Join thousands of travelers planning smarter.",
                  "انضم إلى المسافرين الذين يخطّطون بذكاء.",
                )
              : t(
                  "Sign in to continue planning your journeys.",
                  "سجّل الدخول لمتابعة تخطيط رحلاتك.",
                )}
          </p>
          <form onSubmit={submit}>
            <ErrorMessage error={error} />
            {register && (
              <Field
                label={t("Full name", "الاسم الكامل")}
                name="name"
                placeholder={t("Gilgamish", "جلجامش")}
                autoComplete="name"
                required
                minLength={2}
                maxLength={100}
              />
            )}
            <Field
              label={t("Email", "البريد الإلكتروني")}
              name="email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              required
              maxLength={254}
            />
            <Field
              label={t("Password", "كلمة المرور")}
              name="password"
              type="password"
              placeholder="••••••••"
              autoComplete={register ? "new-password" : "current-password"}
              minLength={register ? 10 : 1}
              maxLength={72}
              required
              title={t(
                "At least 10 characters; at most 72 UTF-8 bytes.",
                "١٠ أحرف على الأقل، و٧٢ بايت كحد أقصى.",
              )}
              onChange={(e) =>
                e.target.setCustomValidity(
                  register &&
                    new TextEncoder().encode(e.target.value).length > 72
                    ? t(
                        "Password exceeds 72 bytes.",
                        "كلمة المرور تتجاوز ٧٢ بايت.",
                      )
                    : "",
                )
              }
            />
            <button className="button" disabled={busy}>
              {busy
                ? t("Please wait…", "يرجى الانتظار…")
                : register
                  ? t("Create account", "إنشاء حساب")
                  : t("Sign in", "تسجيل الدخول")}
            </button>
          </form>
          <div className="divider">
            <span>{t("or continue with", "أو تابع باستخدام")}</span>
          </div>
          <div className="social-buttons">
            {["Google", "Apple"].map((provider) => (
              <button
                key={provider}
                className="button secondary"
                onClick={() => setSocial(provider)}
              >
                {provider}
              </button>
            ))}
          </div>
          <Link
            className="auth-switch"
            to={
              (register ? "/login" : "/register") +
              "?next=" +
              encodeURIComponent(next)
            }
          >
            {register
              ? t(
                  "Already have an account? Sign in",
                  "لديك حساب بالفعل؟ سجّل الدخول",
                )
              : t("New here? Create an account", "جديد هنا؟ أنشئ حساباً")}
          </Link>
        </div>
      </section>
      {social && (
        <Modal title={social} onClose={() => setSocial("")}>
          <p>
            {t(
              `${social} sign-in is not configured for this installation. Please use your email and password.`,
              `تسجيل الدخول باستخدام ${social} غير مفعّل في هذه النسخة. يرجى استخدام البريد الإلكتروني وكلمة المرور.`,
            )}
          </p>
          <button className="button" onClick={() => setSocial("")}>
            {t("Use email", "استخدم البريد الإلكتروني")}
          </button>
        </Modal>
      )}
    </main>
  );
}
