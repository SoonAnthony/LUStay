import axios from "axios";
import { store } from "../app/store";
import { logout, setCredentials } from "../features/auth/authSlice";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error) => {
  failedQueue.forEach((prom) => {
    error ? prom.reject(error) : prom.resolve();
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (res) => res,

  async (error) => {
    const originalRequest = error.config;

    const is401          = error.response?.status === 401;
    const isRefresh      = originalRequest.url?.includes("/users/refresh");
    const isLogin        = originalRequest.url?.includes("/users/login");
    const isMe           = originalRequest.url?.includes("/users/me");
    const alreadyRetried = originalRequest._retry;

    // ── Refresh itself failed → logout ────────────────
    if (is401 && isRefresh) {
      store.dispatch(logout());
      return Promise.reject(error);
    }

    // ── Don't retry login ────────────────
    if (is401 && isLogin) {
      return Promise.reject(error);
    }

    // ── 401 on /users/me or any protected route → try refresh ────────────────
    if (is401 && !alreadyRetried) {
      originalRequest._retry = true;

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => api(originalRequest))
          .catch((err) => Promise.reject(err));
      }

      isRefreshing = true;

      try {
        const res = await api.post("/users/refresh");

        store.dispatch(setCredentials({
          user: res.data.user,
          access_token: res.data.access_token,
          refresh_token: res.data.refresh_token,
        }));

        processQueue(null);
        return api(originalRequest);

      } catch (refreshError) {
        processQueue(refreshError);
        store.dispatch(logout());
        // ❌ Removed: window.location.href = "/login"
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
