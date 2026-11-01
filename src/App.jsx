import { useRef, useState } from "react";
import { mockOrders, ORDER_STATUSES } from "./data/mockOrders";
import Dashboard from "./pages/Dashboard";
import OrdersPage from "./pages/OrdersPage";
import OrderDetails from "./pages/OrderDetails";
import OrderForm from "./components/OrderForm";

export default function App() {
  const [orders, setOrders] = useState(mockOrders);
  const [page, setPage] = useState("dashboard");
  const [selectedId, setSelectedId] = useState(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [feedback, setFeedback] = useState("");
  const nextId = useRef(
    Math.max(...mockOrders.map((order) => order.id), 0) + 1,
  );

  function navigate(target) {
    setPage(target);
    setFeedback("");
  }
  function openOrder(id) {
    setSelectedId(id);
    navigate("details");
  }
  function openOrders(status = "") {
    setQuery("");
    setStatusFilter(status);
    navigate("orders");
  }
  function addOrder(values) {
    const newOrder = {
      ...values,
      id: nextId.current++,
      status: ORDER_STATUSES[0],
      createdAt: new Date().toISOString(),
    };
    setOrders((current) => [newOrder, ...current]);
    setSelectedId(newOrder.id);
    setPage("details");
    setFeedback(`تمت إضافة الطلب #${newOrder.id} بنجاح خلال هذه الجلسة.`);
  }
  function updateOrder(id, values) {
    // map يعيد قائمة جديدة، مع تعديل الطلب المطابق فقط وحفظ رقمه وتاريخه.
    setOrders((current) =>
      current.map((order) =>
        order.id === id
          ? { ...order, ...values, id: order.id, createdAt: order.createdAt }
          : order,
      ),
    );
    setFeedback(`تم حفظ تعديلات الطلب #${id}.`);
  }
  function updateStatus(id, status) {
    setOrders((current) =>
      current.map((order) => (order.id === id ? { ...order, status } : order)),
    );
    setFeedback(`تم تحديث حالة الطلب #${id} إلى «${status}».`);
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
        {page === "dashboard" && (
          <Dashboard
            orders={orders}
            onFilter={openOrders}
            onOpen={openOrder}
            onNew={() => navigate("new")}
          />
        )}
        {page === "orders" && (
          <OrdersPage
            orders={orders}
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
        {page === "details" && (
          <OrderDetails
            key={selectedId}
            order={orders.find((order) => order.id === selectedId)}
            onUpdate={updateOrder}
            onStatus={updateStatus}
            onBack={() => navigate("orders")}
          />
        )}
        <div className="session-note">
          <span aria-hidden="true">ⓘ</span>
          <p>
            <strong>مساحة للتجربة والتعلّم.</strong> البيانات وهمية والتغييرات
            مؤقتة خلال الجلسة؛ تحديث الصفحة يعيد البيانات الأولية.
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
