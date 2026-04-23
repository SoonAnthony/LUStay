import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../api/axios";

export const loginUser = createAsyncThunk(
  "auth/loginUser",
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const res = await api.post("/users/login", { email, password });
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.detail || "Login failed");
    }
  }
);

export const logoutUser = createAsyncThunk(
  "auth/logoutUser",
  async (_, { rejectWithValue }) => {
    try {
      await api.post("/users/logout");
    } catch (err) {}
  }
);

// ✅ Thunk to restore session on page refresh
export const restoreSession = createAsyncThunk(
  "auth/restoreSession",
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get("/users/me");
      return res.data;
    } catch (err) {
      return rejectWithValue(null); // not an error — just not logged in
    }
  }
);

const initialState = {
  user:            null,
  isAuthenticated: false,
  authReady:       false,   // ✅ false until session check completes
  loading:         false,
  error:           null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setCredentials: (state, action) => {
      if (action.payload.user) {
        state.user            = action.payload.user;
        state.isAuthenticated = true;
      }
      state.authReady = true;
    },
    logout: (state) => {
      state.user            = null;
      state.isAuthenticated = false;
      state.loading         = false;
      state.error           = null;
      state.authReady       = true;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // loginUser
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
        state.loading   = false;
        state.error     = action.payload || "Login failed";
        state.authReady = true;
      })

      // logoutUser
      .addCase(logoutUser.fulfilled, (state) => {
        state.user            = null;
        state.isAuthenticated = false;
        state.loading         = false;
        state.error           = null;
        state.authReady       = true;
      })

      // restoreSession
      .addCase(restoreSession.pending, (state) => {
        state.authReady = false; // ✅ wait until check completes
      })
      .addCase(restoreSession.fulfilled, (state, action) => {
        state.user            = action.payload;
        state.isAuthenticated = true;
        state.authReady       = true; // ✅ session restored
      })
      .addCase(restoreSession.rejected, (state) => {
        state.user            = null;
        state.isAuthenticated = false;
        state.authReady       = true; // ✅ no session but check is done
      });
  },
});

export const { setCredentials, logout, clearError } = authSlice.actions;
export default authSlice.reducer;