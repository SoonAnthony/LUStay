import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { jwtDecode } from "jwt-decode";
import api from "../api/axios"; // ✅ match your project

const AuthContext = createContext(null);

// ─── helpers ─────────────────────────────────────────────

const decodeToken = (token) => {
  try {
    return jwtDecode(token);
  } catch {
    return null;
  }
};

// In-memory access token (safe)
let inMemoryAccessToken = null;

export const getAccessToken = () => inMemoryAccessToken;

export const setAccessToken = (token) => {
  inMemoryAccessToken = token;

  // ✅ Attach token to axios globally
  api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
};

export const clearAccessToken = () => {
  inMemoryAccessToken = null;
  delete api.defaults.headers.common["Authorization"];
};

// ─── provider ─────────────────────────────────────────────

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const refreshTimer = useRef(null);

  // 🔁 Schedule token refresh
  const scheduleRefresh = useCallback((token) => {
    const decoded = decodeToken(token);
    if (!decoded?.exp) return;

    const expiresInMs = decoded.exp * 1000 - Date.now() - 30_000;

    if (expiresInMs <= 0) return;

    clearTimeout(refreshTimer.current);

    refreshTimer.current = setTimeout(() => {
      silentRefresh();
    }, expiresInMs);
  }, []);

  // 🔁 Refresh token
  const silentRefresh = useCallback(async () => {
    try {
      const { data } = await api.post("users/refresh");

      // ✅ FIX: backend uses access_token
      setAccessToken(data.access_token);

      const decoded = decodeToken(data.access_token);
      setUser(decoded);

      scheduleRefresh(data.access_token);
    } catch (err) {
      clearAccessToken();
      setUser(null);
    }
  }, [scheduleRefresh]);

  // 🔁 On app load
  useEffect(() => {
    silentRefresh().finally(() => setLoading(false));

    return () => clearTimeout(refreshTimer.current);
  }, [silentRefresh]);

  // 🔐 Login
  const login = async (email, password) => {
    const { data } = await api.post("/users/login", {
      email,
      password,
    });

    // ✅ FIX: use access_token
    setAccessToken(data.access_token);

    const decoded = decodeToken(data.access_token);
    setUser(decoded);

    scheduleRefresh(data.access_token);
  };

  // 🚪 Logout
  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch (err) {
      // ignore
    } finally {
      clearAccessToken();
      clearTimeout(refreshTimer.current);
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        loading,
        login,
        logout,
      }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
};

// Hook
export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
};