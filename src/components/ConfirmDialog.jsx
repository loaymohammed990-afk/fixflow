import { useEffect, useRef } from "react";

export default function ConfirmDialog({ orderId, onConfirm, onClose, busy, error }) {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog.showModal();
    return () => dialog.close();
  }, []);

  function keepFocusInDialog(event) {
    if (event.key !== "Tab") return;
    const buttons = ref.current.querySelectorAll("button");
    const first = buttons[0];
    const last = buttons[buttons.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
  return (
    <dialog
      ref={ref}
      className="confirm-dialog"
      aria-labelledby="confirm-title"
      aria-describedby="confirm-description"
      onCancel={(event) => { event.preventDefault(); if (!busy) onClose(); }}
      onKeyDown={keepFocusInDialog}
    >
      <div className="dialog-icon" aria-hidden="true">
        !
      </div>
      <h2 id="confirm-title">إلغاء الطلب #{orderId}؟</h2>
      <p id="confirm-description">
        ستتغير حالة الطلب إلى «ملغي». سيبقى سجل الطلب موجودًا، ويمكن تغيير حالته
        لاحقًا.
      </p>
      {error && <p className="field-error" role="alert">{error}</p>}
      <div className="actions">
        <button className="button secondary" autoFocus disabled={busy} onClick={onClose}>
          تراجع
        </button>
        <button className="button danger" disabled={busy} onClick={onConfirm}>
          {busy ? "جارٍ الحفظ..." : "تأكيد الإلغاء"}
        </button>
      </div>
    </dialog>
  );
}
