import { useState } from "react";

const emptyOrder = {
  customerName: "",
  phone: "",
  deviceType: "",
  deviceName: "",
  serialNumber: "",
  problem: "",
};

export default function OrderForm({ order, onSave, onCancel }) {
  const [values, setValues] = useState(order || emptyOrder);
  const [errors, setErrors] = useState({});

  function change(event) {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: "" }));
  }

  function submit(event) {
    event.preventDefault();
    const cleaned = Object.fromEntries(
      Object.entries(values).map(([key, value]) => [
        key,
        typeof value === "string" ? value.trim() : value,
      ]),
    );
    // قبول الأرقام العربية أيضًا، دون افتراض بلد معين.
    cleaned.phone = cleaned.phone
      .replace(/[٠-٩]/g, (digit) => "٠١٢٣٤٥٦٧٨٩".indexOf(digit))
      .replace(/[۰-۹]/g, (digit) => "۰۱۲۳۴۵۶۷۸۹".indexOf(digit));
    const nextErrors = {};
    if (!cleaned.customerName) nextErrors.customerName = "أدخل اسم العميل.";
    if (!/^\+?\d{7,15}$/.test(cleaned.phone))
      nextErrors.phone = "أدخل من 7 إلى 15 رقمًا، مع + اختياريًا في البداية.";
    if (!["جوال", "لابتوب"].includes(cleaned.deviceType))
      nextErrors.deviceType = "اختر نوع الجهاز.";
    if (!cleaned.deviceName)
      nextErrors.deviceName = "أدخل موديل أو اسم الجهاز.";
    if (!cleaned.problem) nextErrors.problem = "اكتب وصفًا للمشكلة.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      event.currentTarget
        .querySelector(`[name="${Object.keys(nextErrors)[0]}"]`)
        .focus();
      return;
    }
    onSave(cleaned);
  }

  function field(name, label, options = {}) {
    return (
      <div className={`field ${options.wide ? "wide" : ""}`}>
        <label htmlFor={name}>
          {label}{" "}
          {name === "serialNumber" ? (
            <span className="optional">اختياري</span>
          ) : (
            <span className="required">*</span>
          )}
        </label>
        <input
          id={name}
          name={name}
          value={values[name]}
          onChange={change}
          required={name !== "serialNumber"}
          aria-invalid={!!errors[name]}
          aria-describedby={
            errors[name]
              ? `${name}-error`
              : name === "phone"
                ? "phone-hint"
                : undefined
          }
          {...options.input}
        />
        {name === "phone" && (
          <small id="phone-hint">تحقق شكلي للتجربة، دون تحديد دولة.</small>
        )}
        {errors[name] && (
          <small className="field-error" id={`${name}-error`}>
            {errors[name]}
          </small>
        )}
      </div>
    );
  }

  return (
    <form className="panel order-form" onSubmit={submit} noValidate>
      <div className="form-section">
        <span className="section-number">01</span>
        <div>
          <h2>بيانات العميل</h2>
          <p>لمن يعود الجهاز؟</p>
        </div>
      </div>
      <div className="form-grid">
        {field("customerName", "اسم العميل", {
          input: {
            autoComplete: "name",
            placeholder: "مثال: أحمد محمد",
            maxLength: 100,
          },
        })}
        {field("phone", "رقم الهاتف", {
          input: {
            type: "tel",
            dir: "ltr",
            autoComplete: "tel",
            placeholder: "+967700000000",
            maxLength: 20,
          },
        })}
      </div>
      <div className="form-section">
        <span className="section-number">02</span>
        <div>
          <h2>الجهاز والمشكلة</h2>
          <p>تفاصيل تساعدك على متابعة الصيانة.</p>
        </div>
      </div>
      <div className="form-grid">
        <div className="field">
          <label htmlFor="deviceType">
            نوع الجهاز <span className="required">*</span>
          </label>
          <select
            id="deviceType"
            name="deviceType"
            value={values.deviceType}
            onChange={change}
            required
            aria-invalid={!!errors.deviceType}
            aria-describedby={
              errors.deviceType ? "deviceType-error" : undefined
            }
          >
            <option value="">اختر نوع الجهاز</option>
            <option>جوال</option>
            <option>لابتوب</option>
          </select>
          {errors.deviceType && (
            <small className="field-error" id="deviceType-error">
              {errors.deviceType}
            </small>
          )}
        </div>
        {field("deviceName", "موديل / اسم الجهاز", {
          input: {
            placeholder: "مثال: iPhone 15",
            dir: "auto",
            maxLength: 100,
          },
        })}
        {field("serialNumber", "الرقم التسلسلي", {
          wide: true,
          input: {
            placeholder: "مثال: DEMO-SN-1043",
            dir: "ltr",
            maxLength: 100,
          },
        })}
        <div className="field wide">
          <label htmlFor="problem">
            وصف المشكلة <span className="required">*</span>
          </label>
          <textarea
            id="problem"
            name="problem"
            rows="4"
            value={values.problem}
            onChange={change}
            required
            maxLength={2000}
            placeholder="صف العطل أو المشكلة التي يواجهها العميل…"
            aria-invalid={!!errors.problem}
            aria-describedby={errors.problem ? "problem-error" : undefined}
          />
          {errors.problem && (
            <small className="field-error" id="problem-error">
              {errors.problem}
            </small>
          )}
        </div>
      </div>
      <div className="form-footer">
        <small>الحقول المشار إليها بـ * مطلوبة</small>
        <div className="actions">
          <button type="button" className="button secondary" onClick={onCancel}>
            تراجع
          </button>
          <button className="button primary" type="submit">
            {order ? "حفظ التعديلات" : "إضافة الطلب"}
          </button>
        </div>
      </div>
    </form>
  );
}
