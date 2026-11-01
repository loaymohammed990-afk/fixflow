import StatusBadge from "./StatusBadge";

export default function DeviceCard({ order, onOpen }) {
  return (
    <button
      className="device-card"
      onClick={() => onOpen(order.id)}
      aria-label={`تفاصيل الطلب ${order.id}، ${order.customerName}`}
    >
      <span
        className={`device-icon ${order.deviceType === "لابتوب" ? "laptop" : ""}`}
        aria-hidden="true"
      >
        <span />
      </span>
      <span className="device-info">
        <strong dir="auto">{order.deviceName}</strong>
        <span>{order.customerName}</span>
        {order.serialNumber && <small dir="ltr">{order.serialNumber}</small>}
      </span>
      <span className="order-number">#{order.id}</span>
      <StatusBadge status={order.status} />
      <span className="card-arrow" aria-hidden="true">
        ←
      </span>
    </button>
  );
}
