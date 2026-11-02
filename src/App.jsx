import { useState } from "react";
import { api } from "./api/client";
import { useResource, ResourceState } from "./api/useResource";
import Dashboard from "./pages/Dashboard";
import OrdersPage from "./pages/OrdersPage";
import OrderDetails from "./pages/OrderDetails";
import OrderForm from "./components/OrderForm";

export default function App() {
  const [order, setOrder] = useState(null);
  const [page, setPage] = useState("dashboard");
  const [selectedId, setSelectedId] = useState(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [feedback, setFeedback] = useState("");
  const [retry, setRetry] = useState(0);
  const resource = useResource(signal => page === "dashboard" ? api.getDashboardSummary(signal) : api.getOrder(selectedId, signal), [page, selectedId, retry], page === "dashboard" || page === "details");

  function navigate(target) {
    setPage(target);
    setFeedback("");
  }
  function openOrder(id) {
    setOrder(null);
    setSelectedId(id);
    navigate("details");
  }
  function openOrders(status = "") {
    setQuery("");
    setStatusFilter(status);
    navigate("orders");
  }
  async function addOrder(values) {
    const { data } = await api.createOrder(values);
    setOrder(data);
    setSelectedId(data.id);
    setPage("details");
    setFeedback(`تم حفظ الطلب #${data.id} بنجاح.`);
    return data;
  }
  async function updateOrder(id, values) {
    const { data } = await api.patchOrder(id, values);
    setOrder(data);
    setFeedback(`تم حفظ تعديلات الطلب #${id}.`);
    return data;
  }
  async function updateStatus(id, status) {
    const { data } = await api.patchOrderStatus(id, status);
    setOrder(data);
    setFeedback(`تم تحديث حالة الطلب #${id}.`);
    return data;
  }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        انتقل إلى المحتوى
      </a>
      <header className="app-header">
        <div className="header-inner">
          <button
            className="brand"
            onClick={() => navigate("dashboard")}
            aria-label="FixFlow الرئيسية"
          >
            <span className="brand-mark" aria-hidden="true">
              f<span>·</span>
            </span>
            <span>
              <strong dir="ltr">FixFlow</strong>
              <small>إدارة الصيانة ببساطة</small>
            </span>
          </button>
          <nav aria-label="التنقل الرئيسي">
            <button
              className={page === "dashboard" ? "active" : ""}
              aria-current={page === "dashboard" ? "page" : undefined}
              onClick={() => navigate("dashboard")}
            >
              الرئيسية
            </button>
            <button
              className={["orders", "details"].includes(page) ? "active" : ""}
              aria-current={
                ["orders", "details"].includes(page) ? "page" : undefined
              }
              onClick={() => openOrders()}
            >
              الطلبات
            </button>
            <button
              className={page === "new" ? "active" : ""}
              aria-current={page === "new" ? "page" : undefined}
              onClick={() => navigate("new")}
            >
              إضافة طلب
            </button>
          </nav>
          <span className="demo-badge">
            <span aria-hidden="true">●</span> نسخة تعليمية
          </span>
        </div>
      </header>
      <main id="main" tabIndex={-1}>
        <div className="workspace-line">
          <span>
            مركز الصيانة <span className="separator">/</span> مساحة العمل
          </span>
          <span className="session-indicator">
            <span aria-hidden="true">●</span> جلسة محلية
          </span>
        </div>
        {feedback && (
          <div className="feedback" role="status">
            <span>✓ {feedback}</span>
            <button aria-label="إغلاق الرسالة" onClick={() => setFeedback("")}>
              ×
            </button>
          </div>
        )}
        {(page === "dashboard" || page === "details") && <ResourceState resource={resource} onRetry={() => setRetry(v => v + 1)} />}
        {page === "dashboard" && !resource.loading && !resource.error && resource.result && (
          <Dashboard
            summary={resource.result.data}
            onFilter={openOrders}
            onOpen={openOrder}
            onNew={() => navigate("new")}
          />
        )}
        {page === "orders" && (
          <OrdersPage
            query={query}
            onQuery={setQuery}
            statusFilter={statusFilter}
            onFilter={setStatusFilter}
            onOpen={openOrder}
            onNew={() => navigate("new")}
          />
        )}
        {page === "new" && (
          <>
            <div className="page-heading">
              <div>
                <span className="eyebrow">بداية رحلة الصيانة</span>
                <h1>إضافة طلب جديد</h1>
                <p>
                  سجّل بيانات العميل والجهاز. سيبدأ الطلب بحالة «تم الاستلام».
                </p>
              </div>
            </div>
            <OrderForm onSave={addOrder} onCancel={() => openOrders()} />
          </>
        )}
        {page === "details" && !resource.loading && !resource.error && resource.result && (
          <OrderDetails
            key={selectedId}
            order={order || resource.result.data}
            onUpdate={updateOrder}
            onStatus={updateStatus}
            onBack={() => navigate("orders")}
          />
        )}
        <div className="session-note">
          <span aria-hidden="true">ⓘ</span>
          <p>
            <strong>مساحة للتجربة والتعلّم.</strong> استخدم بيانات وهمية فقط. تُحفظ الطلبات في MongoDB وتبقى بعد تحديث الصفحة.
          </p>
        </div>
      </main>
      <footer>
        <span dir="ltr">FixFlow</span>
        <span>اهتمام أكبر بالأجهزة، وقت أقل في المتابعة.</span>
        <span>النسخة التعليمية 1.0</span>
      </footer>
    </div>
  );
}
