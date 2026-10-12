import { Component, useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
  useLocation,
  Link,
} from "react-router-dom";
import { AppProvider, useApp } from "./lib/context";
import { Layout } from "./components/Layout";
import { Loading, ErrorMessage } from "./components/UI";
import { Home, About, Contact } from "./pages/Public";
import { Auth } from "./pages/Auth";
import { Dashboard } from "./pages/Dashboard";
import { Planner } from "./pages/Planner";
import { Plan } from "./pages/Plan";
import { Profile } from "./pages/Profile";
function Protected() {
  const { user, loading, sessionError, restore, t } = useApp();
  const location = useLocation();
  if (loading) return <Loading />;
  if (sessionError)
    return (
      <div className="container page-space">
        <ErrorMessage error={sessionError} />
        <button className="button" onClick={restore}>
          {t("Reconnect", "إعادة الاتصال")}
        </button>
      </div>
    );
  return user ? (
    <Outlet />
  ) : (
    <Navigate
      to={
        "/login?next=" + encodeURIComponent(location.pathname + location.search)
      }
      replace
    />
  );
}
function ScrollAndTitle() {
  const { pathname, hash } = useLocation();
  const { t, language } = useApp();
  useEffect(() => {
    if (!hash) window.scrollTo(0, 0);
    const page =
      pathname === "/"
        ? t(
            "Heritage travel, intelligently planned.",
            "سفر بروح التراث وتخطيط ذكي",
          )
        : pathname.split("/")[1];
    document.title = page + " | Gilgamish Smart";
  }, [pathname, hash, language]);
  return null;
}
function NotFound() {
  const { t } = useApp();
  return (
    <section className="container page-space">
      <h1>
        {t("This path is still unexplored.", "هذا الطريق لم يُكتشف بعد.")}
      </h1>
      <p>
        {t(
          "The page you’re looking for could not be found.",
          "لم يتم العثور على الصفحة المطلوبة.",
        )}
      </p>
      <Link className="button" to="/">
        {t("Return home", "العودة للرئيسية")}
      </Link>
    </section>
  );
}
class ErrorBoundary extends Component {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    return this.state.error ? (
      <main className="container page-space">
        <h1>Something went wrong · حدث خطأ</h1>
        <p>Please reload this page. · يرجى إعادة تحميل الصفحة.</p>
        <button className="button" onClick={() => window.location.reload()}>
          Reload · إعادة التحميل
        </button>
      </main>
    ) : (
      this.props.children
    );
  }
}
export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AppProvider>
          <ScrollAndTitle />
          <Routes>
            <Route path="login" element={<Auth />} />
            <Route path="register" element={<Auth register />} />
            <Route element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="about" element={<About />} />
              <Route path="contact" element={<Contact />} />
              <Route element={<Protected />}>
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="trips" element={<Dashboard allTrips />} />
                <Route path="planner" element={<Planner />} />
                <Route path="plans/:id" element={<Plan />} />
                <Route path="profile" element={<Profile />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </AppProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
