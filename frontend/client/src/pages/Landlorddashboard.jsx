import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Footer from "../components/Footer";

const BASE = "/api/v1";

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" }) : "-";

const fmt = (n) => `KES ${Number(n || 0).toLocaleString()}`;

// ── SKELETONS ─────────────────────────────────────────────────
const Sk = ({ h = "h-4", w = "w-full", r = "rounded-lg" }) => (
  <div className={`animate-pulse bg-gray-100 ${h} ${w} ${r}`} />
);

const StatsSkeleton = () => (
  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
    {[1,2,3,4].map(i => (
      <div key={i} className="bg-white border border-gray-100 rounded-2xl p-5 space-y-2">
        <Sk h="h-3" w="w-20" />
        <Sk h="h-6" w="w-16" />
      </div>
    ))}
  </div>
);

const HostelCardSkeleton = () => (
  <div className="bg-white border border-gray-100 rounded-2xl p-5 space-y-3">
    <div className="flex justify-between">
      <Sk h="h-4" w="w-32" />
      <Sk h="h-4" w="w-16" r="rounded-full" />
    </div>
    <Sk h="h-3" w="w-48" />
    <div className="flex gap-3">
      <Sk h="h-3" w="w-20" />
      <Sk h="h-3" w="w-20" />
    </div>
  </div>
);

// ── STATUS BADGE ──────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const styles = {
    APPROVED: "bg-lime-50 text-lime-600",
    PENDING:  "bg-amber-50 text-amber-600",
    REJECTED: "bg-red-50 text-red-400",
  };
  return (
    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${styles[status] || "bg-gray-50 text-gray-500"}`}>
      {status}
    </span>
  );
};

// ── CREATE HOSTEL MODAL ───────────────────────────────────────
const CreateHostelModal = ({ onClose, onSuccess }) => {
  const [form, setForm]       = useState({ name: "", location: "", description: "", price_per_semester: "" });
  const [submitting, setSub]  = useState(false);
  const [error, setError]     = useState(null);

  const handleSubmit = async () => {
    if (!form.name || !form.location) return setError("Name and location are required");
    setSub(true);
    setError(null);
    try {
      const { data } = await axios.post(`${BASE}/hostels/`, {
        name:                form.name,
        location:            form.location,
        description:         form.description,
        price_per_semester:  Number(form.price_per_semester),
      }, { withCredentials: true });
      onSuccess(data);
    } catch (e) {
      setError(e.response?.data?.detail || "Failed to create hostel");
      setSub(false);
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
            { label: "Hostel name",         key: "name",               placeholder: "e.g. Sunrise Hostel" },
            { label: "Location",            key: "location",           placeholder: "e.g. Near LU Gate 2" },
            { label: "Description",         key: "description",        placeholder: "Brief description (optional)" },
            { label: "Price per semester (KES)", key: "price_per_semester", placeholder: "e.g. 25000", type: "number" },
          ].map(({ label, key, placeholder, type = "text" }) => (
            <div key={key}>
              <label className="text-xs text-gray-500 uppercase mb-1 block">{label}</label>
              <input
                type={type}
                value={form[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                placeholder={placeholder}
                className="w-full border border-gray-200 px-4 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
          ))}
        </div>

        {error && (
          <div className="mt-3 bg-red-50 border border-red-100 text-red-500 text-xs px-4 py-2 rounded-xl">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="text-xs px-4 py-2 border border-gray-200 text-gray-500 rounded-xl hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="text-xs px-5 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl disabled:opacity-50 flex items-center gap-2"
          >
            {submitting && <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {submitting ? "Creating…" : "Create hostel"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── MAIN DASHBOARD ────────────────────────────────────────────
const LandlordDashboard = () => {
  const navigate  = useNavigate();
  const user      = useSelector((s) => s.auth.user);

  const [hostels,      setHostels]      = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [activeTab,    setActiveTab]    = useState("overview");
  const [showCreate,   setShowCreate]   = useState(false);
  const [deleteId,     setDeleteId]     = useState(null);
  const [deleting,     setDeleting]     = useState(false);

  // Derived stats
  const totalHostels  = hostels.length;
  const approvedCount = hostels.filter(h => h.status === "APPROVED").length;
  const pendingCount  = hostels.filter(h => h.status === "PENDING").length;

  useEffect(() => {
    fetchHostels();
  }, []);

  const fetchHostels = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${BASE}/hostels/`, { withCredentials: true });
      // Filter to only this landlord's hostels
      setHostels(data.filter(h => h.owner_id === user?.id) ?? data);
    } catch (e) {
      setHostels([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    setDeleting(true);
    try {
      await axios.delete(`${BASE}/hostels/${id}`, { withCredentials: true });
      setHostels(prev => prev.filter(h => h.id !== id));
      setDeleteId(null);
    } catch (e) {
      // silently fail — user sees no change
    } finally {
      setDeleting(false);
    }
  };

  const handleCreateSuccess = (newHostel) => {
    setHostels(prev => [newHostel, ...prev]);
    setShowCreate(false);
  };

  const initials = user
    ? `${user.first_name?.[0] ?? ""}${user.last_name?.[0] ?? ""}`.toUpperCase()
    : "?";

  return (
    <>
      {showCreate && (
        <CreateHostelModal
          onClose={() => setShowCreate(false)}
          onSuccess={handleCreateSuccess}
        />
      )}

      <div className="min-h-screen bg-gray-50 pt-24 px-4 pb-16">
        <div className="max-w-4xl mx-auto">

          {/* ── HEADER CARD ──────────────────────────── */}
          <div className="bg-white border border-gray-100 rounded-2xl p-6 mb-6">
            <div className="flex items-center gap-4">
              {user?.profile_image ? (
                <img src={user.profile_image} alt="Profile" className="w-14 h-14 rounded-2xl object-cover" />
              ) : (
                <div className="w-14 h-14 rounded-2xl bg-purple-500 flex items-center justify-center text-white text-xl font-semibold">
                  {initials}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl font-semibold text-gray-900">
                    {user?.first_name} {user?.last_name}
                  </h1>
                  <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-purple-50 text-purple-500">
                    LANDLORD
                  </span>
                  {user?.is_verified && (
                    <span className="text-xs px-2.5 py-1 rounded-full bg-lime-50 text-lime-600 font-medium">
                      ✓ Verified
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-0.5">{user?.email}</p>
              </div>
              <button
                onClick={() => setShowCreate(true)}
                className="text-xs px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition-colors shrink-0"
              >
                + New hostel
              </button>
            </div>
          </div>

          {/* ── STATS ────────────────────────────────── */}
          {loading ? <StatsSkeleton /> : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              {[
                { label: "Total hostels",    value: totalHostels },
                { label: "Approved",         value: approvedCount },
                { label: "Pending approval", value: pendingCount },
                { label: "Member since",     value: fmtDate(user?.created_at) },
              ].map(({ label, value }) => (
                <div key={label} className="bg-white border border-gray-100 rounded-2xl p-5">
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">{label}</p>
                  <p className="text-base font-semibold text-gray-900">{value}</p>
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
              {/* Quick actions */}
              <div className="bg-white border border-gray-100 rounded-2xl p-5">
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-4">Quick actions</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { icon: "🏠", label: "Add hostel",   desc: "List a new property",         action: () => setShowCreate(true) },
                    { icon: "🛏️", label: "Manage rooms",  desc: "Add or update room types",    action: () => setActiveTab("hostels") },
                    { icon: "⚙️", label: "Account",       desc: "Update your profile",         action: () => setActiveTab("account") },
                  ].map(({ icon, label, desc, action }) => (
                    <button
                      key={label}
                      onClick={action}
                      className="flex items-start gap-3 p-4 rounded-2xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50 transition-all text-left"
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

              {/* Recent hostels preview */}
              <div className="bg-white border border-gray-100 rounded-2xl p-5">
                <div className="flex justify-between items-center mb-4">
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Recent hostels</p>
                  <button onClick={() => setActiveTab("hostels")} className="text-xs text-blue-500 hover:underline">
                    View all →
                  </button>
                </div>
                {loading ? (
                  <div className="space-y-3">
                    {[1,2].map(i => <HostelCardSkeleton key={i} />)}
                  </div>
                ) : hostels.length === 0 ? (
                  <div className="py-10 text-center">
                    <p className="text-sm text-gray-400 mb-3">No hostels yet</p>
                    <button
                      onClick={() => setShowCreate(true)}
                      className="text-xs px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors"
                    >
                      + Add your first hostel
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {hostels.slice(0, 3).map(hostel => (
                      <div key={hostel.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                        <div>
                          <p className="text-sm font-medium text-gray-800">{hostel.name}</p>
                          <p className="text-xs text-gray-400">{hostel.location}</p>
                        </div>
                        <StatusBadge status={hostel.status} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── TAB: HOSTELS ─────────────────────────── */}
          {activeTab === "hostels" && (
            <div className="space-y-3">
              <div className="flex justify-between items-center mb-1">
                <p className="text-xs text-gray-400 uppercase tracking-wide">
                  {hostels.length} {hostels.length === 1 ? "hostel" : "hostels"}
                </p>
                <button
                  onClick={() => setShowCreate(true)}
                  className="text-xs px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition-colors"
                >
                  + New hostel
                </button>
              </div>

              {loading ? (
                [1,2,3].map(i => <HostelCardSkeleton key={i} />)
              ) : hostels.length === 0 ? (
                <div className="bg-white border border-gray-100 rounded-2xl py-16 text-center">
                  <p className="text-sm text-gray-400 mb-3">No hostels yet</p>
                  <button
                    onClick={() => setShowCreate(true)}
                    className="text-xs px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors"
                  >
                    + Add your first hostel
                  </button>
                </div>
              ) : (
                hostels.map(hostel => (
                  <div key={hostel.id} className="bg-white border border-gray-100 rounded-2xl p-5">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-gray-900">{hostel.name}</p>
                          <StatusBadge status={hostel.status} />
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">📍 {hostel.location}</p>
                        {hostel.description && (
                          <p className="text-xs text-gray-400 mt-1 line-clamp-1">{hostel.description}</p>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex gap-4 text-xs text-gray-500">
                        {hostel.price_per_semester && (
                          <span>{fmt(hostel.price_per_semester)} / sem</span>
                        )}
                        <span className="text-gray-300">•</span>
                        <span>Added {fmtDate(hostel.created_at)}</span>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => navigate(`/hostels/${hostel.id}`)}
                          className="text-xs px-3 py-1.5 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition-colors"
                        >
                          View
                        </button>
                        {deleteId === hostel.id ? (
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => setDeleteId(null)}
                              className="text-xs px-3 py-1.5 border border-gray-200 text-gray-500 rounded-xl hover:bg-gray-50"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleDelete(hostel.id)}
                              disabled={deleting}
                              className="text-xs px-3 py-1.5 border border-red-200 text-red-500 rounded-xl hover:bg-red-50 disabled:opacity-50"
                            >
                              {deleting ? "…" : "Confirm"}
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteId(hostel.id)}
                            className="text-xs px-3 py-1.5 border border-red-100 text-red-400 rounded-xl hover:bg-red-50 transition-colors"
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
            <div className="bg-white border border-gray-100 rounded-2xl p-5 space-y-1">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-4">Account details</p>
              <div className="space-y-3 mb-6">
                {[
                  { label: "Full name",    value: `${user?.first_name ?? ""} ${user?.last_name ?? ""}`.trim() },
                  { label: "Email",        value: user?.email },
                  { label: "Phone",        value: user?.phone_number },
                  { label: "Role",         value: user?.role },
                  { label: "Verified",     value: user?.is_verified ? "Yes" : "No" },
                  { label: "Member since", value: fmtDate(user?.created_at) },
                  { label: "Last login",   value: fmtDate(user?.last_login) },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                    <span className="text-xs text-gray-400">{label}</span>
                    <span className="text-sm text-gray-700 font-medium">{value ?? "-"}</span>
                  </div>
                ))}
              </div>

              <p className="text-xs text-gray-400 uppercase tracking-wide mb-3 pt-2">Security</p>
              {[
                { title: "Change password",    desc: "Confirm via email link",               action: () => navigate("/change-password") },
                { title: "Change email",       desc: "Verify with your new email",           action: () => navigate("/change-email") },
                { title: "Change phone",       desc: "Update your M-Pesa number",            action: () => navigate("/change-phone") },
              ].map(({ title, desc, action }) => (
                <div key={title} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
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