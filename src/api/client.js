const base = (
  import.meta.env.VITE_API_BASE_URL || "/api/v1"
).replace(/\/$/, "");
let csrfToken;
let csrfRequest;
let generation = 0;

export function setApiSession(token) {
  generation += 1;
  csrfRequest = undefined;
  csrfToken = token;
}

async function getCsrf() {
  if (csrfToken) return csrfToken;
  const current = generation;
  csrfRequest ??= request("/auth/csrf").then(({ data }) => {
    if (current === generation) csrfToken = data.csrfToken;
    return data.csrfToken;
  }).finally(() => {
    if (current === generation) csrfRequest = undefined;
  });
  return csrfRequest;
}

async function request(path, options = {}, retryCsrf = true) {
  const current = generation;
  const writes = ["POST", "PATCH", "PUT", "DELETE"].includes(options.method);
  const token = writes ? await getCsrf() : undefined;
  if (current !== generation) throw new DOMException("Session changed", "AbortError");
  let response;
  try {
    response = await fetch(`${base}${path}`, {
      ...options,
      credentials: "include",
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
        ...(token ? { "X-CSRF-Token": token } : {}),
      },
    });
  } catch (error) {
    if (error.name === "AbortError") throw error;
    throw new Error(
      "تعذر الاتصال بالخادم. تحقق من تشغيل Backend ثم حاول مجددًا.",
    );
  }
  if (response.status === 401 && !["/auth/me", "/auth/login"].includes(path) && current === generation) {
    setApiSession();
    window.dispatchEvent(new Event("fixflow:unauthenticated"));
  }
  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error("استجابة الخادم غير صالحة. حاول مجددًا.");
  }
  if (!response.ok || !result.success) {
    const error = new Error(result.error?.message || "تعذر إكمال العملية");
    error.status = response.status;
    error.code = result.error?.code;
    if (current === generation && error.code === "INVALID_CSRF" && writes && retryCsrf) {
      if (csrfToken === token) csrfToken = undefined;
      return request(path, options, false);
    }
    if (current === generation && error.code === "PASSWORD_CHANGE_REQUIRED") {
      window.dispatchEvent(new Event("fixflow:password-change-required"));
    }
    error.fieldErrors = Object.fromEntries(
      (result.error?.details || [])
        .filter((d) => d.field)
        .map((d) => [d.field, d.message]),
    );
    throw error;
  }
  return result;
}
const write = (method, body) => ({ method, body: JSON.stringify(body) });
export const api = {
  me: (signal) => request("/auth/me", { signal }),
  login: (values) => request("/auth/login", write("POST", values)),
  logout: () => request("/auth/logout", write("POST", {})),
  changePassword: (values) => request("/auth/change-password", write("POST", values)),
  getUsers: (signal) => request("/users", { signal }),
  createUser: (values) => request("/users", write("POST", values)),
  patchUser: (id, values) => request(`/users/${id}`, write("PATCH", values)),
  resetPassword: (id) => request(`/users/${id}/reset-password`, write("POST", {})),
  getOrders: (query, signal) =>
    request(`/orders?${new URLSearchParams(query)}`, { signal }),
  getOrder: (id, signal) => request(`/orders/${id}`, { signal }),
  createOrder: (values) => request("/orders", write("POST", values)),
  patchOrder: (id, values) => request(`/orders/${id}`, write("PATCH", values)),
  patchOrderStatus: (id, status) =>
    request(`/orders/${id}/status`, write("PATCH", { status })),
  getDashboardSummary: (signal) => request("/dashboard/summary1", { signal }),
  getStatuses: (signal) => request("/orders/statuses", { signal }),
};
