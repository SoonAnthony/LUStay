import { useEffect, useState, useCallback, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { uploadProfileImage } from "../features/user/userSlice";
import { useNavigate } from "react-router-dom";
import { fetchMyHostels, addHostel, removeHostel } from "../features/hostels/hostelSlice";
import api from "../api/axios";
import Footer from "../components/Footer";
import HostelEditModal from "../components/HostelEditModal";

// ── HELPERS ──────────────────────────────────────────────────
const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-KE", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "-";

const fmt = (n) => `KES ${Number(n || 0).toLocaleString()}`;

const getErrorMsg = (e, fallback = "Something went wrong") => {
  const detail = e?.response?.data?.detail;
  if (!detail) return fallback;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail.map((d) => (typeof d === "string" ? d : d.msg || JSON.stringify(d))).join(", ");
  return fallback;
};

// ── SKELETONS ─────────────────────────────────────────────────
const SkeletonBox = ({ h = "h-4", w = "w-full", rounded = "rounded-lg" }) => (
  <div className={`animate-pulse bg-gray-100 ${h} ${w} ${rounded}`} />
);

const ProfileCardSkeleton = () => (
  <div className="bg-white border border-gray-100 rounded-2xl p-6 mb-6">
    <div className="flex items-start gap-5">
      <SkeletonBox h="h-14" w="w-14" rounded="rounded-2xl" />
      <div className="flex-1 space-y-2 pt-1">
        <SkeletonBox h="h-5" w="w-48" />
        <SkeletonBox h="h-4" w="w-36" />
        <SkeletonBox h="h-3" w="w-28" />
      </div>
      <SkeletonBox h="h-8" w="w-24" rounded="rounded-xl" />
    </div>
  </div>
);

const StatsSkeleton = () => (
  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
    {[1, 2, 3, 4].map((i) => (
      <div key={i} className="bg-white border border-gray-100 rounded-2xl p-5 space-y-2">
        <SkeletonBox h="h-3" w="w-20" />
        <SkeletonBox h="h-5" w="w-16" />
      </div>
    ))}
  </div>
);

const HostelCardSkeleton = () => (
  <div className="bg-white border border-gray-100 rounded-2xl p-5 space-y-3">
    <div className="flex justify-between">
      <SkeletonBox h="h-4" w="w-40" />
      <SkeletonBox h="h-4" w="w-16" rounded="rounded-full" />
    </div>
    <SkeletonBox h="h-3" w="w-56" />
    <div className="flex gap-3 pt-1">
      <SkeletonBox h="h-3" w="w-24" />
      <SkeletonBox h="h-3" w="w-20" />
    </div>
  </div>
);

// ── STATUS BADGE ──────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const normalized = (status || "").toUpperCase();
  const styles = {
    APPROVED:  "bg-lime-50 text-lime-600",
    PENDING:   "bg-amber-50 text-amber-600",
    REJECTED:  "bg-red-50 text-red-400",
    SUSPENDED: "bg-gray-100 text-gray-500",
  };
  return (
    <span
      className={`text-xs px-2.5 py-1 rounded-full font-medium ${
        styles[normalized] || "bg-gray-50 text-gray-500"
      }`}
    >
      {status || "Unknown"}
    </span>
  );
};

const BookingStatusBadge = ({ status }) => {
  const styles = {
    CONFIRMED: "bg-lime-50 text-lime-600",
    ACTIVE:    "bg-blue-50 text-blue-500",
    CANCELLED: "bg-red-50 text-red-400",
  };
  return (
    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${styles[status] || "bg-gray-50 text-gray-500"}`}>
      {status || "—"}
    </span>
  );
};

// ── TOAST ─────────────────────────────────────────────────────
function Toast({ message, type = "success", onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);

  const styles = {
    success: "bg-lime-50 border-lime-200 text-lime-700",
    error:   "bg-red-50 border-red-200 text-red-600",
  };

  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl border shadow-lg text-sm font-medium ${styles[type]}`}>
      <span className="flex-1">{message}</span>
      <button onClick={onClose} className="opacity-50 hover:opacity-100 text-lg leading-none">×</button>
    </div>
  );
}

// ── CREATE HOSTEL MODAL ───────────────────────────────────────
const CreateHostelModal = ({ onClose, onSuccess }) => {
  const [form, setForm] = useState({
    name: "",
    location: "",
    description: "",
    latitude: "",
    longitude: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async () => {
    if (!form.name || !form.location)
      return setError("Name and location are required");
    setSubmitting(true);
    setError(null);
    try {
      const { data } = await api.post(
        "/hostels/",
        {
          name:        form.name,
          location:    form.location,
          description: form.description || null,
          latitude:    form.latitude  ? parseFloat(form.latitude)  : null,
          longitude:   form.longitude ? parseFloat(form.longitude) : null,
        },
        { withCredentials: true }
      );
      onSuccess(data);
    } catch (e) {
      setError(e.response?.data?.detail || "Failed to create hostel");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-base font-semibold text-gray-900">New Hostel</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <div className="space-y-3">
          {[
            { label: "Hostel name",  key: "name",        placeholder: "e.g. Sunrise Hostel" },
            { label: "Location",     key: "location",    placeholder: "e.g. Near LU Gate 2" },
            { label: "Description",  key: "description", placeholder: "Brief description (optional)" },
            { label: "Latitude",     key: "latitude",    placeholder: "e.g. -1.2921", type: "number" },
            { label: "Longitude",    key: "longitude",   placeholder: "e.g. 36.8219", type: "number" },
          ].map(({ label, key, placeholder, type = "text" }) => (
            <div key={key}>
              <label className="text-xs text-gray-500 uppercase mb-1 block">{label}</label>
              {key === "description" ? (
                <textarea
                  rows={2}
                  value={form[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  placeholder={placeholder}
                  className="w-full border border-gray-200 px-4 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                />
              ) : (
                <input
                  type={type}
                  step="any"
                  value={form[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  placeholder={placeholder}
                  className="w-full border border-gray-200 px-4 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              )}
            </div>
          ))}
        </div>

        {error && (
          <div className="mt-3 bg-red-50 border border-red-100 text-red-500 text-xs px-4 py-2 rounded-xl">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2 mt-5">
          <button
            onClick={onClose}
            className="text-xs px-4 py-2 border border-gray-200 text-gray-500 rounded-xl hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="text-xs px-5 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl disabled:opacity-50 flex items-center gap-2 transition-colors"
          >
            {submitting && (
              <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}
            {submitting ? "Creating…" : "Create hostel"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── REFUND REQUEST MODAL ──────────────────────────────────────
const RefundRequestModal = ({ booking, onClose, onSuccess }) => {
  const [reason,      setReason]      = useState("");
  const [submitting,  setSubmitting]  = useState(false);
  const [error,       setError]       = useState(null);

  // Find the payment ID from the booking's mpesa_checkout_request_id
  // We need to look up the payment first
  const handleSubmit = async () => {
    if (!reason.trim()) return setError("Please provide a reason for the refund.");
    setSubmitting(true);
    setError(null);
    try {
      // Fetch payment linked to this booking
      const { data: payments } = await api.get(`/payments/by-booking/${booking.id}`);
      const payment = payments?.status === "SUCCESS" ? payments : null;

      if (!payment) throw new Error("No successful payment found for this booking.");

      await api.post(`/payments/${payment.id}/request-refund`, { reason: reason.trim() });
      onSuccess();
    } catch (e) {
      setError(getErrorMsg(e, "Failed to submit refund request."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-base font-semibold text-gray-900">Request Refund</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <div className="bg-gray-50 rounded-xl p-3 mb-4 text-sm text-gray-600 space-y-1">
          <p><span className="text-gray-400">Booking:</span> #{booking.id?.slice(0, 8).toUpperCase()}</p>
          <p><span className="text-gray-400">Amount paid:</span> {fmt(booking.amount_paid)}</p>
        </div>

        <div className="mb-4">
          <label className="text-xs text-gray-500 uppercase mb-1.5 block">Reason for refund</label>
          <textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Explain why you're requesting a refund…"
            className="w-full border border-gray-200 px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
          />
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-100 text-red-500 text-xs px-4 py-2 rounded-xl">
            {error}
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-500 text-sm rounded-xl hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !reason.trim()}
            className="flex-1 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-xl disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
          >
            {submitting && <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {submitting ? "Submitting…" : "Submit Request"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── BOOKINGS TAB ──────────────────────────────────────────────
const BookingsTab = ({ showToast }) => {
  const [bookings,       setBookings]       = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [statusFilter,   setStatusFilter]   = useState("ALL");
  const [refundBooking,  setRefundBooking]  = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // GET /bookings/ with landlord auth returns only bookings for landlord's hostels
      const { data } = await api.get("/bookings/");
      setBookings(Array.isArray(data) ? data : []);
    } catch (e) {
      showToast(getErrorMsg(e, "Failed to load bookings"), "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const FILTERS = ["ALL", "CONFIRMED", "ACTIVE", "CANCELLED"];

  const filtered =
    statusFilter === "ALL"
      ? bookings
      : bookings.filter((b) => b.status === statusFilter);

  const handleRefundSuccess = () => {
    setRefundBooking(null);
    showToast("Refund request submitted — admin will review it.");
    load();
  };

  return (
    <div className="space-y-4">
      {/* Filter pills */}
      <div className="flex gap-2 flex-wrap">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setStatusFilter(f)}
            className={`text-xs px-4 py-1.5 rounded-full border transition-colors
              ${statusFilter === f
                ? "bg-blue-500 text-white border-blue-500"
                : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
              }`}
          >
            {f.charAt(0) + f.slice(1).toLowerCase()}
          </button>
        ))}
        <button
          onClick={load}
          className="text-xs px-3 py-1.5 rounded-full border border-gray-200 text-gray-400 hover:text-blue-500 hover:border-blue-200 transition-colors"
        >
          ↻ Refresh
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-white border border-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && filtered.length === 0 && (
        <div className="text-center py-16 bg-white border border-gray-100 rounded-2xl">
          <p className="text-sm text-gray-400">No bookings found.</p>
        </div>
      )}

      {/* Booking cards */}
      {!loading && (
        <div className="flex flex-col gap-4">
          {filtered.map((booking) => {
            const paidPct = booking.total_price
              ? Math.min(100, ((booking.amount_paid || 0) / booking.total_price) * 100)
              : 0;
            const canRefund =
              booking.status !== "CANCELLED" && booking.amount_paid > 0;

            return (
              <div
                key={booking.id}
                className="bg-white border border-gray-100 rounded-2xl overflow-hidden"
              >
                {/* Top row */}
                <div className="flex items-start justify-between px-5 pt-4 pb-3 border-b border-gray-100">
                  <div>
                    <p className="text-sm font-semibold text-gray-900 font-mono">
                      #{booking.id?.slice(0, 8).toUpperCase()}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">Semester {booking.semester}</p>
                  </div>
                  <BookingStatusBadge status={booking.status} />
                </div>

                {/* Details grid */}
                <div className="grid grid-cols-3 divide-x divide-gray-100">
                  <div className="px-5 py-3">
                    <p className="text-xs text-gray-400 uppercase mb-1">Type</p>
                    <span className={`text-xs px-2.5 py-1 rounded-full border inline-block ${
                      booking.is_shared
                        ? "bg-blue-50 text-blue-500 border-blue-100"
                        : "bg-gray-50 text-gray-500 border-gray-100"
                    }`}>
                      {booking.is_shared ? "Shared" : "Single"}
                    </span>
                  </div>
                  <div className="px-5 py-3">
                    <p className="text-xs text-gray-400 uppercase mb-1">Total</p>
                    <p className="text-xs font-semibold text-gray-800">{fmt(booking.total_price)}</p>
                  </div>
                  <div className="px-5 py-3">
                    <p className="text-xs text-gray-400 uppercase mb-1">Paid</p>
                    <p className="text-xs font-semibold text-gray-800">{fmt(booking.amount_paid)}</p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="px-5 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-400 rounded-full transition-all"
                        style={{ width: `${paidPct}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-400 shrink-0">{Math.round(paidPct)}%</span>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-t border-gray-100">
                  <p className="text-xs text-gray-400">{fmtDate(booking.created_at)}</p>
                  {canRefund && (
                    <button
                      onClick={() => setRefundBooking(booking)}
                      className="text-xs px-4 py-2 rounded-xl border border-amber-200 text-amber-600 hover:bg-amber-50 transition-colors"
                    >
                      Request Refund
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Refund modal */}
      {refundBooking && (
        <RefundRequestModal
          booking={refundBooking}
          onClose={() => setRefundBooking(null)}
          onSuccess={handleRefundSuccess}
        />
      )}
    </div>
  );
};

// ── MAIN DASHBOARD ────────────────────────────────────────────
const LandlordDashboard = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const user                        = useSelector((s) => s.auth.user);
  const { hostels, loading, error } = useSelector((s) => s.hostels);

  const [activeTab,     setActiveTab]     = useState("overview");
  const [showCreate,    setShowCreate]    = useState(false);
  const [deleteId,      setDeleteId]      = useState(null);
  const [deleting,      setDeleting]      = useState(false);
  const [editingHostel, setEditingHostel] = useState(null);
  const [toast,         setToast]         = useState(null);

  const fileRef = useRef(null);

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) dispatch(uploadProfileImage(file));
  };

  const hostelList = hostels ?? [];

  const totalHostels  = hostelList.length;
  const approvedCount = hostelList.filter((h) => (h.status || "").toUpperCase() === "APPROVED").length;
  const pendingCount  = hostelList.filter((h) => (h.status || "").toUpperCase() === "PENDING").length;
  const rejectedCount = hostelList.filter((h) => (h.status || "").toUpperCase() === "REJECTED").length;

  const showToast = useCallback((message, type = "success") => {
    setToast({ message: String(message), type });
  }, []);

  useEffect(() => {
    dispatch(fetchMyHostels());
  }, [dispatch]);

  const handleCreateSuccess = (newHostel) => {
    dispatch(addHostel(newHostel));
    setShowCreate(false);
  };

  const handleDelete = async (id) => {
    setDeleting(true);
    try {
      await api.delete(`/hostels/${id}`, { withCredentials: true });
      dispatch(removeHostel(id));
      setDeleteId(null);
    } catch (e) {
      console.error("Delete failed:", e);
      showToast("Failed to delete hostel. Please try again.", "error");
    } finally {
      setDeleting(false);
    }
  };

  const handleHostelSaved = useCallback(async () => {
    await dispatch(fetchMyHostels());
    setEditingHostel(null);
  }, [dispatch]);

  const initials = user
    ? `${user.first_name?.[0] ?? ""}${user.last_name?.[0] ?? ""}`.toUpperCase()
    : "?";

  const isLoading = loading && hostelList.length === 0;

  const statusDot = (status) => {
    const s = (status || "").toUpperCase();
    if (s === "APPROVED")  return "bg-lime-400";
    if (s === "PENDING")   return "bg-amber-400";
    if (s === "REJECTED")  return "bg-red-400";
    if (s === "SUSPENDED") return "bg-gray-400";
    return "bg-gray-300";
  };

  const TABS = ["overview", "hostels", "bookings", "account"];

  return (
    <>
      {showCreate && (
        <CreateHostelModal
          onClose={() => setShowCreate(false)}
          onSuccess={handleCreateSuccess}
        />
      )}

      {editingHostel && (
        <HostelEditModal
          hostel={editingHostel}
          onClose={() => setEditingHostel(null)}
          onSaved={handleHostelSaved}
        />
      )}

      <div className="min-h-screen bg-gray-50 pt-24 px-4 pb-16">
        <div className="max-w-4xl mx-auto">

          {/* ── ERROR ALERT ──────────────────────────── */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-2xl text-sm flex justify-between items-center">
              <span>{typeof error === "string" ? error : "Error loading hostels"}</span>
              <button onClick={() => dispatch(fetchMyHostels())} className="underline font-medium">
                Retry
              </button>
            </div>
          )}

          {/* ── PROFILE CARD ─────────────────────────── */}
          {isLoading ? (
            <ProfileCardSkeleton />
          ) : (
            <div className="bg-white border border-gray-100 rounded-2xl p-6 mb-6">
              <div className="flex items-start gap-5">
                <div className="relative shrink-0">
                  {user?.profile_image ? (
                    <img src={user.profile_image} alt="Profile" className="w-14 h-14 rounded-2xl object-cover" />
                  ) : (
                    <div className="w-14 h-14 rounded-2xl bg-blue-500 flex items-center justify-center text-white text-xl font-semibold">
                      {initials}
                    </div>
                  )}
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="absolute -bottom-2 -right-2 w-6 h-6 bg-white border border-gray-200 rounded-xl flex items-center justify-center shadow-sm hover:bg-gray-50 transition-colors"
                    title="Change photo"
                  >
                    <span className="text-xs">📷</span>
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleImageChange}
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-xl font-semibold text-gray-900">
                      {user?.first_name} {user?.last_name}
                    </h1>
                    <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-purple-50 text-purple-500">
                      Landlord
                    </span>
                    {user?.is_verified && (
                      <span className="text-xs px-2.5 py-1 rounded-full bg-lime-50 text-lime-600 font-medium">
                        ✓ Verified
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">{user?.email}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Member since {fmtDate(user?.created_at)}
                  </p>
                </div>

                <button
                  onClick={() => setShowCreate(true)}
                  className="text-xs px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition-colors shrink-0"
                >
                  + Add Hostel
                </button>
              </div>
            </div>
          )}

          {/* ── STATS ────────────────────────────────── */}
          {isLoading ? (
            <StatsSkeleton />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              {[
                { label: "Total hostels", value: totalHostels,  color: "text-gray-900" },
                { label: "Approved",      value: approvedCount, color: "text-lime-600" },
                { label: "Pending",       value: pendingCount,  color: "text-amber-600" },
                { label: "Rejected",      value: rejectedCount, color: "text-red-500" },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-white border border-gray-100 rounded-2xl p-5">
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">{label}</p>
                  <p className={`text-base font-semibold ${color}`}>{value}</p>
                </div>
              ))}
            </div>
          )}

          {/* ── TABS ─────────────────────────────────── */}
          <div className="flex gap-2 mb-5 flex-wrap">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`text-xs px-4 py-1.5 rounded-full border transition-colors capitalize
                  ${activeTab === tab
                    ? "bg-blue-500 text-white border-blue-500"
                    : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
                  }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* ── TAB: OVERVIEW ────────────────────────── */}
          {activeTab === "overview" && (
            <div className="space-y-4">
              <div className="bg-white border border-gray-100 rounded-2xl p-5">
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-4">Quick actions</p>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  {[
                    { icon: "🏠", label: "Add hostel",    desc: "List a new property",         action: () => setShowCreate(true) },
                    { icon: "🛏️", label: "Manage rooms",  desc: "Edit hostels, rooms & images", action: () => setActiveTab("hostels") },
                    { icon: "📋", label: "Bookings",      desc: "View & manage bookings",       action: () => setActiveTab("bookings") },
                    { icon: "⚙️", label: "Account",       desc: "Update profile",               action: () => setActiveTab("account") },
                  ].map(({ icon, label, desc, action }) => (
                    <button
                      key={label}
                      onClick={action}
                      className="flex items-start gap-3 p-4 rounded-2xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50/50 transition-all text-left"
                    >
                      <span className="text-2xl">{icon}</span>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{label}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-white border border-gray-100 rounded-2xl p-5">
                <div className="flex justify-between items-center mb-4">
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Recent hostels</p>
                  <button onClick={() => setActiveTab("hostels")} className="text-xs text-blue-500 hover:underline">
                    View all →
                  </button>
                </div>

                {isLoading ? (
                  <div className="space-y-3">
                    <HostelCardSkeleton />
                    <HostelCardSkeleton />
                  </div>
                ) : hostelList.length === 0 ? (
                  <div className="py-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
                    <p className="text-sm text-gray-400 mb-3">No hostels listed yet</p>
                    <button
                      onClick={() => setShowCreate(true)}
                      className="text-xs px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
                    >
                      + Get started
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {hostelList.slice(0, 3).map((hostel) => (
                      <div
                        key={hostel.id}
                        className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${statusDot(hostel.status)}`} />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">{hostel.name}</p>
                            <p className="text-xs text-gray-400 truncate">{hostel.location}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          <StatusBadge status={hostel.status} />
                          <button
                            onClick={() => setEditingHostel(hostel)}
                            className="text-xs px-3 py-1 rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50 transition-colors"
                          >
                            Manage
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {rejectedCount > 0 && (
                <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex items-start gap-3">
                  <span className="text-red-400 text-lg">⚠️</span>
                  <div>
                    <p className="text-sm font-medium text-red-700">
                      {rejectedCount} hostel{rejectedCount > 1 ? "s" : ""} rejected
                    </p>
                    <p className="text-xs text-red-500 mt-0.5">
                      Review rejected hostels and update their details to resubmit for approval.
                    </p>
                    <button onClick={() => setActiveTab("hostels")} className="text-xs text-red-600 underline mt-1">
                      View hostels →
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── TAB: HOSTELS ─────────────────────────── */}
          {activeTab === "hostels" && (
            <div className="space-y-3">
              <div className="flex justify-between items-center mb-1">
                <p className="text-xs text-gray-400 uppercase tracking-wide">
                  {hostelList.length} {hostelList.length === 1 ? "hostel" : "hostels"} listed
                </p>
                <button
                  onClick={() => setShowCreate(true)}
                  className="text-xs px-4 py-1.5 rounded-full bg-blue-500 text-white border border-blue-500 hover:bg-blue-600 transition-colors"
                >
                  + New
                </button>
              </div>

              {isLoading ? (
                <>
                  <HostelCardSkeleton />
                  <HostelCardSkeleton />
                  <HostelCardSkeleton />
                </>
              ) : hostelList.length === 0 ? (
                <div className="bg-white border border-gray-100 rounded-2xl py-16 text-center">
                  <p className="text-sm text-gray-400">Your hostel list is empty.</p>
                  <button onClick={() => setShowCreate(true)} className="mt-3 text-sm text-blue-500 hover:underline">
                    Add your first property →
                  </button>
                </div>
              ) : (
                hostelList.map((hostel) => (
                  <div key={hostel.id} className="bg-white border border-gray-100 rounded-2xl p-5">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${statusDot(hostel.status)}`} />
                          <p className="text-sm font-semibold text-gray-900">{hostel.name}</p>
                          <StatusBadge status={hostel.status} />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">📍 {hostel.location}</p>
                        {hostel.description && (
                          <p className="text-xs text-gray-400 mt-1.5 line-clamp-1 italic">"{hostel.description}"</p>
                        )}
                        {hostel.amenities?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {hostel.amenities.slice(0, 4).map((a) => (
                              <span key={a.id} className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                                {a.name}
                              </span>
                            ))}
                            {hostel.amenities.length > 4 && (
                              <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                                +{hostel.amenities.length - 4} more
                              </span>
                            )}
                          </div>
                        )}
                        {hostel.images?.length > 0 && (
                          <p className="text-[10px] text-gray-400 mt-1.5">
                            🖼 {hostel.images.length} image{hostel.images.length !== 1 ? "s" : ""}
                            {hostel.images.some((i) => i.is_primary) ? " · 1 primary" : ""}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="text-xs text-gray-400">Added {fmtDate(hostel.created_at)}</div>
                      <div className="flex gap-2 flex-wrap">
                        <button
                          onClick={() => navigate(`/hostels/${hostel.id}`)}
                          className="text-xs px-4 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                        >
                          View
                        </button>
                        <button
                          onClick={() => setEditingHostel(hostel)}
                          className="text-xs px-4 py-2 rounded-xl border border-blue-200 text-blue-600 hover:bg-blue-50 transition-colors"
                        >
                          Manage
                        </button>
                        {deleteId === hostel.id ? (
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => setDeleteId(null)}
                              className="text-xs px-3 py-2 border border-gray-200 text-gray-500 rounded-xl hover:bg-gray-50 transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleDelete(hostel.id)}
                              disabled={deleting}
                              className="text-xs px-3 py-2 border border-red-200 text-red-500 hover:bg-red-50 rounded-xl transition-colors disabled:opacity-50"
                            >
                              {deleting ? "Removing…" : "Confirm delete"}
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteId(hostel.id)}
                            className="text-xs px-4 py-2 rounded-xl border border-red-200 text-red-500 hover:bg-red-50 transition-colors"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ── TAB: BOOKINGS ────────────────────────── */}
          {activeTab === "bookings" && (
            <BookingsTab showToast={showToast} />
          )}

          {/* ── TAB: ACCOUNT ─────────────────────────── */}
          {activeTab === "account" && (
            <div className="bg-white border border-gray-100 rounded-2xl p-5">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-4">Account details</p>

              <div className="space-y-3">
                {[
                  { label: "Full name",    value: `${user?.first_name ?? ""} ${user?.last_name ?? ""}`.trim() },
                  { label: "Email",        value: user?.email },
                  { label: "Phone",        value: user?.phone_number },
                  { label: "Role",         value: user?.role },
                  { label: "Verified",     value: user?.is_verified ? "Yes" : "No" },
                  { label: "Member since", value: fmtDate(user?.created_at) },
                ].map(({ label, value }) => (
                  <div
                    key={label}
                    className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0"
                  >
                    <span className="text-xs text-gray-400">{label}</span>
                    <span className="text-sm text-gray-700 font-medium">{value ?? "-"}</span>
                  </div>
                ))}
              </div>

              <p className="text-xs text-gray-400 uppercase tracking-wide mt-6 mb-3 pt-4 border-t border-gray-50">
                Security settings
              </p>

              {[
                { title: "Change password",    desc: "Update your login credentials",               action: () => navigate("/account/change-password") },
                { title: "Change email",       desc: "A verification link will be sent to your new email", action: () => navigate("/account/change-email") },
                { title: "Change phone number", desc: "Update your M-Pesa registered number",       action: () => navigate("/account/change-phone") },
              ].map(({ title, desc, action }) => (
                <div
                  key={title}
                  className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-800">{title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
                  </div>
                  <button
                    onClick={action}
                    className="text-xs px-4 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    Change
                  </button>
                </div>
              ))}
            </div>
          )}

        </div>
      </div>

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      <Footer />
    </>
  );
};

export default LandlordDashboard;