import DeviceCard from "../components/DeviceCard";
import { ORDER_STATUSES } from "../data/mockOrders";

export default function OrdersPage({
  orders,
  query,
  onQuery,
  statusFilter,
  onFilter,
  onOpen,
  onNew,
}) {
  const normalizedQuery = query
    .trim()
    .toLowerCase()
    .replace(/[٠-٩]/g, (digit) => "٠١٢٣٤٥٦٧٨٩".indexOf(digit));
  const filtered = orders.filter(
    (order) =>
      (!statusFilter || order.status === statusFilter) &&
      [order.id, order.customerName, order.deviceName, order.phone].some(
        (value) => String(value).toLowerCase().includes(normalizedQuery),
      ),
  );
  function reset() {
    onQuery("");
    onFilter("");
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">كل التفاصيل في مكان واحد</span>
          <h1>طلبات الصيانة</h1>
          <p>ابحث عن جهاز، واطّلع على حالته وخطوته التالية.</p>
        </div>
        <button className="button primary" onClick={onNew}>
          ＋ إضافة طلب جديد
        </button>
      </div>
      <section className="panel">
        <div className="filter-bar">
          <div className="search-field">
            <label htmlFor="search">البحث في الطلبات</label>
            <input
              id="search"
              type="search"
              value={query}
              onChange={(event) => onQuery(event.target.value)}
              placeholder="اسم العميل، رقم الطلب، الجهاز أو الهاتف…"
            />
          </div>
          <div className="filter-field">
            <label htmlFor="status-filter">حالة الطلب</label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(event) => onFilter(event.target.value)}
            >
              <option value="">جميع الحالات</option>
              {ORDER_STATUSES.map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
          </div>
          <button className="button secondary reset-button" onClick={reset}>
            مسح الفلاتر
          </button>
        </div>
        <div className="results-count" role="status">
          {filtered.length} من {orders.length} طلبات
        </div>
        <div className="device-list">
          {filtered.map((order) => (
            <DeviceCard key={order.id} order={order} onOpen={onOpen} />
          ))}
        </div>
        {!filtered.length && (
          <div className="empty-state">
            <span aria-hidden="true">⌕</span>
            <h2>
              {orders.length ? "لا توجد طلبات مطابقة" : "لا توجد طلبات بعد"}
            </h2>
            <p>
              {orders.length
                ? "جرّب اسمًا آخر أو امسح الفلاتر لعرض كل الطلبات."
                : "أضف أول جهاز لبدء متابعة الصيانة."}
            </p>
            <button
              className="button primary"
              onClick={orders.length ? reset : onNew}
            >
              {orders.length ? "مسح الفلاتر" : "إضافة أول طلب"}
            </button>
          </div>
        )}
      </section>
    </>
  );
}
