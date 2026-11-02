import { useRef, useState } from "react";
import StatusBadge from "../components/StatusBadge";
import ConfirmDialog from "../components/ConfirmDialog";
import OrderForm from "../components/OrderForm";
import { ORDER_STATUSES } from "../data/mockOrders";

export default function OrderDetails({ order, onUpdate, onStatus, onBack }) {
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const inFlight = useRef(false);
  async function saveStatus(status) {
    if (inFlight.current) return;
    inFlight.current = true; setSaving(true); setError("");
    try { await onStatus(order.id, status); setConfirming(false); }
    catch (failure) { setError(failure.message); }
    finally { inFlight.current = false; setSaving(false); }
  }
  if (!order)
    return (
      <div className="empty-state">
        <h1>الطلب غير موجود</h1>
        <button className="button primary" onClick={onBack}>
          الرجوع للطلبات
        </button>
      </div>
    );

  function changeStatus(status) {
    if (status === ORDER_STATUSES[4]) setConfirming(true);
    else saveStatus(status);
  }

  return (
    <>
      <button className="text-button back-button" onClick={onBack}>
        → الرجوع للطلبات
      </button>
      <div className="page-heading">
        <div>
          <span className="eyebrow">طلب الصيانة #{order.id}</span>
          <h1>{editing ? "تعديل بيانات الطلب" : "تفاصيل الطلب"}</h1>
          <p>
            تاريخ الاستلام:{" "}
            {new Date(order.createdAt).toLocaleString("ar", {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </p>
        </div>
        <StatusBadge status={order.status} />
      </div>
      {error && !confirming && <p role="alert" className="field-error">{error}</p>}
      {editing ? (
        <OrderForm
          order={order}
          onSave={async (values) => {
            await onUpdate(order.id, values);
            setEditing(false);
          }}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <div className="details-grid">
          <section className="panel detail-panel">
            <div className="panel-heading">
              <h2>بيانات الطلب</h2>
              <button
                className="button secondary"
                onClick={() => setEditing(true)}
              >
                تعديل البيانات
              </button>
            </div>
            <dl className="detail-fields">
              <div>
                <dt>اسم العميل</dt>
                <dd>{order.customerName}</dd>
              </div>
              <div>
                <dt>رقم الهاتف</dt>
                <dd dir="ltr">{order.phone}</dd>
              </div>
              <div>
                <dt>نوع الجهاز</dt>
                <dd>{order.deviceType}</dd>
              </div>
              <div>
                <dt>موديل / اسم الجهاز</dt>
                <dd dir="auto">{order.deviceName}</dd>
              </div>
              <div className="wide">
                <dt>الرقم التسلسلي</dt>
                <dd dir="auto">{order.serialNumber || "غير مسجل"}</dd>
              </div>
              <div className="wide problem-detail">
                <dt>وصف المشكلة</dt>
                <dd>{order.problem}</dd>
              </div>
            </dl>
          </section>
          <aside className="panel status-panel">
            <h2>حالة الصيانة</h2>
            <p>حدّث الحالة لتظهر في القائمة ولوحة التحكم.</p>
            <label htmlFor="order-status">الحالة الحالية</label>
            <select
              id="order-status"
              disabled={saving}
              value={order.status}
              onChange={(event) => changeStatus(event.target.value)}
            >
              {ORDER_STATUSES.map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
            <div className="status-preview">
              <StatusBadge status={order.status} />
            </div>
            <div className="cancel-section">
              <h3>إلغاء طلب الصيانة</h3>
              <p>يبقى الطلب في السجل بعد إلغائه.</p>
              <button
                className="button danger-outline"
                disabled={saving || order.status === ORDER_STATUSES[4]}
                onClick={() => setConfirming(true)}
              >
                إلغاء الطلب
              </button>
            </div>
          </aside>
        </div>
      )}
      {confirming && (
        <ConfirmDialog
          orderId={order.id}
          busy={saving}
          error={error}
          onClose={() => { if (!saving) { setConfirming(false); setError(""); } }}
          onConfirm={() => saveStatus(ORDER_STATUSES[4])}
        />
      )}
    </>
  );
}
