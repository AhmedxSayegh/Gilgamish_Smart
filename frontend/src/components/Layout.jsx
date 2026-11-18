import { useState } from "react";
import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { assets } from "../lib/assets";
import { useApp } from "../lib/context";
import { Icon, LanguageButton } from "./UI";
export function Logo() {
  return (
    <Link to="/" className="logo" aria-label="Gilgamish Smart">
      <img src={assets.logo} alt="Gilgamish Smart" width="123" height="48" />
    </Link>
  );
}
export function Layout() {
  const { t, user, logout, notify } = useApp();
  const [open, setOpen] = useState(false);
  const location = useLocation(),
    navigate = useNavigate();
  async function signOut() {
    try {
      await logout();
      setOpen(false);
      navigate("/");
    } catch (e) {
      notify(t(e.message, "تعذّر تسجيل الخروج. أعد المحاولة."));
    }
  }
  const nav = [
    ["/", "Home", "الرئيسية"],
    ["/planner", "Trip Planner", "خطّط رحلتك"],
    ["/dashboard", "Dashboard", "لوحة التحكم"],
    ["/about", "About", "عن جلجامش"],
    ["/contact", "Contact", "تواصل معنا"],
  ];
  return (
    <>
      <a className="skip-link" href="#main">
        {t("Skip to content", "انتقل إلى المحتوى")}
      </a>
      <header className="site-header">
        <div className="container header-inner">
          <Logo />
          <button
            className="mobile-menu icon-button"
            aria-label={t("Navigation", "قائمة التنقل")}
            aria-expanded={open}
            aria-controls="main-navigation"
            onClick={() => setOpen(!open)}
          >
            ☰
          </button>
          <nav
            id="main-navigation"
            className={open ? "open" : ""}
            aria-label={t("Main navigation", "التنقل الرئيسي")}
          >
            {nav.map(([to, en, ar]) => (
              <NavLink
                to={to}
                end={to === "/"}
                key={to}
                onClick={() => setOpen(false)}
              >
                {t(en, ar)}
              </NavLink>
            ))}
            {user ? (
              <>
                <Link
                  className="mobile-account"
                  to="/profile"
                  onClick={() => setOpen(false)}
                >
                  {t("Profile", "الملف الشخصي")}
                </Link>
                <button
                  className="mobile-account text-button"
                  onClick={signOut}
                >
                  {t("Sign out", "خروج")}
                </button>
              </>
            ) : (
              <>
                <Link
                  className="mobile-account"
                  to="/login"
                  onClick={() => setOpen(false)}
                >
                  {t("Sign In", "دخول")}
                </Link>
                <Link
                  className="mobile-account"
                  to="/register"
                  onClick={() => setOpen(false)}
                >
                  {t("Get Started", "ابدأ الآن")}
                </Link>
              </>
            )}
          </nav>
          <div className="header-actions">
            <LanguageButton />
            {user ? (
              <>
                <Link className="account-link" to="/profile">
                  {user.name.split(" ")[0]}
                </Link>
                <button className="button small" onClick={signOut}>
                  {t("Sign out", "خروج")}
                </button>
              </>
            ) : (
              <>
                <Link className="sign-in-link" to="/login">
                  {t("Sign In", "دخول")}
                </Link>
                <Link className="button small" to="/register">
                  {t("Get Started", "ابدأ الآن")}
                </Link>
              </>
            )}
          </div>
        </div>
      </header>
      <main id="main" key={location.pathname}>
        <Outlet />
      </main>
      <footer className="site-footer">
        <div className="container footer-inner">
          <div>
            <Logo />
            <p>
              {t(
                "Heritage travel, intelligently planned.",
                "سفر يزخر بالتراث، بتخطيط ذكي.",
              )}
            </p>
          </div>
          <div>
            <span className="brand-line">
              <Icon name="brand" />
              Gilgamish Smart
            </span>
            <Link to="/contact?message=1">contact@gilgamish.smart</Link>
            <p>
              {t(
                "© 2026 — All rights reserved.",
                "© ٢٠٢٦ — جميع الحقوق محفوظة.",
              )}
            </p>
          </div>
          <p className="footer-note">
            {t("Crafted with heritage in mind.", "صُمّم بروح التراث.")}
          </p>
        </div>
      </footer>
    </>
  );
}
