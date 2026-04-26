import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../api/axios";

// 🔍 Improved normalize with debugging
const normalizeArray = (payload) => {
  console.log("🔍 Normalizing payload:", payload);

  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.hostels)) return payload.hostels;

  console.warn("⚠️ Unexpected payload shape:", payload);

  return [];
};

// 🔥 Fetch with full debugging + credentials
export const fetchMyHostels = createAsyncThunk(
  "hostels/fetchMyHostels",
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get("/hostels/my-hostels", {
        withCredentials: true, // ✅ FIX: ensures cookies/auth sent
      });

      console.log("✅ API SUCCESS:", res);
      console.log("✅ API DATA:", res.data);

      return res.data;
    } catch (err) {
      console.log("❌ API ERROR:", err);
      console.log("❌ ERROR RESPONSE:", err.response);

      return rejectWithValue(
        err.response?.data || err.message || "Failed to load my hostels"
      );
    }
  }
);

const initialState = {
  hostels: [],
  loading: false,
  error: null,
};

const hostelSlice = createSlice({
  name: "hostels",
  initialState,
  reducers: {
    clearHostelData: (state) => {
      state.hostels = [];
    },
    addHostel: (state, action) => {
      const newHostel = action.payload?.data || action.payload;
      state.hostels.unshift(newHostel);
    },
    removeHostel: (state, action) => {
      state.hostels = state.hostels.filter((h) => h.id !== action.payload);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMyHostels.pending, (state) => {
        state.loading = true;
        state.error = null;
        console.log("⏳ Fetching hostels...");
      })
      .addCase(fetchMyHostels.fulfilled, (state, action) => {
        state.loading = false;

        console.log("🎯 Fulfilled payload:", action.payload);

        state.hostels = normalizeArray(action.payload);
      })
      .addCase(fetchMyHostels.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;

        console.log("🚫 Fetch rejected:", action.payload);
      });
  },
});

export const { clearHostelData, addHostel, removeHostel } = hostelSlice.actions;
export default hostelSlice.reducer;