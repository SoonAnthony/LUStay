import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

const BASE = "/api/v1";

// ── THUNKS ────────────────────────────────────────────────────

/**
 * Step 1: Upload a file to the backend → Cloudinary.
 * Returns { url, public_id }
 */
export const uploadLandlordDocument = createAsyncThunk(
  "landlord/uploadDocument",
  async (file, { rejectWithValue }) => {
    try {
      const form = new FormData();
      form.append("file", file);
      const { data } = await axios.post(
        `${BASE}/users/me/upload-document`,
        form,
        { withCredentials: true, headers: { "Content-Type": "multipart/form-data" } }
      );
      return data; // { url, public_id }
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.detail || "Document upload failed"
      );
    }
  }
);

/**
 * Step 2: Submit the landlord request with the Cloudinary values.
 */
export const submitLandlordRequest = createAsyncThunk(
  "landlord/submitRequest",
  async ({ document_type, document_url, document_public_id }, { rejectWithValue }) => {
    try {
      const { data } = await axios.post(
        `${BASE}/me/landlord-requests/`,
        { document_type, document_url, document_public_id },
        { withCredentials: true }
      );
      return data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.detail || "Failed to submit request"
      );
    }
  }
);

/**
 * Fetch the current user's landlord requests.
 */
export const fetchMyLandlordRequests = createAsyncThunk(
  "landlord/fetchMyRequests",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await axios.get(
        `${BASE}/me/landlord-requests/`,
        {
          withCredentials: true,
          headers: { "Cache-Control": "no-cache" },  // ← force fresh response
        }
      );
      return Array.isArray(data) ? data : [];  // ← guard against non-array
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.detail || "Failed to fetch requests"
      );
    }
  }
);

// ── SLICE ─────────────────────────────────────────────────────

const landlordSlice = createSlice({
  name: "landlord",
  initialState: {
    // Upload step
    uploading:     false,
    uploadError:   null,
    uploadedDoc:   null,   // { url, public_id } after successful upload

    // Submit step
    submitting:    false,
    submitError:   null,
    submitSuccess: false,

    // My requests
    requests:      [],
    requestsLoading: false,
    requestsError:   null,

    // Latest/active request (derived from requests list)
    latestRequest: null,
  },
  reducers: {
    clearUpload(state) {
      state.uploading   = false;
      state.uploadError = null;
      state.uploadedDoc = null;
    },
    clearSubmit(state) {
      state.submitting    = false;
      state.submitError   = null;
      state.submitSuccess = false;
    },
    resetLandlordForm(state) {
      state.uploading     = false;
      state.uploadError   = null;
      state.uploadedDoc   = null;
      state.submitting    = false;
      state.submitError   = null;
      state.submitSuccess = false;
    },
  },
  extraReducers: (builder) => {
    // ── uploadLandlordDocument ──
    builder
      .addCase(uploadLandlordDocument.pending, (state) => {
        state.uploading   = true;
        state.uploadError = null;
        state.uploadedDoc = null;
      })
      .addCase(uploadLandlordDocument.fulfilled, (state, action) => {
        state.uploading   = false;
        state.uploadedDoc = action.payload;
      })
      .addCase(uploadLandlordDocument.rejected, (state, action) => {
        state.uploading   = false;
        state.uploadError = action.payload;
      });

    // ── submitLandlordRequest ──
    builder
      .addCase(submitLandlordRequest.pending, (state) => {
        state.submitting  = true;
        state.submitError = null;
      })
      .addCase(submitLandlordRequest.fulfilled, (state, action) => {
        state.submitting    = false;
        state.submitSuccess = true;
        // Add newly submitted request to the top of the list
        state.requests      = [action.payload, ...state.requests];
        state.latestRequest = action.payload;
      })
      .addCase(submitLandlordRequest.rejected, (state, action) => {
        state.submitting  = false;
        state.submitError = action.payload;
      });

    // ── fetchMyLandlordRequests ──
    builder
      .addCase(fetchMyLandlordRequests.pending, (state) => {
        state.requestsLoading = true;
        state.requestsError   = null;
      })
      .addCase(fetchMyLandlordRequests.fulfilled, (state, action) => {
        state.requestsLoading = false;
        state.requests        = action.payload;
        // Derive the latest request (most recently submitted)
        state.latestRequest   = action.payload.length
          ? [...action.payload].sort(
              (a, b) => new Date(b.submitted_at) - new Date(a.submitted_at)
            )[0]
          : null;
      })
      .addCase(fetchMyLandlordRequests.rejected, (state, action) => {
        state.requestsLoading = false;
        state.requestsError   = action.payload;
      });
  },
});

export const { clearUpload, clearSubmit, resetLandlordForm } = landlordSlice.actions;
export default landlordSlice.reducer;