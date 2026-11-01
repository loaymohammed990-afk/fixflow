import { ORDER_STATUSES, STATUS_CLASSES } from "../data/mockOrders";

export default function StatusBadge({ status }) {
  return (
    <span
      className={`status ${STATUS_CLASSES[ORDER_STATUSES.indexOf(status)] || "received"}`}
    >
      <span aria-hidden="true">●</span>
      {status}
    </span>
  );
}
