import { useState } from "react";
import { api } from "../api/client";
import { useResource, ResourceState } from "../api/useResource";
import DeviceCard from "../components/DeviceCard";
import { ORDER_STATUSES } from "../data/mockOrders";

export default function OrdersPage({
  query,
  onQuery,
  statusFilter,
  onFilter,
  onOpen,
  onNew,
}) {
  const [page, setPage] = useState(1);
  const [retry, setRetry] = useState(0);
  const resource = useResource(signal => api.getOrders({ search: query, status: statusFilter, page, limit: 10 }, signal), [query, statusFilter, page, retry], true, 300);
  const orders = resource.result?.data || [];
  const meta = resource.result?.meta;
  function changeQuery(value) { setPage(1); onQuery(value); }
  function changeFilter(value) { setPage(1); onFilter(value); }
  function reset() {
    changeQuery("");
    changeFilter("");
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
              maxLength={100}
              value={query}
              onChange={(event) => changeQuery(event.target.value)}
              placeholder="اسم العميل، رقم الطلب، الجهاز أو الهاتف…"
            />
          </div>
          <div className="filter-field">
            <label htmlFor="status-filter">حالة الطلب</label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(event) => changeFilter(event.target.value)}
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
          {!resource.loading && !resource.error && meta ? `${meta.total} طلبات — صفحة ${meta.page} من ${meta.totalPages}` : ""}
        </div>
        <ResourceState resource={resource} onRetry={() => setRetry(v => v + 1)} />
        <div className="device-list">
          {!resource.loading && !resource.error && orders.map((order) => (
            <DeviceCard key={order.id} order={order} onOpen={onOpen} />
          ))}
        </div>
        {!resource.loading && !resource.error && !orders.length && (
          <div className="empty-state">
            <span aria-hidden="true">⌕</span>
            <h2>
              {query || statusFilter ? "لا توجد طلبات مطابقة" : "لا توجد طلبات بعد"}
            </h2>
            <p>
              {query || statusFilter
                ? "جرّب اسمًا آخر أو امسح الفلاتر لعرض كل الطلبات."
                : "أضف أول جهاز لبدء متابعة الصيانة."}
            </p>
            <button
              className="button primary"
              onClick={query || statusFilter ? reset : onNew}
            >
              {query || statusFilter ? "مسح الفلاتر" : "إضافة أول طلب"}
            </button>
          </div>
        )}
        {meta && meta.totalPages > 1 && <div className="actions pagination" aria-label="صفحات الطلبات">
          <button className="button secondary" disabled={resource.loading || page <= 1} onClick={() => setPage(v => v - 1)}>السابق</button>
          <span>{page} / {meta.totalPages}</span>
          <button className="button secondary" disabled={resource.loading || page >= meta.totalPages} onClick={() => setPage(v => v + 1)}>التالي</button>
        </div>}
      </section>
    </>
  );
}
