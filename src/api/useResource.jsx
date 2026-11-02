import { useEffect, useState } from 'react';

// Keying the result also hides old results during the render before effect cleanup.
export function useResource(load, dependencies, enabled = true, delay = 0) {
  const key = JSON.stringify([enabled, ...dependencies]);
  const [state, setState] = useState({ key: null, loading: true });
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    let active = true;
    setState({ key, loading: true });
    const timer = setTimeout(async () => {
      try {
        const result = await load(controller.signal);
        if (active) setState({ key, result, loading: false });
      } catch (error) {
        if (active && error.name !== 'AbortError') setState({ key, error, loading: false });
      }
    }, delay);
    return () => { active = false; clearTimeout(timer); controller.abort(); };
    // load is intentionally represented by its explicit dependencies.
  }, [key, delay]);
  return state.key === key ? state : { loading: enabled };
}

export function ResourceState({ resource, onRetry }) {
  if (resource.loading) return <p role="status" className="panel">جارٍ تحميل البيانات...</p>;
  if (!resource.error) return null;
  return <div className="panel" role="alert">
    <p>{resource.error.status === 404 ? 'الطلب غير موجود.' : resource.error.message}</p>
    <button className="button secondary" onClick={onRetry}>إعادة المحاولة</button>
  </div>;
}
