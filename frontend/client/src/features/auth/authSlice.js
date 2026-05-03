import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../api/axios";   // ✅ correct path — adjust if your file is src/api.js → "../../api"

// ─────────────────────────────────────────────────────────────
// Thunks
// ─────────────────────────────────────────────────────────────

// 🔐 LOGIN
export const loginUser = createAsyncThunk(
  "auth/loginUser",
  async ({ email, password }, { rejectWithValue }) => {
    try {
      await api.post("/users/login", { email, password });
      const res = await api.get("/users/me");
      return res.data;   // full user object including .role
    } catch (err) {
      return rejectWithValue(err.response?.data?.detail || "Login failed");
    }
  }
);

// 🔄 RESTORE SESSION on app load
export const restoreSession = createAsyncThunk(
  "auth/restoreSession",
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get("/users/me");
      return res.data;
    } catch {
      return rejectWithValue(null);
    }
  }
);

// 🚪 LOGOUT
export const logoutUser = createAsyncThunk(
  "auth/logoutUser",
  async (_, { dispatch }) => {
    try {
      await api.post("/users/logout");
    } catch {
      // even if the API call fails, clear local state
    } finally {
      dispatch(authSlice.actions.logout());
    }
  }
);

// ─────────────────────────────────────────────────────────────
// Slice
// ─────────────────────────────────────────────────────────────

const initialState = {
  user:            null,
  isAuthenticated: false,
  authReady:       false,
  loading:         false,
  error:           null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    logout: (state) => {
      state.user            = null;
      state.isAuthenticated = false;
      state.authReady       = true;
      state.error           = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // ── LOGIN ────────────────────────────────────────
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error   = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading         = false;
        state.user            = action.payload;
        state.isAuthenticated = true;
        state.authReady       = true;
        state.error           = null;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading         = false;
        state.isAuthenticated = false;
        state.authReady       = true;
        state.error           = action.payload;
      })

      // ── RESTORE SESSION ──────────────────────────────
      .addCase(restoreSession.pending, (state) => {
        state.authReady = false;
      })
      .addCase(restoreSession.fulfilled, (state, action) => {
        state.user            = action.payload;
        state.isAuthenticated = true;
        state.authReady       = true;
      })
      .addCase(restoreSession.rejected, (state) => {
        state.user            = null;
        state.isAuthenticated = false;
        state.authReady       = true;
      })

      // ── LOGOUT ──────────────────────────────────────
      .addCase(logoutUser.fulfilled, (state) => {
        state.user            = null;
        state.isAuthenticated = false;
        state.authReady       = true;
        state.error           = null;
      });
  },
});

export const { logout, clearError } = authSlice.actions;
export default authSlice.reducer;