import { useRef, useState } from "react";
import { useAuth } from "../auth/useAuth";

export const roleLabels = { admin: "مدير", staff: "موظف" };

export default function ProfilePage({ required = false }) {
  const { user, changePassword, logout } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef(false);

  async function run(action) {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (failure) {
      setError(failure.fieldErrors?.newPassword || failure.message);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  function submit(event) {
    event.preventDefault();
    const { currentPassword, newPassword, confirmation } = Object.fromEntries(new FormData(event.currentTarget));
    if (newPassword !== confirmation) {
      setError("كلمتا المرور الجديدتان غير متطابقتين.");
      return;
    }
    run(() => changePassword({ currentPassword, newPassword }));
  }

  return (
    <section className="panel auth-panel" dir="rtl">
      <h1>{required ? "غيّر كلمة المرور المؤقتة" : "الملف الشخصي"}</h1>
      <p><strong>{user.name}</strong> · {roleLabels[user.role]}</p>
      <p><bdi>{user.email}</bdi></p>
      <p>اختر كلمة مرور من 12 حرفًا على الأقل. بعد الحفظ سجّل الدخول بكلمة المرور الجديدة.</p>
      <form className="auth-fields" onSubmit={submit}>
        <label className="field">
          كلمة المرور الحالية
          <input type="password" name="currentPassword" dir="ltr" autoComplete="current-password" maxLength={1024} required />
        </label>
        <label className="field">
          كلمة المرور الجديدة
          <input type="password" name="newPassword" dir="ltr" autoComplete="new-password" minLength={12} maxLength={1024} required />
        </label>
        <label className="field">
          تأكيد كلمة المرور الجديدة
          <input type="password" name="confirmation" dir="ltr" autoComplete="new-password" required />
        </label>
        {error && <p role="alert" className="field-error">{error}</p>}
        <button className="button primary" disabled={busy}>{busy ? "جارٍ التنفيذ…" : "تغيير كلمة المرور"}</button>
        {required && <button className="button secondary" type="button" disabled={busy} onClick={() => run(logout)}>تسجيل الخروج</button>}
      </form>
    </section>
  );
}
