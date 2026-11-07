import { useRef, useState } from "react";
import { useAuth } from "../auth/useAuth";

export default function LoginPage() {
  const { login, notice } = useAuth();
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef(false);

  async function submit(event) {
    event.preventDefault();
    if (pending.current) return;
    const values = Object.fromEntries(new FormData(event.currentTarget));
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      await login(values);
    } catch (failure) {
      setError(failure.message);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  return (
    <main className="auth-shell" dir="rtl">
      <section className="panel auth-panel" aria-labelledby="login-title">
        <div className="brand"><span className="brand-mark" aria-hidden="true">f<span>·</span></span><strong dir="ltr">FixFlow</strong></div>
        <h1 id="login-title">تسجيل الدخول</h1>
        {notice && <p role="status">{notice}</p>}
        <form className="auth-fields" onSubmit={submit}>
          <label className="field">
            البريد الإلكتروني
            <input type="email" name="email" dir="ltr" autoComplete="username" maxLength={254} required />
          </label>
          <label className="field">
            كلمة المرور
            <input type={visible ? "text" : "password"} name="password" dir="ltr" autoComplete="current-password" maxLength={1024} required />
          </label>
          <button className="text-button" type="button" onClick={() => setVisible(value => !value)}>
            {visible ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
          </button>
          {error && <p className="field-error" role="alert">{error}</p>}
          <button className="button primary" disabled={busy}>{busy ? "جارٍ تسجيل الدخول…" : "تسجيل الدخول"}</button>
        </form>
      </section>
    </main>
  );
}
