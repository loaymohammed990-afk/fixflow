import { useRef, useState } from "react";
import { api } from "../api/client";
import { ResourceState, useResource } from "../api/useResource";
import { useAuth } from "../auth/useAuth";
import { roleLabels } from "./ProfilePage";

export default function UsersPage() {
  const { user, reloadMe } = useAuth();
  const [retry, setRetry] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [issued, setIssued] = useState(null);
  const pending = useRef(false);
  const resource = useResource(api.getUsers, [retry]);
  const refresh = () => setRetry(value => value + 1);

  async function run(action) {
    if (pending.current || issued) return;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (failure) {
      setError(failure.message);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  function create(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    run(async () => {
      const { data } = await api.createUser(values);
      form.reset();
      setIssued(data);
      refresh();
    });
  }

  function update(target, values) {
    if (values.isActive === false && !window.confirm(`تعطيل حساب «${target.name}» وإنهاء جلساته؟`)) return;
    run(async () => {
      await api.patchUser(target.id, values);
      if (target.id === user.id) await reloadMe();
      else refresh();
    });
  }

  function reset(target) {
    if (!window.confirm(`إعادة ضبط كلمة مرور «${target.name}» وإنهاء جلساته؟`)) return;
    run(async () => {
      const { data } = await api.resetPassword(target.id);
      setIssued(data);
      if (target.id !== user.id) refresh();
    });
  }

  function dismissPassword() {
    const resetSelf = issued.user.id === user.id;
    setIssued(null);
    if (resetSelf) reloadMe();
  }

  return (
    <>
      <div className="page-heading"><div><span className="eyebrow">الحسابات والصلاحيات</span><h1>إدارة المستخدمين</h1></div></div>
      {error && <p role="alert" className="field-error">{error}</p>}
      {issued && (
        <section className="panel auth-panel temporary-password" role="status">
          <h2>كلمة المرور المؤقتة لـ {issued.user.name}</h2>
          <p>انسخها الآن وسلّمها لصاحب الحساب بطريقة آمنة. ستختفي عند إغلاق هذه الرسالة أو مغادرة الصفحة.</p>
          <p><code dir="ltr">{issued.temporaryPassword}</code></p>
          <button className="button secondary" onClick={dismissPassword}>إخفاء كلمة المرور</button>
        </section>
      )}
      <form className="panel auth-panel auth-fields" onSubmit={create}>
        <h2>إضافة مستخدم</h2>
        <label className="field">الاسم<input name="name" maxLength={100} required /></label>
        <label className="field">البريد الإلكتروني<input name="email" type="email" dir="ltr" maxLength={254} required /></label>
        <label className="field">الدور
          <select name="role"><option value="staff">موظف</option><option value="admin">مدير</option></select>
        </label>
        <button className="button primary" disabled={busy || !!issued}>{busy ? "جارٍ التنفيذ…" : "إنشاء الحساب"}</button>
      </form>
      <ResourceState resource={resource} onRetry={refresh} />
      {resource.result && (
        <section className="panel auth-panel users-list" aria-label="حسابات المستخدمين">
          {resource.result.data.map(target => (
            <div className="user-row" key={target.id}>
              <div>
                <strong>{target.name}</strong>
                <div><bdi>{target.email}</bdi></div>
                <small>{target.isActive ? "نشط" : "معطّل"}{target.mustChangePassword && " · تغيير كلمة المرور مطلوب"}</small>
              </div>
              <div className="user-actions">
                <select aria-label={`دور ${target.name}`} value={target.role} disabled={busy || !!issued}
                  onChange={event => update(target, { role: event.target.value })}>
                  {Object.entries(roleLabels).map(([role, label]) => <option key={role} value={role}>{label}</option>)}
                </select>
                <button className="button secondary" disabled={busy || !!issued} onClick={() => update(target, { isActive: !target.isActive })}>
                  {target.isActive ? "تعطيل" : "تفعيل"}
                </button>
                <button className="button secondary" disabled={busy || !!issued} onClick={() => reset(target)}>إعادة ضبط كلمة المرور</button>
              </div>
            </div>
          ))}
        </section>
      )}
    </>
  );
}
