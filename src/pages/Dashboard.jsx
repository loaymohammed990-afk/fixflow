import DeviceCard from "../components/DeviceCard";
import { ORDER_STATUSES } from "../data/mockOrders";

export default function Dashboard({ summary, onFilter, onOpen, onNew }) {
  const stats = [
    { title: "إجمالي الطلبات", filter: "", icon: "▦", color: "green" },
    {
      title: ORDER_STATUSES[0],
      filter: ORDER_STATUSES[0],
      icon: "↓",
      color: "gray",
    },
    {
      title: ORDER_STATUSES[1],
      filter: ORDER_STATUSES[1],
      icon: "↻",
      color: "orange",
    },
    {
      title: ORDER_STATUSES[2],
      filter: ORDER_STATUSES[2],
      icon: "✓",
      color: "blue",
    },
  ];
  const latest = summary.recentOrders;
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">مساحة عملك، بوضوح</span>
          <h1>لوحة التحكم</h1>
          <p>نظرة سريعة على طلبات الصيانة. كل جهاز، وخطوته التالية.</p>
        </div>
        <button className="button primary" onClick={onNew}>
          <span aria-hidden="true">＋</span> إضافة طلب جديد
        </button>
      </div>
      <div className="stats-grid">
        {stats.map((stat) => (
          <button
            key={stat.title}
            className={`stat-card ${stat.color}`}
            onClick={() => onFilter(stat.filter)}
          >
            <span className="stat-top">
              <span>{stat.title}</span>
              <span className="stat-icon" aria-hidden="true">
                {stat.icon}
              </span>
            </span>
            <strong>
              {stat.filter
                ? summary.byStatus[stat.filter]
                : summary.totalOrders}
            </strong>
            <span className="stat-bottom">
              عرض الطلبات <span aria-hidden="true">←</span>
            </span>
          </button>
        ))}
      </div>
      <div className="dashboard-grid">
        <section className="panel recent-panel">
          <div className="panel-heading">
            <div>
              <h2>أحدث الطلبات</h2>
              <p>آخر 5 طلبات استقبلها المركز</p>
            </div>
            <button className="text-button" onClick={() => onFilter("")}>
              عرض الكل ←
            </button>
          </div>
          <div className="device-list">
            {latest.map((order) => (
              <DeviceCard key={order.id} order={order} onOpen={onOpen} />
            ))}
          </div>
          {!summary.totalOrders && (
            <div className="empty-state">
              <h3>ابدأ بأول طلب صيانة</h3>
              <button className="button primary" onClick={onNew}>
                إضافة طلب
              </button>
            </div>
          )}
        </section>
        <aside className="workflow-panel">
          <span className="eyebrow">من الاستلام إلى التسليم</span>
          <h2>
            صيانة منظّمة.
            <br />
            عمل أسهل.
          </h2>
          <p>تابع رحلة كل جهاز، وحدّث حالته ليبقى كل شيء واضحًا.</p>
          <ol className="workflow">
            {ORDER_STATUSES.slice(0, 4).map((status, index) => (
              <li key={status}>
                <span>{index + 1}</span>
                <div>
                  <strong>{status}</strong>
                  <small>
                    {
                      [
                        "سجّل بيانات العميل والجهاز",
                        "تابع العمل على إصلاح الجهاز",
                        "الجهاز بانتظار صاحبه",
                        "اكتملت رحلة الصيانة",
                      ][index]
                    }
                  </small>
                </div>
              </li>
            ))}
          </ol>
          <div className="workflow-note">
            ترتيب إرشادي للتعلّم؛ يمكنك تغيير الحالة بحرية.
          </div>
        </aside>
      </div>
    </>
  );
}
