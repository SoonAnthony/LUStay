import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../api/axios";

// ── THUNK ─────────────────────────────────────────────
export const fetchBookings = createAsyncThunk(
  "bookings/fetchBookings",
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get("/bookings/my");
      return res.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.detail || "Failed to fetch bookings"
      );
    }
  }
);

// ── INITIAL STATE ─────────────────────────────────────
const initialState = {
  bookings: [],
  loading: false,
  error: null,
};

// ── SLICE ─────────────────────────────────────────────
const bookingsSlice = createSlice({
  name: "bookings",
  initialState,
  reducers: {

    addBooking: (state, action) => {
      state.bookings.unshift(action.payload);           // ✅ optimistic add
    },

    removeBooking: (state, action) => {                 // ✅ optimistic remove by id
      state.bookings = state.bookings.filter(
        (b) => b.id !== action.payload
      );
    },

    clearError: (state) => {                            // ✅ dismiss errors from UI
      state.error = null;
    },
  },

  extraReducers: (builder) => {
    builder
      .addCase(fetchBookings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBookings.fulfilled, (state, action) => {
        state.loading = false;
        state.bookings = Array.isArray(action.payload)  // ✅ guard against bad API shape
          ? action.payload
          : action.payload.data ?? [];
      })
      .addCase(fetchBookings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch bookings";
      });
  },
});

export const { addBooking, removeBooking, clearError } = bookingsSlice.actions;
export default bookingsSlice.reducer;