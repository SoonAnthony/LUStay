import axios from "axios";

const api = axios.create({
  baseURL: '/api/v1',  // ✅ no more localhost:8000 — goes through Vite proxy
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
  },
});

api.interceptors.request.use(
  (config) => config,
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (res) => res,

  async (error) => {
    const originalRequest = error.config;
    const is401           = error.response?.status === 401;
    const isRefresh       = originalRequest.url?.includes("/users/refresh");
    const isLogin         = originalRequest.url?.includes("/users/login");
    const alreadyRetried  = originalRequest._retry;

    if (is401 && isRefresh) {
      const { store }  = await import("../app/store");
      const { logout } = await import("../features/auth/authSlice");
      store.dispatch(logout());
      return Promise.reject(error);
    }

    if (is401 && isLogin) {
      return Promise.reject(error);
    }

    if (is401 && !alreadyRetried) {
      originalRequest._retry = true;
      try {
        await api.post("/users/refresh", {});
        return api(originalRequest);
      } catch (refreshError) {
        const { store }  = await import("../app/store");
        const { logout } = await import("../features/auth/authSlice");
        store.dispatch(logout());
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;