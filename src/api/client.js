const base = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:4000/api/v1').replace(/\/$/, '');
async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`${base}${path}`, { ...options, headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers } });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new Error('تعذر الاتصال بالخادم. تحقق من تشغيل Backend ثم حاول مجددًا.');
  }
  let result;
  try { result = await response.json(); }
  catch { throw new Error('استجابة الخادم غير صالحة. حاول مجددًا.'); }
  if (!response.ok || !result.success) {
    const error = new Error(result.error?.message || 'تعذر إكمال العملية');
    error.status = response.status;
    error.fieldErrors = Object.fromEntries((result.error?.details || []).filter(d => d.field).map(d => [d.field, d.message]));
    throw error;
  }
  return result;
}
const write = (method, body) => ({ method, body: JSON.stringify(body) });
export const api = {
  getOrders: (query, signal) => request(`/orders?${new URLSearchParams(query)}`, { signal }),
  getOrder: (id, signal) => request(`/orders/${id}`, { signal }),
  createOrder: values => request('/orders', write('POST', values)),
  patchOrder: (id, values) => request(`/orders/${id}`, write('PATCH', values)),
  patchOrderStatus: (id, status) => request(`/orders/${id}/status`, write('PATCH', { status })),
  getDashboardSummary: signal => request('/dashboard/summary', { signal }),
  getStatuses: signal => request('/orders/statuses', { signal }),
};
