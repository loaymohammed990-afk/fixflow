import { useAuth } from "../auth/useAuth";
import LoginPage from "../pages/LoginPage";
import ProfilePage from "../pages/ProfilePage";

export default function ProtectedApp({ children }) {
  const { user, authLoading, authError, reloadMe } = useAuth();
  if (authLoading) return <main className="auth-shell"><p role="status" className="panel auth-panel">جارٍ التحقق من الجلسة…</p></main>;
  if (authError) return (
    <main className="auth-shell">
      <section className="panel auth-panel">
        <p role="alert">{authError}</p>
        <button className="button secondary" onClick={() => reloadMe()}>إعادة المحاولة</button>
      </section>
    </main>
  );
  if (!user) return <LoginPage />;
  if (user.mustChangePassword) return <main className="auth-shell"><ProfilePage required /></main>;
  return children;
}
