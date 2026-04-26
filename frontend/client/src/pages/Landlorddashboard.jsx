import { useEffect, useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
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
          name: form.name,
          location: form.location,
          description: form.description || null,
          latitude: form.latitude ? parseFloat(form.latitude) : null,
          longitude: form.longitude ? parseFloat(form.longitude) : null,
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
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="space-y-3">
          {[
            { label: "Hostel name",    key: "name",        placeholder: "e.g. Sunrise Hostel" },
            { label: "Location",       key: "location",    placeholder: "e.g. Near LU Gate 2" },
            { label: "Description",    key: "description", placeholder: "Brief description (optional)" },
            { label: "Latitude",       key: "latitude",    placeholder: "e.g. -1.2921", type: "number" },
            { label: "Longitude",      key: "longitude",   placeholder: "e.g. 36.8219", type: "number" },
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

  const hostelList = hostels ?? [];

  const totalHostels  = hostelList.length;
  const approvedCount = hostelList.filter((h) => (h.status || "").toUpperCase() === "APPROVED").length;
  const pendingCount  = hostelList.filter((h) => (h.status || "").toUpperCase() === "PENDING").length;
  const rejectedCount = hostelList.filter((h) => (h.status || "").toUpperCase() === "REJECTED").length;

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
      alert("Failed to delete hostel. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  // When hostel is saved in modal, re-open with refreshed data
  const handleHostelSaved = useCallback(async (hostelId) => {
    await dispatch(fetchMyHostels());
    // If a hostelId is returned, keep modal open with refreshed hostel
    if (hostelId && editingHostel) {
      // updated data will come from re-fetched hostels list
    }
    setEditingHostel(null);
  }, [dispatch, editingHostel]);

  const initials = user
    ? `${user.first_name?.[0] ?? ""}${user.last_name?.[0] ?? ""}`.toUpperCase()
    : "?";

  const isLoading = loading && hostelList.length === 0;

  // Status dot for sidebar/list
  const statusDot = (status) => {
    const s = (status || "").toUpperCase();
    if (s === "APPROVED")  return "bg-lime-400";
    if (s === "PENDING")   return "bg-amber-400";
    if (s === "REJECTED")  return "bg-red-400";
    if (s === "SUSPENDED") return "bg-gray-400";
    return "bg-gray-300";
  };

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
              <button
                onClick={() => dispatch(fetchMyHostels())}
                className="underline font-medium"
              >
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
                <div className="shrink-0">
                  {user?.profile_image ? (
                    <img
                      src={user.profile_image}
                      alt="Profile"
                      className="w-14 h-14 rounded-2xl object-cover"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-2xl bg-blue-500 flex items-center justify-center text-white text-xl font-semibold">
                      {initials}
                    </div>
                  )}
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
          <div className="flex gap-2 mb-5">
            {["overview", "hostels", "account"].map((tab) => (
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
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    {
                      icon: "🏠",
                      label: "Add hostel",
                      desc: "List a new property",
                      action: () => setShowCreate(true),
                    },
                    {
                      icon: "🛏️",
                      label: "Manage rooms",
                      desc: "Edit hostels, rooms & images",
                      action: () => setActiveTab("hostels"),
                    },
                    {
                      icon: "⚙️",
                      label: "Account",
                      desc: "Update profile",
                      action: () => setActiveTab("account"),
                    },
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
                  <button
                    onClick={() => setActiveTab("hostels")}
                    className="text-xs text-blue-500 hover:underline"
                  >
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

              {/* Rejected hostels notice */}
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
                    <button
                      onClick={() => setActiveTab("hostels")}
                      className="text-xs text-red-600 underline mt-1"
                    >
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
                  <button
                    onClick={() => setShowCreate(true)}
                    className="mt-3 text-sm text-blue-500 hover:underline"
                  >
                    Add your first property →
                  </button>
                </div>
              ) : (
                hostelList.map((hostel) => (
                  <div
                    key={hostel.id}
                    className="bg-white border border-gray-100 rounded-2xl p-5"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${statusDot(hostel.status)}`} />
                          <p className="text-sm font-semibold text-gray-900">{hostel.name}</p>
                          <StatusBadge status={hostel.status} />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">📍 {hostel.location}</p>
                        {hostel.description && (
                          <p className="text-xs text-gray-400 mt-1.5 line-clamp-1 italic">
                            "{hostel.description}"
                          </p>
                        )}
                        {/* Amenity chips */}
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
                        {/* Image count */}
                        {hostel.images?.length > 0 && (
                          <p className="text-[10px] text-gray-400 mt-1.5">
                            🖼 {hostel.images.length} image{hostel.images.length !== 1 ? "s" : ""}
                            {hostel.images.some((i) => i.is_primary) ? " · 1 primary" : ""}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="text-xs text-gray-400">
                        Added {fmtDate(hostel.created_at)}
                      </div>

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
                {
                  title:  "Change password",
                  desc:   "Update your login credentials",
                  action: () => navigate("/account/change-password"),
                },
                {
                  title:  "Change email",
                  desc:   "A verification link will be sent to your new email",
                  action: () => navigate("/account/change-email"),
                },
                {
                  title:  "Change phone number",
                  desc:   "Update your M-Pesa registered number",
                  action: () => navigate("/account/change-phone"),
                },
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
      <Footer />
    </>
  );
};

export default LandlordDashboard;