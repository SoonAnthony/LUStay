import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../api/axios";

// ── THUNKS ────────────────────────────────────────────
export const fetchMe = createAsyncThunk(
  "user/fetchMe",
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get("/users/me");
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.detail || "Failed to fetch profile");
    }
  }
);

export const updateMe = createAsyncThunk(
  "user/updateMe",
  async (payload, { rejectWithValue }) => {
    try {
      const res = await api.patch("/users/me", payload);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.detail || "Failed to update profile");
    }
  }
);

export const uploadProfileImage = createAsyncThunk(
  "user/uploadProfileImage",
  async (file, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await api.post("/users/me/profile-image", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.detail || "Image upload failed");
    }
  }
);

export const deleteProfileImage = createAsyncThunk(
  "user/deleteProfileImage",
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.delete("/users/me/profile-image");
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.detail || "Image deletion failed");
    }
  }
);

// ── INITIAL STATE ─────────────────────────────────────
const initialState = {
  profile:        null,
  loading:        false,
  updating:       false,
  uploadingImage: false,
  deletingImage:  false,  // ✅ added
  error:          null,
  updateError:    null,
  updateSuccess:  false,
};

// ── SLICE ─────────────────────────────────────────────
const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    clearUpdateStatus: (state) => {
      state.updateSuccess = false;
      state.updateError   = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchMe
      .addCase(fetchMe.pending, (state) => {
        state.loading = true;
        state.error   = null;
      })
      .addCase(fetchMe.fulfilled, (state, action) => {
        state.loading = false;
        state.profile = action.payload;
      })
      .addCase(fetchMe.rejected, (state, action) => {
        state.loading = false;
        state.error   = action.payload;
      })

      // updateMe
      .addCase(updateMe.pending, (state) => {
        state.updating      = true;
        state.updateError   = null;
        state.updateSuccess = false;
      })
      .addCase(updateMe.fulfilled, (state, action) => {
        state.updating      = false;
        state.profile       = action.payload;
        state.updateSuccess = true;
      })
      .addCase(updateMe.rejected, (state, action) => {
        state.updating    = false;
        state.updateError = action.payload;
      })

      // uploadProfileImage
      .addCase(uploadProfileImage.pending, (state) => {
        state.uploadingImage = true;
        state.error          = null;
      })
      .addCase(uploadProfileImage.fulfilled, (state, action) => {
        state.uploadingImage = false;
        state.profile        = action.payload;
      })
      .addCase(uploadProfileImage.rejected, (state, action) => {
        state.uploadingImage = false;
        state.error          = action.payload;
      })

      // deleteProfileImage ✅ all three cases now handled
      .addCase(deleteProfileImage.pending, (state) => {
        state.deletingImage = true;
        state.error         = null;
      })
      .addCase(deleteProfileImage.fulfilled, (state, action) => {
        state.deletingImage = false;
        state.profile       = action.payload; // ✅ profile_image set to null by backend
      })
      .addCase(deleteProfileImage.rejected, (state, action) => {
        state.deletingImage = false;
        state.error         = action.payload;
      });
  },
});

export const { clearUpdateStatus, clearError } = userSlice.actions;
export default userSlice.reducer;