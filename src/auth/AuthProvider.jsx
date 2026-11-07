import { useCallback, useEffect, useRef, useState } from "react";
import { api, setApiSession } from "../api/client";
import { AuthContext } from "./useAuth";

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState("");
  const [notice, setNotice] = useState("");
  const dirtyOrder = useRef(false);
  const markOrderDirty = useCallback(dirty => { dirtyOrder.current = dirty; }, []);

  const reloadMe = useCallback(async (signal) => {
    setAuthLoading(true);
    setAuthError("");
    try {
      const { data } = await api.me(signal);
      if (!signal?.aborted) setUser(data.user);
    } catch (error) {
      if (error.name === "AbortError" || signal?.aborted) return;
      setUser(null);
      setApiSession();
      if (error.status !== 401) setAuthError(error.message);
    } finally {
      if (!signal?.aborted) setAuthLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    function expired() {
      const message = "انتهت الجلسة أو تغيّرت صلاحيات حسابك. سجّل الدخول مجددًا.";
      if (dirtyOrder.current) window.alert(`${message} لم تُحفظ تعديلات الطلب المفتوح.`);
      setNotice(message);
      setUser(null);
    }
    const passwordRequired = () => reloadMe();
    window.addEventListener("fixflow:unauthenticated", expired);
    window.addEventListener("fixflow:password-change-required", passwordRequired);
    reloadMe(controller.signal);
    return () => {
      controller.abort();
      window.removeEventListener("fixflow:unauthenticated", expired);
      window.removeEventListener("fixflow:password-change-required", passwordRequired);
    };
  }, [reloadMe]);

  async function login(values) {
    const { data } = await api.login(values);
    setApiSession(data.csrfToken);
    setNotice("");
    setUser(data.user);
  }

  async function logout() {
    await api.logout();
    setApiSession();
    setNotice("");
    setUser(null);
  }

  async function changePassword(values) {
    const { message } = await api.changePassword(values);
    setApiSession();
    setNotice(message);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{
      user, authLoading, authError, notice, login, logout, reloadMe, changePassword, markOrderDirty,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
