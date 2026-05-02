import { useState, useEffect, useCallback } from "react";
import {
  Users, Building2, BedDouble, BookOpen, ClipboardList,
  ChevronDown, ChevronUp, X, Check, AlertCircle, CheckCircle2,
  Loader2, Trash2, Edit2, ShieldCheck,
  Star, StarOff, Ban, RefreshCw, Search,
  ArrowUpRight, UserCheck, UserX,
  BarChart3, LogOut, Bell, Menu, FileText, Image,
  RotateCcw,
} from "lucide-react";
import api from "../api/axios";

// ── HELPERS ───────────────────────────────────────────────────
const getErrorMsg = (e, fallback = "Something went wrong") => {
  const detail = e?.response?.data?.detail;
  if (!detail) return fallback;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail.map((d) => (typeof d === "string" ? d : d.msg || JSON.stringify(d))).join(", ");
  return fallback;
};

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" }) : "—";
const fmtTime = (d) =>
  d ? new Date(d).toLocaleString("en-KE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";
const fmt = (n) => `KES ${Number(n || 0).toLocaleString()}`;

// ── PDF / FILE URL HELPERS ────────────────────────────────────
const isPdfUrl = (url) => {
  if (!url) return false;
  return /\.pdf($|\?)/i.test(url) || url.includes("/raw/upload/");
};

const isImageUrl = (url) => {
  if (!url) return false;
  return /\.(jpg|jpeg|png|webp|gif)($|\?)/i.test(url) || url.includes("/image/upload/");
};

const getInlinePdfUrl = (url) => {
  if (!url) return url;
  if (url.includes("fl_inline")) return url;
  if (url.includes("res.cloudinary.com")) {
    return url.replace(/\/upload\/(?!fl_inline)/, "/upload/fl_inline/");
  }
  return `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;
};

const getViewUrl = (url) => {
  if (!url) return url;
  if (isImageUrl(url)) return url;
  return getInlinePdfUrl(url);
};

// ── TABS CONFIG ───────────────────────────────────────────────
const TABS = [
  { id: "overview",  label: "Overview",          shortLabel: "Home",     icon: BarChart3 },
  { id: "users",     label: "Users",             shortLabel: "Users",    icon: Users },
  { id: "requests",  label: "Landlord Requests", shortLabel: "Requests", icon: ClipboardList },
  { id: "hostels",   label: "Hostels",           shortLabel: "Hostels",  icon: Building2 },
  { id: "rooms",     label: "Rooms",             shortLabel: "Rooms",    icon: BedDouble },
  { id: "bookings",  label: "Bookings",          shortLabel: "Bookings", icon: BookOpen },
];

const TAB_TINT = {
  overview: "from-blue-50/70 via-gray-50 to-gray-50",
  users:    "from-purple-50/50 via-gray-50 to-gray-50",
  requests: "from-amber-50/50 via-gray-50 to-gray-50",
  hostels:  "from-lime-50/40 via-gray-50 to-gray-50",
  rooms:    "from-cyan-50/40 via-gray-50 to-gray-50",
  bookings: "from-indigo-50/40 via-gray-50 to-gray-50",
};

// ── TOAST ─────────────────────────────────────────────────────
function Toast({ message, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, [onClose]);
  const styles = {
    success: "bg-lime-50 border-lime-200 text-lime-700",
    error:   "bg-red-50 border-red-200 text-red-600",
    info:    "bg-blue-50 border-blue-200 text-blue-600",
  };
  const Icon = type === "success" ? CheckCircle2 : type === "error" ? AlertCircle : Bell;
  return (
    <div className={`fixed bottom-20 lg:bottom-6 left-4 right-4 lg:left-auto lg:right-6 lg:max-w-sm z-200 flex items-center gap-3 px-4 py-3 rounded-2xl border shadow-lg text-sm font-medium ${styles[type] || styles.info}`}
      style={{ animation: "slideUp .2s ease both" }}>
      <Icon size={15} className="shrink-0" />
      <span className="flex-1">{String(message)}</span>
      <button onClick={onClose} className="opacity-50 hover:opacity-100 shrink-0"><X size={13} /></button>
    </div>
  );
}

// ── BADGES ────────────────────────────────────────────────────
const mkBadge = (color, text) => (
  <span className={`inline-flex items-center text-xs px-2.5 py-1 rounded-full font-medium ${color}`}>{text}</span>
);
const HostelStatusBadge = ({ status }) => {
  const m = { APPROVED: "bg-lime-50 text-lime-600", PENDING: "bg-amber-50 text-amber-600", REJECTED: "bg-red-50 text-red-400", SUSPENDED: "bg-gray-100 text-gray-500" };
  return mkBadge(m[(status || "").toUpperCase()] || "bg-gray-100 text-gray-500", status || "Unknown");
};
const RoleBadge = ({ role }) => {
  const m = { ADMIN: "bg-red-50 text-red-500", LANDLORD: "bg-purple-50 text-purple-500", STUDENT: "bg-blue-50 text-blue-500" };
  return mkBadge(m[role] || "bg-gray-100 text-gray-500", role);
};
const RequestStatusBadge = ({ status }) => {
  const m = { PENDING: "bg-amber-50 text-amber-600", APPROVED: "bg-lime-50 text-lime-600", REJECTED: "bg-red-50 text-red-400" };
  return mkBadge(m[status] || "bg-gray-100 text-gray-500", status);
};
const BookingStatusBadge = ({ status }) => {
  const m = { CONFIRMED: "bg-lime-50 text-lime-600", ACTIVE: "bg-blue-50 text-blue-500", PENDING: "bg-amber-50 text-amber-600", CANCELLED: "bg-red-50 text-red-400" };
  return mkBadge(m[status] || "bg-gray-100 text-gray-500", status);
};
const RoomStatusBadge = ({ status }) => {
  const m = { AVAILABLE: "bg-lime-50 text-lime-600", PARTIALLY_OCCUPIED: "bg-amber-50 text-amber-600", FULLY_OCCUPIED: "bg-orange-50 text-orange-600", MAINTENANCE: "bg-red-50 text-red-400" };
  return mkBadge(m[status] || "bg-gray-100 text-gray-500", (status || "").replace(/_/g, " "));
};
const PaymentStatusBadge = ({ status }) => {
  const m = {
    PENDING:          "bg-gray-100 text-gray-500",
    SUCCESS:          "bg-lime-50 text-lime-600",
    FAILED:           "bg-red-50 text-red-400",
    REFUND_REQUESTED: "bg-amber-50 text-amber-600",
    REFUNDED:         "bg-blue-50 text-blue-500",
    REFUND_REJECTED:  "bg-red-100 text-red-600",
  };
  return mkBadge(m[status] || "bg-gray-100 text-gray-500", (status || "").replace(/_/g, " "));
};

// ── SKELETON ──────────────────────────────────────────────────
const Skel = ({ h = "h-4", w = "w-full", r = "rounded-lg" }) => (
  <div className={`animate-pulse bg-gray-100 ${h} ${w} ${r}`} />
);

// ── DOCUMENT VIEWER MODAL ─────────────────────────────────────
function DocumentViewerModal({ doc, onClose }) {
  const { label, url } = doc;
  const isImg = isImageUrl(url);
  const viewUrl = getViewUrl(url);

  return (
    <div className="fixed inset-0 z-200 bg-black/60 backdrop-blur-sm flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          {isImg
            ? <Image size={15} className="text-blue-500 shrink-0" />
            : <FileText size={15} className="text-red-500 shrink-0" />}
          <p className="text-sm font-semibold text-gray-900 truncate">{label}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <a href={viewUrl} target="_blank" rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 text-xs border border-gray-200 text-gray-500 rounded-xl hover:bg-gray-50 transition">
            <ArrowUpRight size={12} /> Open in tab
          </a>
          <button onClick={onClose} className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition">
            <X size={16} />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-hidden bg-gray-100">
        {isImg ? (
          <div className="w-full h-full flex items-center justify-center p-4">
            <img src={viewUrl} alt={label} className="max-w-full max-h-full object-contain rounded-xl shadow-lg" />
          </div>
        ) : (
          <iframe src={viewUrl} title={label} className="w-full h-full border-0"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms" />
        )}
      </div>
    </div>
  );
}

// ── DOCUMENT LINK BUTTON ──────────────────────────────────────
function DocButton({ label, url, onView }) {
  if (!url) return null;
  const isImg = isImageUrl(url);
  return (
    <button onClick={() => onView({ label, url })}
      className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-gray-50 text-blue-500 border border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition active:scale-95">
      {isImg ? <Image size={10} className="shrink-0" /> : <FileText size={10} className="shrink-0" />}
      {label}
    </button>
  );
}

// ── CONFIRM MODAL ─────────────────────────────────────────────
function ConfirmModal({ title, message, onConfirm, onCancel, danger = true, loading = false, children }) {
  return (
    <div className="fixed inset-0 z-150 bg-black/20 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white border border-gray-100 rounded-t-3xl sm:rounded-2xl p-6 w-full sm:max-w-sm shadow-xl">
        <h3 className="text-base font-semibold text-gray-900 mb-1">{title}</h3>
        <p className="text-sm text-gray-500 mb-4">{message}</p>
        {children}
        <div className="flex gap-2 mt-4">
          <button onClick={onCancel} className="flex-1 px-4 py-3 text-sm border border-gray-200 text-gray-500 rounded-xl hover:bg-gray-50 transition">Cancel</button>
          <button onClick={onConfirm} disabled={loading}
            className={`flex-1 px-4 py-3 text-sm font-semibold rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-2 ${danger ? "bg-red-500 hover:bg-red-600 text-white" : "bg-blue-500 hover:bg-blue-600 text-white"}`}>
            {loading && <Loader2 size={13} className="animate-spin" />} Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

// ── SEARCH BAR ────────────────────────────────────────────────
function SearchBar({ value, onChange, placeholder }) {
  return (
    <div className="relative">
      <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 transition" />
    </div>
  );
}

// ── FILTER PILLS ──────────────────────────────────────────────
function FilterPills({ options, value, onChange }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-0.5 no-scrollbar">
      {options.map(({ label, val }) => (
        <button key={val} onClick={() => onChange(val)}
          className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition
            ${value === val ? "bg-blue-500 text-white border-blue-500" : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"}`}>
          {label}
        </button>
      ))}
    </div>
  );
}

// ── STAT CARD ─────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, sub, accent = "text-gray-900", bg = "bg-white", border = "border-gray-100" }) {
  return (
    <div className={`${bg} border ${border} rounded-2xl p-4 sm:p-5`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1.5">{label}</p>
          <p className={`text-2xl font-semibold ${accent}`}>{value ?? "—"}</p>
          {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
        <div className="p-2.5 bg-white/60 rounded-xl">
          <Icon size={17} className="text-gray-400" />
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// OVERVIEW TAB
// ══════════════════════════════════════════════════════════════
function OverviewTab({ showToast, onNavigate }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [usersRes, hostelsRes, roomsRes, bookingsRes, requestsRes] = await Promise.allSettled([
          api.get("/admin/users"),
          api.get("/admin/hostels/"),
          api.get("/rooms/"),
          api.get("/bookings/"),
          api.get("/admin/landlord-requests/"),
        ]);

        const users    = usersRes.status    === "fulfilled" ? usersRes.value.data    : {};
        const hostels  = hostelsRes.status  === "fulfilled" ? hostelsRes.value.data  : {};
        const rooms    = roomsRes.status    === "fulfilled" ? roomsRes.value.data    : [];
        const bookings = bookingsRes.status === "fulfilled" ? bookingsRes.value.data : [];
        const requests = requestsRes.status === "fulfilled" ? requestsRes.value.data : [];

        const hostelList  = hostels.hostels || [];
        const bookingList = Array.isArray(bookings) ? bookings : [];
        const requestList = Array.isArray(requests) ? requests : [];
        const roomList    = Array.isArray(rooms) ? rooms : [];

        setStats({
          totalUsers:      users.total || 0,
          landlords:       (users.users || []).filter((u) => u.role === "LANDLORD").length,
          totalHostels:    hostels.total || 0,
          approvedHostels: hostelList.filter((h) => h.status === "APPROVED").length,
          pendingHostels:  hostelList.filter((h) => h.status === "PENDING").length,
          totalRooms:      roomList.length,
          availableRooms:  roomList.filter((r) => r.status === "AVAILABLE").length,
          totalBookings:   bookingList.length,
          activeBookings:  bookingList.filter((b) => b.status === "ACTIVE").length,
          pendingRequests: requestList.filter((r) => r.status === "PENDING").length,
          revenue:         bookingList.reduce((s, b) => s + (b.amount_paid || 0), 0),
        });
      } catch { showToast("Some stats failed to load", "info"); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  if (loading) return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-white border border-gray-100 rounded-2xl p-4 space-y-2">
            <Skel h="h-3" w="w-20" /><Skel h="h-6" w="w-14" />
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Users"    value={stats?.totalUsers}    icon={Users}     sub={`${stats?.landlords} landlords`}      bg="bg-blue-50/70"   border="border-blue-100/60" />
        <StatCard label="Hostels"  value={stats?.totalHostels}  icon={Building2} sub={`${stats?.approvedHostels} approved`} bg="bg-lime-50/70"   border="border-lime-100/60" />
        <StatCard label="Rooms"    value={stats?.totalRooms}    icon={BedDouble} sub={`${stats?.availableRooms} available`} bg="bg-cyan-50/70"   border="border-cyan-100/60" />
        <StatCard label="Bookings" value={stats?.totalBookings} icon={BookOpen}  sub={`${stats?.activeBookings} active`}    bg="bg-indigo-50/70" border="border-indigo-100/60" />
      </div>

      {(stats?.pendingRequests > 0 || stats?.pendingHostels > 0) && (
        <div className="space-y-2">
          {stats?.pendingRequests > 0 && (
            <button onClick={() => onNavigate("requests")}
              className="w-full flex items-center gap-4 p-4 bg-amber-50 border border-amber-100 rounded-2xl hover:border-amber-200 transition text-left active:scale-[0.98]">
              <div className="p-2.5 bg-white rounded-xl border border-amber-100 shrink-0">
                <ClipboardList size={18} className="text-amber-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 text-sm">{stats.pendingRequests} pending landlord request{stats.pendingRequests !== 1 ? "s" : ""}</p>
                <p className="text-xs text-amber-500 mt-0.5">Review applications →</p>
              </div>
            </button>
          )}
          {stats?.pendingHostels > 0 && (
            <button onClick={() => onNavigate("hostels")}
              className="w-full flex items-center gap-4 p-4 bg-blue-50 border border-blue-100 rounded-2xl hover:border-blue-200 transition text-left active:scale-[0.98]">
              <div className="p-2.5 bg-white rounded-xl border border-blue-100 shrink-0">
                <Building2 size={18} className="text-blue-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 text-sm">{stats.pendingHostels} hostel{stats.pendingHostels !== 1 ? "s" : ""} awaiting review</p>
                <p className="text-xs text-blue-500 mt-0.5">Approve or reject →</p>
              </div>
            </button>
          )}
        </div>
      )}

      <div className="bg-linear-to-br from-blue-500 to-blue-600 rounded-2xl p-5 text-white">
        <p className="text-xs text-blue-100 uppercase tracking-wide mb-1">Total payments collected</p>
        <p className="text-3xl font-bold">KSh {stats?.revenue?.toLocaleString() || "0"}</p>
        <p className="text-xs text-blue-200 mt-1">Across {stats?.totalBookings} booking{stats?.totalBookings !== 1 ? "s" : ""}</p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Users",    id: "users",    icon: Users,     bg: "bg-purple-50", border: "border-purple-100", ic: "text-purple-400" },
          { label: "Hostels",  id: "hostels",  icon: Building2, bg: "bg-lime-50",   border: "border-lime-100",   ic: "text-lime-500" },
          { label: "Bookings", id: "bookings", icon: BookOpen,  bg: "bg-indigo-50", border: "border-indigo-100", ic: "text-indigo-400" },
        ].map(({ label, id, icon: Icon, bg, border, ic }) => (
          <button key={id} onClick={() => onNavigate(id)}
            className={`${bg} border ${border} rounded-2xl p-3 flex flex-col items-center gap-1.5 hover:opacity-80 transition active:scale-95`}>
            <Icon size={20} className={ic} />
            <span className="text-xs font-medium text-gray-600">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// USERS TAB
// ══════════════════════════════════════════════════════════════
function UsersTab({ showToast }) {
  const [users,      setUsers]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [confirm,    setConfirm]    = useState(null);
  const [acting,     setActing]     = useState(null);
  const [editUser,   setEditUser]   = useState(null);
  const [editDraft,  setEditDraft]  = useState({});
  const [saving,     setSaving]     = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/users");
      setUsers(data.users || []);
    } catch (e) {
      showToast(getErrorMsg(e, "Failed to load users"), "error");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleToggleSuspend = async () => {
    const { user } = confirm; setActing(user.id);
    try {
      await api.patch(`/admin/users/${user.id}`, { is_suspended: !user.is_suspended });
      setUsers(p => p.map(u => u.id === user.id ? { ...u, is_suspended: !u.is_suspended } : u));
      showToast(`User ${user.is_suspended ? "unsuspended" : "suspended"}`);
    } catch (e) { showToast(getErrorMsg(e, "Failed"), "error"); }
    finally { setActing(null); setConfirm(null); }
  };

  const handleDelete = async () => {
    const { user } = confirm; setActing(user.id);
    try {
      await api.delete(`/admin/users/${user.id}`);
      setUsers(p => p.filter(u => u.id !== user.id));
      showToast("User deleted");
    } catch (e) { showToast(getErrorMsg(e, "Failed"), "error"); }
    finally { setActing(null); setConfirm(null); }
  };

  const handleSaveEdit = async () => {
    setSaving(true);
    try {
      const { data } = await api.patch(`/admin/users/${editUser.id}`, editDraft);
      setUsers(p => p.map(u => u.id === editUser.id ? { ...u, ...data } : u));
      showToast("User updated"); setEditUser(null);
    } catch (e) { showToast(getErrorMsg(e, "Failed"), "error"); }
    finally { setSaving(false); }
  };

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    return (!q || u.email?.toLowerCase().includes(q) || `${u.first_name} ${u.last_name}`.toLowerCase().includes(q))
      && (roleFilter === "all" || u.role === roleFilter);
  });

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <SearchBar value={search} onChange={setSearch} placeholder="Search by name or email…" />
        <div className="flex gap-2 items-center">
          <FilterPills value={roleFilter} onChange={setRoleFilter}
            options={[{ label: "All", val: "all" }, { label: "Students", val: "STUDENT" }, { label: "Landlords", val: "LANDLORD" }, { label: "Admins", val: "ADMIN" }]} />
          <button onClick={load} className="shrink-0 p-2.5 bg-white border border-gray-200 rounded-xl text-gray-400 hover:text-gray-600 transition">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white border border-gray-100 rounded-2xl p-4">
              <div className="flex items-center gap-3"><Skel h="h-10" w="w-10" r="rounded-xl" /><div className="flex-1 space-y-1.5"><Skel h="h-3" w="w-36" /><Skel h="h-3" w="w-24" /></div></div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-2xl py-16 text-center">
          <p className="text-sm text-gray-400">No users found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(user => (
            <div key={user.id} className="bg-white border border-gray-100 rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center text-xs font-bold text-white shrink-0">
                  {(user.first_name?.[0] || "") + (user.last_name?.[0] || "")}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-gray-900 text-sm">{user.first_name} {user.last_name}</p>
                    <RoleBadge role={user.role} />
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5 truncate">{user.email}</p>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    {user.is_verified
                      ? <span className="text-xs text-lime-600 flex items-center gap-1"><Check size={10} /> Verified</span>
                      : <span className="text-xs text-gray-400">Unverified</span>}
                    {user.is_suspended && <span className="text-xs text-red-500 flex items-center gap-1"><Ban size={10} /> Suspended</span>}
                    <span className="text-xs text-gray-400 ml-auto">{fmtDate(user.created_at)}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mt-3 pt-3 border-t border-gray-50">
                <button
                  onClick={() => { setEditUser(user); setEditDraft({ role: user.role, is_verified: user.is_verified, is_suspended: user.is_suspended }); }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition active:scale-95">
                  <Edit2 size={12} /> Edit
                </button>
                <button onClick={() => setConfirm({ type: "suspend", user })} disabled={acting === user.id}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs border rounded-xl transition active:scale-95
                    ${user.is_suspended ? "border-lime-200 text-lime-600 hover:bg-lime-50" : "border-amber-200 text-amber-600 hover:bg-amber-50"}`}>
                  {user.is_suspended ? <UserCheck size={12} /> : <UserX size={12} />}
                  {user.is_suspended ? "Unsuspend" : "Suspend"}
                </button>
                <button onClick={() => setConfirm({ type: "delete", user })} disabled={acting === user.id}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs border border-red-200 text-red-500 rounded-xl hover:bg-red-50 transition active:scale-95">
                  <Trash2 size={12} /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editUser && (
        <div className="fixed inset-0 z-150 bg-black/20 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white border border-gray-100 rounded-t-3xl sm:rounded-2xl p-6 w-full sm:max-w-sm shadow-xl">
            <div className="flex justify-between items-center mb-5">
              <h3 className="font-semibold text-gray-900">Edit User</h3>
              <button onClick={() => setEditUser(null)} className="p-1 text-gray-400 hover:text-gray-600"><X size={16} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-500 uppercase mb-1.5 block">Role</label>
                <select value={editDraft.role} onChange={e => setEditDraft(p => ({ ...p, role: e.target.value }))}
                  className="w-full px-3 py-3 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400">
                  <option value="STUDENT">Student</option>
                  <option value="LANDLORD">Landlord</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
              <label className="flex items-center gap-3 cursor-pointer py-1">
                <input type="checkbox" checked={editDraft.is_verified} onChange={e => setEditDraft(p => ({ ...p, is_verified: e.target.checked }))} className="w-5 h-5 rounded" />
                <span className="text-sm text-gray-700">Email verified</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer py-1">
                <input type="checkbox" checked={editDraft.is_suspended} onChange={e => setEditDraft(p => ({ ...p, is_suspended: e.target.checked }))} className="w-5 h-5 rounded" />
                <span className="text-sm text-gray-700">Suspended</span>
              </label>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setEditUser(null)} className="flex-1 px-4 py-3 text-sm border border-gray-200 text-gray-500 rounded-xl hover:bg-gray-50 transition">Cancel</button>
              <button onClick={handleSaveEdit} disabled={saving} className="flex-1 px-4 py-3 text-sm font-semibold bg-blue-500 hover:bg-blue-600 text-white rounded-xl disabled:opacity-50 flex items-center justify-center gap-2">
                {saving && <Loader2 size={13} className="animate-spin" />} Save
              </button>
            </div>
          </div>
        </div>
      )}

      {confirm?.type === "suspend" && (
        <ConfirmModal title={confirm.user.is_suspended ? "Unsuspend User?" : "Suspend User?"}
          message={`${confirm.user.is_suspended ? "Restore" : "Revoke"} access for ${confirm.user.email}.`}
          onConfirm={handleToggleSuspend} onCancel={() => setConfirm(null)}
          danger={!confirm.user.is_suspended} loading={acting === confirm.user.id} />
      )}
      {confirm?.type === "delete" && (
        <ConfirmModal title="Delete User?" message={`Permanently delete ${confirm.user.email}? This cannot be undone.`}
          onConfirm={handleDelete} onCancel={() => setConfirm(null)} danger loading={acting === confirm.user.id} />
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// LANDLORD REQUESTS TAB
// ══════════════════════════════════════════════════════════════
function LandlordRequestsTab({ showToast }) {
  const [requests,     setRequests]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [filter,       setFilter]       = useState("PENDING");
  const [acting,       setActing]       = useState(null);
  const [rejectModal,  setRejectModal]  = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [viewingDoc,   setViewingDoc]   = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/landlord-requests/");
      setRequests(data);
    } catch (e) {
      showToast(getErrorMsg(e, "Failed to load requests"), "error");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleApprove = async (req) => {
    setActing(req.id);
    try {
      const { data } = await api.patch(`/admin/landlord-requests/${req.id}`, { status: "APPROVED" });
      setRequests(p => p.map(r => r.id === req.id ? data : r));
      showToast("Request approved — user promoted to Landlord");
    } catch (e) { showToast(getErrorMsg(e, "Failed"), "error"); }
    finally { setActing(null); }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) return;
    setActing(rejectModal.id);
    try {
      const { data } = await api.patch(`/admin/landlord-requests/${rejectModal.id}`, {
        status: "REJECTED",
        rejection_reason: rejectReason.trim(),
      });
      setRequests(p => p.map(r => r.id === rejectModal.id ? data : r));
      showToast("Request rejected");
      setRejectModal(null); setRejectReason("");
    } catch (e) { showToast(getErrorMsg(e, "Failed"), "error"); }
    finally { setActing(null); }
  };

  const counts = {
    PENDING:  requests.filter(r => r.status === "PENDING").length,
    APPROVED: requests.filter(r => r.status === "APPROVED").length,
    REJECTED: requests.filter(r => r.status === "REJECTED").length,
  };
  const filtered = requests.filter(r => filter === "all" || r.status === filter);

  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-center">
        <FilterPills value={filter} onChange={setFilter} options={[
          { label: `Pending ${counts.PENDING}`, val: "PENDING" },
          { label: "Approved", val: "APPROVED" },
          { label: "Rejected", val: "REJECTED" },
          { label: "All", val: "all" },
        ]} />
        <button onClick={load} className="shrink-0 p-2.5 bg-white border border-gray-200 rounded-xl text-gray-400 hover:text-gray-600 transition">
          <RefreshCw size={14} />
        </button>
      </div>

      {loading ? (
        <div className="space-y-2">{[1, 2].map(i => <div key={i} className="bg-white border border-gray-100 rounded-2xl p-5"><Skel h="h-20" /></div>)}</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-2xl py-16 text-center">
          <p className="text-sm text-gray-400">No {filter !== "all" ? filter.toLowerCase() : ""} requests</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(req => (
            <div key={req.id} className="bg-white border border-gray-100 rounded-2xl p-4 sm:p-5">
              <div className="flex items-center gap-2 flex-wrap mb-3">
                <RequestStatusBadge status={req.status} />
                <span className="text-xs text-gray-400">Submitted {fmtTime(req.submitted_at)}</span>
                {req.reviewed_at && <span className="text-xs text-gray-400">· Reviewed {fmtTime(req.reviewed_at)}</span>}
              </div>
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 rounded-xl bg-blue-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {req.user?.first_name?.[0] || "?"}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {req.user ? `${req.user.first_name} ${req.user.last_name}` : <span className="font-mono text-gray-400 text-xs">{req.user_id}</span>}
                  </p>
                  <p className="text-xs text-gray-400">{req.user?.email || ""}</p>
                </div>
              </div>
              {req.rejection_reason && (
                <p className="text-xs text-red-500 mb-3 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                  Rejection reason: {req.rejection_reason}
                </p>
              )}
              <div className="flex flex-wrap gap-2 mb-3">
                {[
                  { label: "Title Deed",           url: req.title_deed_url },
                  { label: "Lease Agreement",      url: req.lease_agreement_url },
                  { label: "Authorization Letter", url: req.authorization_letter_url },
                ].filter(({ url }) => url).map(({ label, url }) => (
                  <DocButton key={label} label={label} url={url} onView={setViewingDoc} />
                ))}
              </div>
              {req.status === "PENDING" && (
                <div className="flex gap-2 pt-3 border-t border-gray-50">
                  <button onClick={() => handleApprove(req)} disabled={acting === req.id}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold bg-lime-50 hover:bg-lime-100 text-lime-700 border border-lime-200 rounded-xl transition active:scale-95 disabled:opacity-50">
                    {acting === req.id ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Approve
                  </button>
                  <button onClick={() => setRejectModal(req)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold bg-red-50 hover:bg-red-100 text-red-500 border border-red-200 rounded-xl transition active:scale-95">
                    <X size={12} /> Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {viewingDoc && <DocumentViewerModal doc={viewingDoc} onClose={() => setViewingDoc(null)} />}

      {rejectModal && (
        <div className="fixed inset-0 z-150 bg-black/20 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white border border-gray-100 rounded-t-3xl sm:rounded-2xl p-6 w-full sm:max-w-sm shadow-xl">
            <h3 className="font-semibold text-gray-900 mb-1">Reject Request</h3>
            <p className="text-sm text-gray-500 mb-4">Provide a reason visible to the applicant.</p>
            <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={3}
              placeholder="e.g. Documents are unclear or insufficient…"
              className="w-full px-3 py-3 border border-gray-200 rounded-xl text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none" />
            <div className="flex gap-2 mt-4">
              <button onClick={() => { setRejectModal(null); setRejectReason(""); }}
                className="flex-1 px-4 py-3 text-sm border border-gray-200 text-gray-500 rounded-xl hover:bg-gray-50 transition">Cancel</button>
              <button onClick={handleReject} disabled={!rejectReason.trim() || acting === rejectModal.id}
                className="flex-1 px-4 py-3 text-sm font-semibold bg-red-500 hover:bg-red-600 text-white rounded-xl disabled:opacity-50 flex items-center justify-center gap-2">
                {acting === rejectModal.id && <Loader2 size={13} className="animate-spin" />} Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// HOSTELS TAB
// ══════════════════════════════════════════════════════════════
function HostelsTab({ showToast }) {
  const [hostels,      setHostels]      = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [fetchError,   setFetchError]   = useState(null);
  const [search,       setSearch]       = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [acting,       setActing]       = useState(null);
  const [expanded,     setExpanded]     = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setFetchError(null);
    try {
      const { data } = await api.get("/admin/hostels/");
      setHostels(data.hostels || []);
    } catch (e) {
      const status = e?.response?.status, msg = getErrorMsg(e, "Failed to load hostels");
      setFetchError({ status, msg }); showToast(msg, "error");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSetStatus = async (hostel, status) => {
    setActing(hostel.id + status);
    try {
      const { data } = await api.patch(`/admin/hostels/${hostel.id}`, { status });
      setHostels(p => p.map(h => h.id === hostel.id ? { ...h, ...data } : h));
      showToast(`Hostel ${status.toLowerCase()}`);
    } catch (e) { showToast(getErrorMsg(e, "Failed"), "error"); }
    finally { setActing(null); }
  };

  const handleToggleFeatured = async (hostel) => {
    setActing(hostel.id + "feat");
    try {
      await api.patch(`/admin/hostels/${hostel.id}/featured`, { is_featured: !hostel.is_featured });
      setHostels(p => p.map(h => h.id === hostel.id ? { ...h, is_featured: !h.is_featured } : h));
      showToast(hostel.is_featured ? "Removed from featured" : "Marked as featured");
    } catch (e) { showToast(getErrorMsg(e, "Failed"), "error"); }
    finally { setActing(null); }
  };

  const handleDelete = async (hostel) => {
    setActing(hostel.id + "del");
    try {
      await api.delete(`/admin/hostels/${hostel.id}`);
      setHostels(p => p.filter(h => h.id !== hostel.id));
      showToast("Hostel deleted");
    } catch (e) { showToast(getErrorMsg(e, "Failed"), "error"); }
    finally { setActing(null); }
  };

  const filtered = hostels.filter(h => {
    const q = search.toLowerCase();
    return (!q || h.name?.toLowerCase().includes(q) || h.location?.toLowerCase().includes(q))
      && (statusFilter === "all" || h.status === statusFilter);
  });

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <SearchBar value={search} onChange={setSearch} placeholder="Search hostels…" />
        <div className="flex gap-2 items-center">
          <FilterPills value={statusFilter} onChange={setStatusFilter} options={[
            { label: "All", val: "all" }, { label: "Pending", val: "PENDING" },
            { label: "Approved", val: "APPROVED" }, { label: "Rejected", val: "REJECTED" }, { label: "Suspended", val: "SUSPENDED" },
          ]} />
          <button onClick={load} className="shrink-0 p-2.5 bg-white border border-gray-200 rounded-xl text-gray-400 hover:text-gray-600 transition">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {fetchError && (
        <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex items-start gap-3">
          <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-red-700">Failed to load hostels</p>
            <p className="text-xs text-red-500 mt-0.5">{fetchError.msg}</p>
          </div>
          <button onClick={load} className="text-xs text-red-600 hover:underline shrink-0 font-medium">Retry</button>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">{[1, 2, 3].map(i => (
          <div key={i} className="bg-white border border-gray-100 rounded-2xl p-4 space-y-2">
            <Skel h="h-4" w="w-48" /><Skel h="h-3" w="w-32" />
          </div>
        ))}</div>
      ) : filtered.length === 0 && !fetchError ? (
        <div className="bg-white border border-gray-100 rounded-2xl py-16 text-center">
          <p className="text-sm text-gray-400">No hostels found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(hostel => (
            <div key={hostel.id} className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
              <div className="flex items-start gap-3 p-4 sm:p-5">
                {hostel.images?.find(i => i.is_primary)
                  ? <img src={hostel.images.find(i => i.is_primary).image_url} alt="" className="w-12 h-12 rounded-xl object-cover shrink-0" />
                  : <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center shrink-0"><Building2 size={18} className="text-gray-400" /></div>}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-gray-900 text-sm truncate">{hostel.name}</p>
                        <HostelStatusBadge status={hostel.status} />
                        {hostel.is_featured && (
                          <span className="text-xs flex items-center gap-1 text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full">
                            <Star size={9} fill="currentColor" /> Featured
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 truncate">📍 {hostel.location}</p>
                      <p className="text-xs text-gray-400 font-mono mt-0.5 truncate">Owner: {hostel.owner_id}</p>
                    </div>
                    <button onClick={() => setExpanded(p => p === hostel.id ? null : hostel.id)}
                      className="p-1.5 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition shrink-0">
                      {expanded === hostel.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:flex gap-2 mt-3">
                    {hostel.status !== "APPROVED" && (
                      <button onClick={() => handleSetStatus(hostel, "APPROVED")} disabled={!!acting}
                        className="flex items-center justify-center gap-1 py-2 text-xs font-medium bg-lime-50 hover:bg-lime-100 text-lime-700 border border-lime-200 rounded-xl transition disabled:opacity-50 active:scale-95">
                        {acting === hostel.id + "APPROVED" ? <Loader2 size={10} className="animate-spin" /> : <Check size={10} />} Approve
                      </button>
                    )}
                    {hostel.status !== "REJECTED" && (
                      <button onClick={() => handleSetStatus(hostel, "REJECTED")} disabled={!!acting}
                        className="flex items-center justify-center gap-1 py-2 text-xs font-medium bg-red-50 hover:bg-red-100 text-red-500 border border-red-200 rounded-xl transition disabled:opacity-50 active:scale-95">
                        {acting === hostel.id + "REJECTED" ? <Loader2 size={10} className="animate-spin" /> : <X size={10} />} Reject
                      </button>
                    )}
                    {hostel.status !== "SUSPENDED" && (
                      <button onClick={() => handleSetStatus(hostel, "SUSPENDED")} disabled={!!acting}
                        className="flex items-center justify-center gap-1 py-2 text-xs font-medium bg-gray-50 hover:bg-gray-100 text-gray-600 border border-gray-200 rounded-xl transition disabled:opacity-50 active:scale-95">
                        {acting === hostel.id + "SUSPENDED" ? <Loader2 size={10} className="animate-spin" /> : <Ban size={10} />} Suspend
                      </button>
                    )}
                    <button onClick={() => handleToggleFeatured(hostel)} disabled={!!acting}
                      className="flex items-center justify-center gap-1 py-2 text-xs font-medium bg-amber-50 hover:bg-amber-100 text-amber-600 border border-amber-200 rounded-xl transition disabled:opacity-50 active:scale-95">
                      {acting === hostel.id + "feat" ? <Loader2 size={10} className="animate-spin" /> : hostel.is_featured ? <StarOff size={10} /> : <Star size={10} />}
                      {hostel.is_featured ? "Unfeature" : "Feature"}
                    </button>
                    <button onClick={() => handleDelete(hostel)} disabled={!!acting}
                      className="flex items-center justify-center gap-1 py-2 text-xs font-medium text-red-400 hover:text-red-600 hover:bg-red-50 border border-red-100 rounded-xl transition disabled:opacity-50 active:scale-95 col-span-2 sm:col-span-1 sm:ml-auto">
                      {acting === hostel.id + "del" ? <Loader2 size={10} className="animate-spin" /> : <Trash2 size={10} />} Delete
                    </button>
                  </div>
                </div>
              </div>
              {expanded === hostel.id && (
                <div className="border-t border-gray-100 px-4 sm:px-5 py-4 bg-gray-50/60">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Blockchain history</p>
                  {hostel.blocks?.length > 0 ? (
                    <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                      {[...hostel.blocks].reverse().map(block => (
                        <div key={block.id} className="flex items-start gap-3 text-xs">
                          <div className="w-1.5 h-1.5 rounded-full bg-gray-300 mt-1.5 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-gray-700">{block.data}</p>
                            <p className="text-gray-400 font-mono text-[10px] truncate">{block.hash?.slice(0, 32)}…</p>
                            <p className="text-gray-400 text-[10px]">{fmtTime(block.created_at)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : <p className="text-xs text-gray-400">No history available</p>}
                  {hostel.amenities?.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <p className="text-xs text-gray-400 mb-2">Amenities</p>
                      <div className="flex flex-wrap gap-1">
                        {hostel.amenities.map(a => (
                          <span key={a.id} className="text-xs bg-white border border-gray-200 text-gray-500 px-2 py-0.5 rounded-full">{a.name}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// ROOMS TAB
// ══════════════════════════════════════════════════════════════
function RoomsTab({ showToast }) {
  const [rooms,        setRooms]        = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editRoom,     setEditRoom]     = useState(null);
  const [editDraft,    setEditDraft]    = useState({});
  const [saving,       setSaving]       = useState(false);
  const [deleting,     setDeleting]     = useState(null);

  const ROOM_STATUSES = ["AVAILABLE", "PARTIALLY_OCCUPIED", "FULLY_OCCUPIED", "MAINTENANCE"];

  const load = useCallback(async () => {
    setLoading(true);
    try { const { data } = await api.get("/rooms/"); setRooms(data); }
    catch (e) { showToast(getErrorMsg(e, "Failed to load rooms"), "error"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data } = await api.patch(`/admin/rooms/${editRoom.id}/`, editDraft);
      setRooms(p => p.map(r => r.id === editRoom.id ? { ...r, ...data } : r));
      showToast("Room updated"); setEditRoom(null);
    } catch (e) { showToast(getErrorMsg(e, "Failed"), "error"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (room) => {
    setDeleting(room.id);
    try {
      await api.delete(`/admin/rooms/${room.id}/`);
      setRooms(p => p.filter(r => r.id !== room.id));
      showToast("Room deleted");
    } catch (e) { showToast(getErrorMsg(e, "Failed"), "error"); }
    finally { setDeleting(null); }
  };

  const filtered = rooms.filter(r =>
    (!search || r.room_number?.toLowerCase().includes(search.toLowerCase()))
    && (statusFilter === "all" || r.status === statusFilter)
  );

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <SearchBar value={search} onChange={setSearch} placeholder="Search by room number…" />
        <div className="flex gap-2 items-center">
          <FilterPills value={statusFilter} onChange={setStatusFilter} options={[
            { label: "All", val: "all" },
            ...ROOM_STATUSES.map(s => ({ label: s.replace(/_/g, " "), val: s })),
          ]} />
          <button onClick={load} className="shrink-0 p-2.5 bg-white border border-gray-200 rounded-xl text-gray-400 hover:text-gray-600 transition">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="bg-white border border-gray-100 rounded-2xl p-4"><Skel h="h-12" /></div>)}</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-2xl py-16 text-center">
          <p className="text-sm text-gray-400">No rooms found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(room => (
            <div key={room.id} className="bg-white border border-gray-100 rounded-2xl p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-mono font-semibold text-gray-900">{room.room_number}</p>
                    <RoomStatusBadge status={room.status} />
                  </div>
                  <div className="flex gap-3 mt-1 text-xs text-gray-400 flex-wrap">
                    <span>{room.room_type?.name || "—"}</span>
                    {room.room_type?.price_single && <span>KSh {room.room_type.price_single.toLocaleString()}</span>}
                    <span>{room.occupants} / {room.room_type?.capacity || "?"} occ.</span>
                  </div>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button onClick={() => { setEditRoom(room); setEditDraft({ room_number: room.room_number, status: room.status, occupants: room.occupants }); }}
                    className="p-2.5 rounded-xl border border-gray-200 text-gray-400 hover:text-blue-500 hover:border-blue-200 hover:bg-blue-50 transition active:scale-95">
                    <Edit2 size={14} />
                  </button>
                  <button onClick={() => handleDelete(room)} disabled={deleting === room.id}
                    className="p-2.5 rounded-xl border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition active:scale-95">
                    {deleting === room.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {editRoom && (
        <div className="fixed inset-0 z-150 bg-black/20 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white border border-gray-100 rounded-t-3xl sm:rounded-2xl p-6 w-full sm:max-w-sm shadow-xl">
            <div className="flex justify-between items-center mb-5">
              <h3 className="font-semibold text-gray-900">Edit Room <span className="font-mono text-blue-500">{editRoom.room_number}</span></h3>
              <button onClick={() => setEditRoom(null)} className="p-1 text-gray-400 hover:text-gray-600"><X size={16} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 uppercase mb-1.5 block">Room number</label>
                <input value={editDraft.room_number} onChange={e => setEditDraft(p => ({ ...p, room_number: e.target.value }))}
                  className="w-full px-3 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
              <div>
                <label className="text-xs text-gray-500 uppercase mb-1.5 block">Status</label>
                <select value={editDraft.status} onChange={e => setEditDraft(p => ({ ...p, status: e.target.value }))}
                  className="w-full px-3 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                  {ROOM_STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 uppercase mb-1.5 block">Occupants</label>
                <input type="number" min={0} value={editDraft.occupants} onChange={e => setEditDraft(p => ({ ...p, occupants: parseInt(e.target.value) || 0 }))}
                  className="w-full px-3 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setEditRoom(null)} className="flex-1 px-4 py-3 text-sm border border-gray-200 text-gray-500 rounded-xl hover:bg-gray-50 transition">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 px-4 py-3 text-sm font-semibold bg-blue-500 hover:bg-blue-600 text-white rounded-xl disabled:opacity-50 flex items-center justify-center gap-2">
                {saving && <Loader2 size={13} className="animate-spin" />} Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// BOOKINGS TAB  (bookings + refund requests in sub-tabs)
// ══════════════════════════════════════════════════════════════
function BookingsTab({ showToast }) {
  const [subTab, setSubTab] = useState("bookings");

  return (
    <div className="space-y-4">
      {/* Sub-tab switcher */}
      <div className="flex gap-2">
        {[
          { id: "bookings", label: "Bookings" },
          { id: "refunds",  label: "Refund Requests" },
        ].map(({ id, label }) => (
          <button key={id} onClick={() => setSubTab(id)}
            className={`text-xs px-4 py-1.5 rounded-full border transition-colors
              ${subTab === id
                ? "bg-blue-500 text-white border-blue-500"
                : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
              }`}>
            {label}
          </button>
        ))}
      </div>

      {subTab === "bookings" && <BookingsList showToast={showToast} />}
      {subTab === "refunds"  && <RefundsList  showToast={showToast} />}
    </div>
  );
}

// ── BOOKINGS LIST ─────────────────────────────────────────────
function BookingsList({ showToast }) {
  const [bookings,   setBookings]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [cancelling, setCancelling] = useState(null);
  const [confirm,    setConfirm]    = useState(null);
  const [expanded,   setExpanded]   = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { const { data } = await api.get("/bookings/"); setBookings(Array.isArray(data) ? data : []); }
    catch (e) { showToast(getErrorMsg(e, "Failed to load bookings"), "error"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCancel = async () => {
    setCancelling(confirm.id);
    try {
      const { data } = await api.patch(`/bookings/${confirm.id}/cancel`);
      setBookings(p => p.map(b => b.id === confirm.id ? data : b));
      showToast("Booking cancelled"); setConfirm(null);
    } catch (e) { showToast(getErrorMsg(e, "Failed"), "error"); }
    finally { setCancelling(null); }
  };

  const filtered = bookings.filter(b => {
    const q = search.toLowerCase();
    return (!q || b.id?.toLowerCase().includes(q) || b.user_id?.toLowerCase().includes(q) || b.semester?.toLowerCase().includes(q))
      && (statusFilter === "all" || b.status === statusFilter);
  });

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <SearchBar value={search} onChange={setSearch} placeholder="Search by ID, user, semester…" />
        <div className="flex gap-2 items-center">
          <FilterPills value={statusFilter} onChange={setStatusFilter} options={[
            { label: "All", val: "all" }, { label: "Confirmed", val: "CONFIRMED" },
            { label: "Active", val: "ACTIVE" }, { label: "Cancelled", val: "CANCELLED" },
          ]} />
          <button onClick={load} className="shrink-0 p-2.5 bg-white border border-gray-200 rounded-xl text-gray-400 hover:text-gray-600 transition">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => (
          <div key={i} className="bg-white border border-gray-100 rounded-2xl p-5 space-y-3">
            <div className="flex justify-between"><Skel h="h-4" w="w-28" /><Skel h="h-4" w="w-20" r="rounded-full" /></div>
            <div className="flex gap-4"><Skel h="h-3" w="w-24" /><Skel h="h-3" w="w-20" /></div>
          </div>
        ))}</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-2xl py-16 text-center">
          <p className="text-sm text-gray-400">No bookings found</p>
        </div>
      ) : (
        filtered.map(booking => {
          const isExpanded = expanded === booking.id;
          const paidPct = booking.total_price ? Math.min(100, ((booking.amount_paid || 0) / booking.total_price) * 100) : 0;
          return (
            <div key={booking.id} className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
              <div className="p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-gray-900 font-mono">#{booking.id?.slice(0, 8).toUpperCase()}</p>
                      <BookingStatusBadge status={booking.status} />
                      {booking.is_shared && <span className="text-xs bg-gray-50 border border-gray-200 text-gray-500 px-2 py-0.5 rounded-full">Shared</span>}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Semester {booking.semester}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-400 rounded-full" style={{ width: `${paidPct}%` }} />
                      </div>
                      <span className="text-xs text-gray-400 shrink-0">{Math.round(paidPct)}%</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      <span className="font-medium text-gray-800">{fmt(booking.amount_paid)}</span>
                      <span className="text-gray-400"> / {fmt(booking.total_price)}</span>
                    </p>
                  </div>
                  <button onClick={() => setExpanded(isExpanded ? null : booking.id)}
                    className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition shrink-0">
                    {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                  </button>
                </div>
                {booking.status !== "CANCELLED" && (
                  <button onClick={() => setConfirm(booking)}
                    className="mt-3 w-full py-2.5 text-xs font-medium border border-red-200 text-red-500 hover:bg-red-50 rounded-xl transition active:scale-95">
                    Cancel booking
                  </button>
                )}
              </div>
              {isExpanded && (
                <div className="border-t border-gray-100 bg-gray-50/60 px-4 sm:px-5 py-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Booking details</p>
                  <div className="space-y-0">
                    {[
                      ["Booking ID",  booking.id],
                      ["User ID",     booking.user_id],
                      ["Room ID",     booking.room_id],
                      ["Semester",    booking.semester],
                      ["Shared",      booking.is_shared ? "Yes" : "No"],
                      ["Amount paid", fmt(booking.amount_paid)],
                      ["Deposit",     fmt(booking.deposit_amount)],
                      ["Total price", fmt(booking.total_price)],
                      ["Balance due", fmt((booking.total_price || 0) - (booking.amount_paid || 0))],
                      ["Created",     fmtDate(booking.created_at)],
                    ].map(([label, value]) => value && (
                      <div key={label} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                        <span className="text-xs text-gray-400">{label}</span>
                        <span className="text-xs text-gray-700 font-medium font-mono truncate max-w-[55%] text-right">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })
      )}

      {confirm && (
        <ConfirmModal title="Cancel Booking?"
          message={`Cancel booking #${confirm.id?.slice(0, 8).toUpperCase()}? This cannot be undone.`}
          onConfirm={handleCancel} onCancel={() => setConfirm(null)} danger loading={cancelling === confirm.id} />
      )}
    </div>
  );
}

// ── REFUNDS LIST ──────────────────────────────────────────────
function RefundsList({ showToast }) {
  const [payments,  setPayments]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [acting,    setActing]    = useState(null);
  const [confirm,   setConfirm]   = useState(null); // { payment, approve }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch all payments and filter for refund-requested ones
      const { data } = await api.get("/payments/?status=REFUND_REQUESTED");
      setPayments(Array.isArray(data) ? data : []);
    } catch (e) {
      showToast(getErrorMsg(e, "Failed to load refund requests"), "error");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleProcess = async () => {
    const { payment, approve } = confirm;
    setActing(payment.id);
    try {
      const { data } = await api.post(`/payments/${payment.id}/process-refund`, { approve });
      setPayments(p => p.map(pay => pay.id === payment.id ? data : pay));
      showToast(approve ? "Refund approved and processed" : "Refund rejected");
      setConfirm(null);
    } catch (e) {
      showToast(getErrorMsg(e, "Failed to process refund"), "error");
    } finally {
      setActing(null);
    }
  };

  // Filter to only show REFUND_REQUESTED ones (in case backend returns more)
  const pending = payments.filter(p => p.status === "REFUND_REQUESTED");

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400 uppercase tracking-wide">
          {pending.length} pending refund{pending.length !== 1 ? "s" : ""}
        </p>
        <button onClick={load} className="p-2.5 bg-white border border-gray-200 rounded-xl text-gray-400 hover:text-gray-600 transition">
          <RefreshCw size={14} />
        </button>
      </div>

      {loading ? (
        <div className="space-y-2">{[1, 2].map(i => (
          <div key={i} className="bg-white border border-gray-100 rounded-2xl p-5 space-y-2">
            <Skel h="h-4" w="w-32" /><Skel h="h-3" w="w-48" /><Skel h="h-3" w="w-24" />
          </div>
        ))}</div>
      ) : pending.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-2xl py-16 text-center">
          <p className="text-sm text-gray-400">No pending refund requests</p>
        </div>
      ) : (
        pending.map(payment => (
          <div key={payment.id} className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-start justify-between px-5 pt-4 pb-3 border-b border-gray-100">
              <div>
                <p className="text-sm font-semibold text-gray-900 font-mono">
                  #{payment.id?.slice(0, 8).toUpperCase()}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">{fmtDate(payment.created_at)}</p>
              </div>
              <PaymentStatusBadge status={payment.status} />
            </div>

            {/* Details */}
            <div className="px-5 py-4 space-y-2">
              {[
                ["Payment ID",  payment.id],
                ["Booking ID",  payment.booking_id],
                ["Amount",      fmt(payment.amount)],
                ["Phone",       payment.phone_number],
                ["M-Pesa Ref",  payment.transaction_ref || "—"],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between items-center">
                  <span className="text-xs text-gray-400">{label}</span>
                  <span className="text-xs text-gray-700 font-mono truncate max-w-[55%] text-right">{value}</span>
                </div>
              ))}

              {/* Refund reason */}
              {payment.refund_reason && (
                <div className="mt-2 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
                  <p className="text-xs text-amber-700 font-medium mb-0.5">Refund reason</p>
                  <p className="text-xs text-amber-600">{payment.refund_reason}</p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 px-5 pb-4">
              <button
                onClick={() => setConfirm({ payment, approve: true })}
                disabled={acting === payment.id}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold bg-lime-50 hover:bg-lime-100 text-lime-700 border border-lime-200 rounded-xl transition active:scale-95 disabled:opacity-50"
              >
                {acting === payment.id ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />}
                Approve Refund
              </button>
              <button
                onClick={() => setConfirm({ payment, approve: false })}
                disabled={acting === payment.id}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold bg-red-50 hover:bg-red-100 text-red-500 border border-red-200 rounded-xl transition active:scale-95 disabled:opacity-50"
              >
                <X size={12} /> Reject Refund
              </button>
            </div>
          </div>
        ))
      )}

      {confirm && (
        <ConfirmModal
          title={confirm.approve ? "Approve Refund?" : "Reject Refund?"}
          message={
            confirm.approve
              ? `This will reverse the M-Pesa transaction of ${fmt(confirm.payment.amount)} and cancel the booking. This cannot be undone.`
              : `The refund request will be rejected. The booking remains active.`
          }
          onConfirm={handleProcess}
          onCancel={() => setConfirm(null)}
          danger={!confirm.approve}
          loading={acting === confirm.payment.id}
        />
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// MAIN DASHBOARD
// ══════════════════════════════════════════════════════════════
export default function AdminDashboard() {
  const [activeTab,   setActiveTab]   = useState("overview");
  const [toast,       setToast]       = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const showToast = useCallback((message, type = "success") => {
    setToast({ message: String(message), type });
  }, []);

  const currentTab = TABS.find(t => t.id === activeTab);

  return (
    <>
      <style>{`
        @keyframes slideUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeIn  { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
        .tab-content { animation: fadeIn .18s ease both; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      <div className="min-h-screen bg-gray-50 flex">

        {/* DESKTOP SIDEBAR */}
        <aside className="hidden lg:flex fixed inset-y-0 left-0 z-50 w-56 bg-white border-r border-gray-100 flex-col">
          <div className="px-5 py-5 border-b border-gray-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-blue-500 rounded-xl flex items-center justify-center">
                <ShieldCheck size={16} className="text-white" />
              </div>
              <div>
                <p className="font-bold text-gray-900 text-sm leading-tight">LUStay</p>
                <p className="text-[10px] text-gray-400 uppercase tracking-widest">Admin</p>
              </div>
            </div>
          </div>
          <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setActiveTab(id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition
                  ${activeTab === id ? "bg-blue-50 text-blue-600" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"}`}>
                <Icon size={15} /> {label}
              </button>
            ))}
          </nav>
          <div className="px-3 py-4 border-t border-gray-100">
            <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition">
              <LogOut size={14} /> Sign out
            </button>
          </div>
        </aside>

        {/* MOBILE DRAWER */}
        {sidebarOpen && (
          <>
            <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />
            <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-100 flex flex-col lg:hidden">
              <div className="px-5 py-5 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 bg-blue-500 rounded-xl flex items-center justify-center">
                    <ShieldCheck size={16} className="text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-sm">LUStay</p>
                    <p className="text-[10px] text-gray-400 uppercase tracking-widest">Admin</p>
                  </div>
                </div>
                <button onClick={() => setSidebarOpen(false)} className="p-1.5 text-gray-400 hover:text-gray-600"><X size={18} /></button>
              </div>
              <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
                {TABS.map(({ id, label, icon: Icon }) => (
                  <button key={id} onClick={() => { setActiveTab(id); setSidebarOpen(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition
                      ${activeTab === id ? "bg-blue-50 text-blue-600" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"}`}>
                    <Icon size={16} /> {label}
                  </button>
                ))}
              </nav>
              <div className="px-3 py-4 border-t border-gray-100">
                <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition">
                  <LogOut size={14} /> Sign out
                </button>
              </div>
            </aside>
          </>
        )}

        {/* MAIN CONTENT */}
        <div className="flex-1 flex flex-col min-w-0 lg:ml-56">
          <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-gray-100 px-4 sm:px-6 py-4 flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition active:scale-95">
              <Menu size={18} />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-base font-semibold text-gray-900 truncate">{currentTab?.label}</h1>
            </div>
            <div className="w-8 h-8 rounded-xl bg-blue-500 flex items-center justify-center text-xs font-bold text-white shrink-0">A</div>
          </header>

          <main
            className={`flex-1 px-4 sm:px-6 py-5 pb-24 lg:pb-8 bg-linear-to-b ${TAB_TINT[activeTab]} tab-content`}
            key={activeTab}
          >
            <div className="max-w-3xl mx-auto">
              {activeTab === "overview"  && <OverviewTab         showToast={showToast} onNavigate={setActiveTab} />}
              {activeTab === "users"     && <UsersTab            showToast={showToast} />}
              {activeTab === "requests"  && <LandlordRequestsTab showToast={showToast} />}
              {activeTab === "hostels"   && <HostelsTab          showToast={showToast} />}
              {activeTab === "rooms"     && <RoomsTab            showToast={showToast} />}
              {activeTab === "bookings"  && <BookingsTab         showToast={showToast} />}
            </div>
          </main>
        </div>

        {/* MOBILE BOTTOM TAB BAR */}
        <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur border-t border-gray-100 flex safe-area-inset-bottom">
          {TABS.map(({ id, shortLabel, icon: Icon }) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 pt-2.5 pb-3 transition active:scale-90
                ${activeTab === id ? "text-blue-500" : "text-gray-400 hover:text-gray-600"}`}>
              <Icon size={19} strokeWidth={activeTab === id ? 2.5 : 1.8} />
              <span className={`text-[9px] font-semibold mt-0.5 leading-none ${activeTab === id ? "text-blue-500" : "text-gray-400"}`}>
                {shortLabel}
              </span>
            </button>
          ))}
        </nav>
      </div>

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </>
  );
}