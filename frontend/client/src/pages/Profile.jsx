import { useEffect, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  fetchMe,
  updateMe,
  uploadProfileImage,
  deleteProfileImage,
  clearUpdateStatus,
} from "../features/user/userSlice";
import { fetchBookings } from "../features/bookings/bookingsSlice";
import { fetchMyLandlordRequests } from "../features/landlord/landlordSlice";
import Footer from "../components/Footer";

const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-KE", {
        day: "numeric", month: "short", year: "numeric",
      })
    : "-";

const fmt = (n) => `KES ${Number(n || 0).toLocaleString()}`;

const SkeletonBox = ({ h = "h-4", w = "w-full", rounded = "rounded-lg" }) => (
  <div className={`animate-pulse bg-gray-100 ${h} ${w} ${rounded}`} />
);

const ProfileCardSkeleton = () => (
  <div className="bg-white border border-gray-100 rounded-2xl p-6 mb-6">
    <div className="flex items-start gap-5">
      <SkeletonBox h="h-20" w="w-20" rounded="rounded-2xl" />
      <div className="flex-1 space-y-2 pt-1">
        <SkeletonBox h="h-5" w="w-48" />
        <SkeletonBox h="h-4" w="w-36" />
        <SkeletonBox h="h-3" w="w-28" />
      </div>
      <SkeletonBox h="h-8" w="w-16" rounded="rounded-xl" />
    </div>
  </div>
);

const StatsSkeleton = () => (
  <div className="grid grid-cols-3 gap-3 mb-6">
    {[1, 2, 3].map((i) => (
      <div key={i} className="bg-white border border-gray-100 rounded-2xl p-5 space-y-2">
        <SkeletonBox h="h-3" w="w-20" />
        <SkeletonBox h="h-5" w="w-16" />
      </div>
    ))}
  </div>
);

const OverviewSkeleton = () => (
  <div className="bg-white border border-gray-100 rounded-2xl p-5 space-y-3">
    {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
      <div key={i} className="flex justify-between items-center py-2 border-b border-gray-50">
        <SkeletonBox h="h-3" w="w-24" />
        <SkeletonBox h="h-3" w="w-32" />
      </div>
    ))}
  </div>
);

const BookingsSkeleton = () => (
  <div className="space-y-3">
    {[1, 2, 3].map((i) => (
      <div key={i} className="bg-white border border-gray-100 rounded-2xl p-5 space-y-3">
        <div className="flex justify-between">
          <SkeletonBox h="h-4" w="w-28" />
          <SkeletonBox h="h-4" w="w-20" rounded="rounded-full" />
        </div>
        <div className="flex gap-4">
          <SkeletonBox h="h-3" w="w-24" />
          <SkeletonBox h="h-3" w="w-24" />
          <SkeletonBox h="h-3" w="w-16" />
        </div>
        <SkeletonBox h="h-3" w="w-20" />
      </div>
    ))}
  </div>
);

// ── LANDLORD BANNER ───────────────────────────────────────────
const LandlordBanner = ({ request, loading }) => {
  const navigate = useNavigate();

  if (loading) return (
    <div className="animate-pulse bg-gray-100 h-16 rounded-2xl mb-4" />
  );

  if (!request) return (
    <div className="bg-white border border-gray-100 rounded-2xl px-5 py-4 mb-4 flex items-center justify-between">
      <div>
        <p className="text-sm font-semibold text-gray-900">Become a Landlord</p>
        <p className="text-xs text-gray-400 mt-0.5">List your property and earn from students</p>
      </div>
      <button
        onClick={() => navigate("/become-landlord")}
        className="text-xs px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition-colors shrink-0"
      >
        Apply →
      </button>
    </div>
  );

  if (request.status === "PENDING") return (
    <div className="bg-amber-50 border border-amber-100 rounded-2xl px-5 py-4 mb-4 flex items-center justify-between">
      <div>
        <p className="text-sm font-semibold text-amber-800">Landlord request pending</p>
        <p className="text-xs text-amber-600 mt-0.5">Our team is reviewing your application</p>
      </div>
      <span className="flex items-center gap-1.5 text-xs text-amber-700 font-medium shrink-0">
        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
        Under review
      </span>
    </div>
  );

  if (request.status === "REJECTED") return (
    <div className="bg-red-50 border border-red-100 rounded-2xl px-5 py-4 mb-4 flex items-center justify-between">
      <div>
        <p className="text-sm font-semibold text-red-700">Landlord request rejected</p>
        <p className="text-xs text-red-400 mt-0.5 max-w-xs truncate">
          {request.rejection_reason ?? "See details to reapply"}
        </p>
      </div>
      <button
        onClick={() => navigate("/become-landlord")}
        className="text-xs px-4 py-2 border border-red-200 text-red-500 hover:bg-red-100 rounded-xl transition-colors shrink-0"
      >
        Reapply →
      </button>
    </div>
  );

  return null;
};

// ── MAIN COMPONENT ────────────────────────────────────────────
const Profile = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const fileRef  = useRef(null);

  const isAuthenticated = useSelector((s) => s.auth.isAuthenticated);
  const authReady       = useSelector((s) => s.auth.authReady);
  const {
    profile,
    loading,
    updating,
    uploadingImage,
    deletingImage,
    updateSuccess,
    updateError,
  } = useSelector((s) => s.user);
  const { bookings, loading: bookingsLoading } = useSelector((s) => s.bookings);
  const { latestRequest, requestsLoading }     = useSelector((s) => s.landlord);

  const [editing,       setEditing]       = useState(false);
  const [activeTab,     setActiveTab]     = useState("overview");
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [form, setForm] = useState({
    first_name:   "",
    last_name:    "",
    phone_number: "",
  });

  useEffect(() => {
    if (!authReady) return;
    if (!isAuthenticated) {
      navigate("/login", { state: { from: { pathname: "/profile" } }, replace: true });
    }
  }, [authReady, isAuthenticated, navigate]);

  useEffect(() => {
    if (!isAuthenticated) return;
    dispatch(fetchMe());
    dispatch(fetchBookings());
    dispatch(fetchMyLandlordRequests());
  }, [dispatch, isAuthenticated]);

  useEffect(() => {
    if (profile) {
      setForm({
        first_name:   profile.first_name   || "",
        last_name:    profile.last_name     || "",
        phone_number: profile.phone_number  || "",
      });
    }
  }, [profile]);

  useEffect(() => {
    if (updateSuccess) {
      const t = setTimeout(() => dispatch(clearUpdateStatus()), 3000);
      return () => clearTimeout(t);
    }
  }, [updateSuccess, dispatch]);

  if (!authReady || !isAuthenticated) return null;

  const confirmedBookings = bookings?.filter((b) => b.status === "CONFIRMED") ?? [];
  const totalSpend        = bookings?.reduce((s, b) => s + (b.total_price    || 0), 0) ?? 0;
  const totalDeposit      = bookings?.reduce((s, b) => s + (b.deposit_amount || 0), 0) ?? 0;

  const sortedBookings = bookings?.slice().sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at)
  );

  // ── Normalize role to uppercase for comparison ──
  const role = profile?.role?.toUpperCase();
  const isStudent  = role === "STUDENT";
  const isLandlord = role === "LANDLORD";
  const isAdmin    = role === "ADMIN";

  const handleSave = () => {
    dispatch(updateMe(form));
    setEditing(false);
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) dispatch(uploadProfileImage(file));
  };

  const handleDeleteImage = async () => {
    await dispatch(deleteProfileImage());
    setDeleteConfirm(false);
  };

  const initials = profile
    ? `${profile.first_name?.[0] ?? ""}${profile.last_name?.[0] ?? ""}`.toUpperCase()
    : "?";

  const roleBadge = {
    STUDENT:  "bg-blue-50 text-blue-500",
    LANDLORD: "bg-purple-50 text-purple-500",
    ADMIN:    "bg-red-50 text-red-500",
  };

  const isImageBusy = uploadingImage || deletingImage;

  
  return (
    <>
      <div className="min-h-screen bg-gray-50 pt-24 px-4 pb-16">
        <div className="max-w-4xl mx-auto">

          {/* ── PROFILE CARD ─────────────────────────── */}
          {loading ? <ProfileCardSkeleton /> : (
            <div className="bg-white border border-gray-100 rounded-2xl p-6 mb-6">
              <div className="flex items-start gap-5">

                <div className="relative shrink-0">
                  {isImageBusy ? (
                    <div className="w-20 h-20 rounded-2xl bg-gray-100 animate-pulse flex items-center justify-center">
                      <span className="text-xs text-gray-400">…</span>
                    </div>
                  ) : profile?.profile_image ? (
                    <img
                      src={profile.profile_image}
                      alt="Profile"
                      className="w-20 h-20 rounded-2xl object-cover"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-2xl bg-blue-500 flex items-center justify-center text-white text-2xl font-semibold">
                      {initials}
                    </div>
                  )}
                  <button
                    onClick={() => fileRef.current?.click()}
                    disabled={isImageBusy}
                    className="absolute -bottom-2 -right-2 w-7 h-7 bg-white border border-gray-200 rounded-xl flex items-center justify-center shadow-sm hover:bg-gray-50 transition-colors disabled:opacity-50"
                    title="Change photo"
                  >
                    <span className="text-sm">📷</span>
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
                      {profile?.first_name} {profile?.last_name}
                    </h1>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${roleBadge[role] || "bg-gray-50 text-gray-500"}`}>
                      {profile?.role}
                    </span>
                    {profile?.is_verified && (
                      <span className="text-xs px-2.5 py-1 rounded-full bg-lime-50 text-lime-600 font-medium">
                        ✓ Verified
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">{profile?.email}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Member since {fmtDate(profile?.created_at)}
                  </p>
                </div>

                <button
                  onClick={() => setEditing(!editing)}
                  className="text-xs px-4 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors shrink-0"
                >
                  {editing ? "Cancel" : "Edit"}
                </button>
              </div>

              {updateSuccess && (
                <div className="mt-4 bg-lime-50 border border-lime-100 text-lime-600 text-sm px-4 py-2 rounded-xl">
                  Profile updated successfully ✓
                </div>
              )}
              {updateError && (
                <div className="mt-4 bg-red-50 border border-red-100 text-red-500 text-sm px-4 py-2 rounded-xl">
                  {updateError}
                </div>
              )}

              {editing && (
                <div className="mt-5 pt-5 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-500 uppercase mb-1 block">First name</label>
                    <input
                      value={form.first_name}
                      onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                      className="w-full border border-gray-200 px-4 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 uppercase mb-1 block">Last name</label>
                    <input
                      value={form.last_name}
                      onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                      className="w-full border border-gray-200 px-4 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs text-gray-500 uppercase mb-1 block">Phone number</label>
                    <input
                      value={form.phone_number}
                      onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
                      className="w-full border border-gray-200 px-4 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                      placeholder="2547XXXXXXXX"
                    />
                  </div>
                  <div className="sm:col-span-2 flex justify-end">
                    <button
                      onClick={handleSave}
                      disabled={updating}
                      className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-xl transition-colors disabled:opacity-50"
                    >
                      {updating ? "Saving..." : "Save changes"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── LANDLORD BANNER (non-landlord, non-admin only) ── */}
          {/* CHANGE 2: added profile && so banner only renders once role is known */}
          {profile && !isLandlord && !isAdmin && (
            <LandlordBanner request={latestRequest} loading={requestsLoading} />
          )}

          {/* ── STATS ────────────────────────────────── */}
          {loading ? <StatsSkeleton /> : (
            <div className="grid grid-cols-3 gap-3 mb-6">
              {[
                { label: "Total bookings", value: bookings?.length ?? 0 },
                { label: "Confirmed",      value: confirmedBookings.length },
                { label: "Total spent",    value: fmt(totalSpend) },
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
            {["overview", "bookings", "security"].map((tab) => (
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
            loading ? <OverviewSkeleton /> : (
              <div className="bg-white border border-gray-100 rounded-2xl p-5">
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-4">Account details</p>
                <div className="space-y-3">
                  {[
                    { label: "Full name",          value: `${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`.trim() },
                    { label: "Email",              value: profile?.email },
                    { label: "Phone",              value: profile?.phone_number },
                    { label: "Role",               value: profile?.role },
                    { label: "Verified",           value: profile?.is_verified ? "Yes" : "No" },
                    { label: "Member since",       value: fmtDate(profile?.created_at) },
                    { label: "Last login",         value: fmtDate(profile?.last_login) },
                    { label: "Total deposit paid", value: fmt(totalDeposit) },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                      <span className="text-xs text-gray-400">{label}</span>
                      <span className="text-sm text-gray-700 font-medium">{value ?? "-"}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          )}

          {/* ── TAB: BOOKINGS ────────────────────────── */}
          {activeTab === "bookings" && (
            bookingsLoading ? <BookingsSkeleton /> : (
              <div className="space-y-3">
                {!sortedBookings?.length ? (
                  <div className="bg-white border border-gray-100 rounded-2xl py-16 text-center">
                    <p className="text-sm text-gray-400">No bookings yet.</p>
                    <button
                      onClick={() => navigate("/")}
                      className="mt-3 text-sm text-blue-500 hover:underline"
                    >
                      Browse rooms →
                    </button>
                  </div>
                ) : (
                  <>
                    {sortedBookings.map((booking) => (
                      <div key={booking.id} className="bg-white border border-gray-100 rounded-2xl p-5">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-sm font-semibold text-gray-900 font-mono">
                              #{booking.id?.slice(0, 8).toUpperCase()}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5">Semester {booking.semester}</p>
                          </div>
                          <span className={`text-xs px-3 py-1 rounded-full font-medium
                            ${booking.status === "CONFIRMED" ? "bg-lime-50 text-lime-600"
                              : booking.status === "PENDING"   ? "bg-amber-50 text-amber-600"
                              : "bg-red-50 text-red-400"}`}
                          >
                            {booking.status}
                          </span>
                        </div>
                        <div className="mt-3 flex gap-6 text-xs text-gray-500">
                          <span>Total: <strong className="text-gray-800">{fmt(booking.total_price)}</strong></span>
                          <span>Deposit: <strong className="text-gray-800">{fmt(booking.deposit_amount)}</strong></span>
                          <span>{booking.is_shared ? "Shared" : "Single"}</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-2">{fmtDate(booking.created_at)}</p>
                      </div>
                    ))}
                    <button
                      onClick={() => navigate("/bookings")}
                      className="w-full py-3 text-sm text-blue-500 hover:text-blue-600 border border-dashed border-blue-200 rounded-2xl hover:bg-blue-50 transition-colors"
                    >
                      View all bookings →
                    </button>
                  </>
                )}
              </div>
            )
          )}

          {/* ── TAB: SECURITY ────────────────────────── */}
          {activeTab === "security" && (
            <div className="bg-white border border-gray-100 rounded-2xl p-5 space-y-1">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Security settings</p>

              {[
                {
                  title:  "Change password",
                  desc:   "You'll receive a confirmation link via email",
                  action: () => navigate("/account/change-password"),
                  label:  "Change",
                },
                {
                  title:  "Change email",
                  desc:   "A verification link will be sent to your new email",
                  action: () => navigate("/account/change-email"),
                  label:  "Change",
                },
                {
                  title:  "Change phone number",
                  desc:   "Update your M-Pesa registered phone number",
                  action: () => navigate("/account/change-phone"),
                  label:  "Change",
                },
              ].map(({ title, desc, action, label }) => (
                <div key={title} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
                  </div>
                  <button
                    onClick={action}
                    className="text-xs px-4 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    {label}
                  </button>
                </div>
              ))}

              {profile?.profile_image && (
                <div className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-800">Delete profile photo</p>
                    <p className="text-xs text-gray-400 mt-0.5">Remove your current profile picture</p>
                  </div>
                  {deleteConfirm ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => setDeleteConfirm(false)}
                        className="text-xs px-3 py-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleDeleteImage}
                        disabled={deletingImage}
                        className="text-xs px-3 py-2 rounded-xl border border-red-200 text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                      >
                        {deletingImage ? "Removing…" : "Confirm"}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirm(true)}
                      className="text-xs px-4 py-2 rounded-xl border border-red-200 text-red-500 hover:bg-red-50 transition-colors"
                    >
                      Remove
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
      <Footer />
    </>
  );
};

export default Profile;