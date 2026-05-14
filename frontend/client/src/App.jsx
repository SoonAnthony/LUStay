import { Helmet } from "react-helmet-async";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { useEffect, lazy, Suspense } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { restoreSession } from "./features/auth/authSlice";

import Navbar from "./components/Navbar";

// ── LAZY PAGE IMPORTS ─────────────────────────────────────────
const Home              = lazy(() => import("./pages/Home"));
const Hostels           = lazy(() => import("./pages/Hostels"));
const Maps              = lazy(() => import("./pages/Maps"));
const Bookings          = lazy(() => import("./pages/Bookings"));
const About             = lazy(() => import("./pages/About"));
const HostelDetails     = lazy(() => import("./pages/HostelDetails"));
const RoomTypeDetails   = lazy(() => import("./pages/RoomTypeDetails"));
const RoomDetails       = lazy(() => import("./pages/RoomDetails"));
const Login             = lazy(() => import("./pages/Login"));
const Register          = lazy(() => import("./pages/Register"));
const PaymentStatus     = lazy(() => import("./pages/PaymentStatus"));
const Profile           = lazy(() => import("./pages/Profile"));
const ConfirmPage       = lazy(() => import("./pages/ConfirmPage"));
const BecomeLandlord    = lazy(() => import("./pages/BecomeLandlord"));
const LandlordDashboard = lazy(() => import("./pages/LandlordDashboard"));
const ChangeEmail       = lazy(() => import("./pages/ChangeEmail"));
const ChangePassword    = lazy(() => import("./pages/ChangePassword"));
const ChangePhone       = lazy(() => import("./pages/ChangePhone"));
const AdminDashboard    = lazy(() => import("./pages/Admindashboard"));
const ForgotPassword    = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword     = lazy(() => import("./pages/ResetPassword"));

// ── PREFETCH MAP ──────────────────────────────────────────────
// Keys are route prefixes; values are factory fns that kick off the import.
// The browser fetches the chunk in the background; by the time the user
// clicks the link, the module is already cached.
const PREFETCH_MAP = {
  "/":              [
    () => import("./pages/Hostels"),
    () => import("./pages/Login"),
  ],
  "/hostels":       [
    () => import("./pages/HostelDetails"),
    () => import("./pages/RoomTypeDetails"),
  ],
  "/login":         [
    () => import("./pages/Register"),
    () => import("./pages/ForgotPassword"),
  ],
  "/register":      [() => import("./pages/Login")],
  "/forgot-password": [() => import("./pages/ResetPassword")],
  "/profile":       [
    () => import("./pages/Bookings"),
    () => import("./pages/BecomeLandlord"),
  ],
  "/bookings":      [() => import("./pages/HostelDetails")],
  "/landlord/dashboard": [() => import("./pages/HostelDetails")],
};

// Runs once after auth is ready; schedules prefetches when the main thread
// is idle so they never compete with the current page's paint.
const schedulePrefetches = (pathname) => {
  const idle = window.requestIdleCallback ?? ((cb) => setTimeout(cb, 200));

  // Match the longest prefix that applies to the current path
  const key = Object.keys(PREFETCH_MAP)
    .filter((k) => pathname === k || (k !== "/" && pathname.startsWith(k)))
    .sort((a, b) => b.length - a.length)[0];

  if (!key) return;

  PREFETCH_MAP[key].forEach((factory) => idle(() => factory()));
};

// ── SKELETON PRIMITIVES ───────────────────────────────────────
const Bone = ({ h = "h-4", w = "w-full", r = "rounded-lg" }) => (
  <div className={`animate-pulse bg-gray-100 ${h} ${w} ${r}`} />
);

// ── HOME SKELETON ─────────────────────────────────────────────
const HomeSkeleton = () => (
  <div className="min-h-screen bg-gray-50">
    <div className="h-105 bg-gray-200 animate-pulse w-full" />
    <div className="max-w-5xl mx-auto px-4 py-10 space-y-10">
      <div className="space-y-2">
        <Bone h="h-6" w="w-48" />
        <Bone h="h-4" w="w-72" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white border border-gray-100 rounded-2xl overflow-hidden animate-pulse">
            <div className="h-44 bg-gray-200" />
            <div className="p-4 space-y-2">
              <Bone h="h-4" w="w-3/4" />
              <Bone h="h-3" w="w-1/2" />
              <Bone h="h-3" w="w-1/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// ── HOSTELS SKELETON ──────────────────────────────────────────
const HostelsSkeleton = () => (
  <div className="min-h-screen bg-gray-50 pt-24 px-4">
    <div className="max-w-5xl mx-auto space-y-6">
      <Bone h="h-10" w="w-full" r="rounded-2xl" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="bg-white border border-gray-100 rounded-2xl overflow-hidden animate-pulse">
            <div className="h-44 bg-gray-200" />
            <div className="p-4 space-y-2">
              <Bone h="h-4" w="w-3/4" />
              <Bone h="h-3" w="w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// ── BOOKINGS SKELETON ─────────────────────────────────────────
const BookingsSkeleton = () => (
  <div className="min-h-screen bg-gray-50 pt-24 px-4 pb-16">
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="space-y-1">
        <Bone h="h-7" w="w-40" />
        <Bone h="h-4" w="w-64" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white border border-gray-100 rounded-2xl p-5 space-y-2 animate-pulse">
            <Bone h="h-3" w="w-20" />
            <Bone h="h-5" w="w-16" />
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        {[1, 2, 3, 4].map((i) => <Bone key={i} h="h-7" w="w-20" r="rounded-full" />)}
      </div>
      <div className="flex flex-col gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white border border-gray-100 rounded-2xl overflow-hidden animate-pulse">
            <div className="flex justify-between px-5 pt-4 pb-3 border-b border-gray-100">
              <Bone h="h-4" w="w-28" />
              <Bone h="h-5" w="w-20" r="rounded-full" />
            </div>
            <div className="grid grid-cols-4 divide-x divide-gray-100">
              {[1, 2, 3, 4].map((j) => (
                <div key={j} className="px-5 py-3 space-y-1">
                  <Bone h="h-2" w="w-12" />
                  <Bone h="h-4" w="w-16" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// ── LOGIN SKELETON ────────────────────────────────────────────
const LoginSkeleton = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
    <div className="w-full max-w-sm bg-white border border-gray-100 rounded-2xl p-8 shadow-sm space-y-5 animate-pulse">
      <div className="text-center space-y-2">
        <Bone h="h-6" w="w-24" r="rounded-lg mx-auto" />
        <Bone h="h-3" w="w-48" r="rounded mx-auto" />
      </div>
      <div className="space-y-3">
        <Bone h="h-11" r="rounded-xl" />
        <Bone h="h-11" r="rounded-xl" />
        <Bone h="h-11" r="rounded-xl" />
      </div>
      <Bone h="h-3" w="w-32" r="rounded mx-auto" />
    </div>
  </div>
);

// ── PROFILE / DASHBOARD SKELETON ──────────────────────────────
const DashboardSkeleton = () => (
  <div className="min-h-screen bg-gray-50 pt-24 px-4 pb-16">
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white border border-gray-100 rounded-2xl p-6 animate-pulse">
        <div className="flex items-start gap-5">
          <Bone h="h-14" w="w-14" r="rounded-2xl" />
          <div className="flex-1 space-y-2 pt-1">
            <Bone h="h-5" w="w-48" />
            <Bone h="h-4" w="w-36" />
            <Bone h="h-3" w="w-28" />
          </div>
          <Bone h="h-8" w="w-24" r="rounded-xl" />
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white border border-gray-100 rounded-2xl p-5 space-y-2 animate-pulse">
            <Bone h="h-3" w="w-20" />
            <Bone h="h-5" w="w-12" />
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        {[1, 2, 3].map((i) => <Bone key={i} h="h-7" w="w-20" r="rounded-full" />)}
      </div>
      <div className="flex flex-col gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white border border-gray-100 rounded-2xl p-5 space-y-3 animate-pulse">
            <div className="flex justify-between">
              <Bone h="h-4" w="w-40" />
              <Bone h="h-5" w="w-16" r="rounded-full" />
            </div>
            <Bone h="h-3" w="w-56" />
            <div className="flex gap-3">
              <Bone h="h-3" w="w-24" />
              <Bone h="h-3" w="w-20" />
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// ── ADMIN SKELETON ────────────────────────────────────────────
const AdminSkeleton = () => (
  <div className="min-h-screen bg-gray-50 flex">
    <aside className="hidden lg:flex fixed inset-y-0 left-0 w-56 bg-white border-r border-gray-100 flex-col p-4 gap-2 animate-pulse">
      <Bone h="h-10" r="rounded-xl" />
      <div className="mt-4 space-y-1.5">
        {[1, 2, 3, 4, 5, 6].map((i) => <Bone key={i} h="h-8" r="rounded-xl" />)}
      </div>
    </aside>
    <div className="flex-1 lg:ml-56 flex flex-col">
      <div className="h-16 bg-white border-b border-gray-100 px-6 flex items-center animate-pulse">
        <Bone h="h-5" w="w-32" />
      </div>
      <div className="p-6 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white border border-gray-100 rounded-2xl p-5 space-y-2 animate-pulse">
              <Bone h="h-3" w="w-20" />
              <Bone h="h-6" w="w-14" />
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white border border-gray-100 rounded-2xl p-4 space-y-2 animate-pulse">
              <div className="flex justify-between">
                <Bone h="h-4" w="w-32" />
                <Bone h="h-4" w="w-16" r="rounded-full" />
              </div>
              <Bone h="h-3" w="w-48" />
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

// ── GENERIC CONTENT SKELETON ──────────────────────────────────
const ContentSkeleton = () => (
  <div className="min-h-screen bg-gray-50 pt-24 px-4 pb-16">
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden animate-pulse">
        <div className="h-64 bg-gray-200" />
        <div className="p-6 space-y-3">
          <Bone h="h-6" w="w-64" />
          <Bone h="h-4" w="w-48" />
          <Bone h="h-4" w="w-full" />
          <Bone h="h-4" w="w-3/4" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white border border-gray-100 rounded-2xl p-5 space-y-2 animate-pulse">
            <Bone h="h-4" w="w-3/4" />
            <Bone h="h-3" w="w-1/2" />
          </div>
        ))}
      </div>
    </div>
  </div>
);

// ── ROUTE-AWARE SKELETON ──────────────────────────────────────
const SessionSkeleton = () => {
  const { pathname } = useLocation();

  if (pathname === "/")                            return <HomeSkeleton />;
  if (pathname.startsWith("/hostels"))             return <HostelsSkeleton />;
  if (pathname === "/bookings")                    return <BookingsSkeleton />;
  if (pathname === "/login")                       return <LoginSkeleton />;
  if (pathname === "/register")                    return <LoginSkeleton />;
  if (pathname === "/forgot-password")             return <LoginSkeleton />;
  if (pathname === "/auth/reset-password")         return <LoginSkeleton />;
  if (pathname === "/profile")                     return <DashboardSkeleton />;
  if (pathname.startsWith("/landlord"))            return <DashboardSkeleton />;
  if (pathname.startsWith("/admin"))               return <AdminSkeleton />;
  if (pathname.startsWith("/payments"))            return <ContentSkeleton />;
  if (pathname.startsWith("/room"))                return <ContentSkeleton />;
  if (pathname === "/maps")                        return <ContentSkeleton />;
  if (pathname === "/about")                       return <ContentSkeleton />;
  if (pathname.startsWith("/account"))             return <DashboardSkeleton />;
  if (pathname.startsWith("/become-landlord"))     return <DashboardSkeleton />;

  return <div className="min-h-screen bg-gray-50" />;
};

// ── ROUTE GUARDS ──────────────────────────────────────────────
const AuthRoute = ({ user, children }) => {
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

const StudentRoute = ({ user, children }) => {
  if (!user) return <Navigate to="/login" replace />;
  const role = user.role?.toUpperCase();
  if (role === "LANDLORD") return <Navigate to="/landlord/dashboard" replace />;
  if (role === "ADMIN")    return <Navigate to="/admin/dashboard" replace />;
  return children;
};

const LandlordRoute = ({ user, children }) => {
  if (!user) return <Navigate to="/login" replace />;
  const role = user.role?.toUpperCase();
  if (role === "STUDENT") return <Navigate to="/profile" replace />;
  if (role === "ADMIN")   return <Navigate to="/admin/dashboard" replace />;
  return children;
};

const AdminRoute = ({ user, children }) => {
  if (!user) return <Navigate to="/login" replace />;
  if (user.role?.toUpperCase() !== "ADMIN") return <Navigate to="/" replace />;
  return children;
};

// ── APP CONTENT ───────────────────────────────────────────────
const AppContent = () => {
  const dispatch = useDispatch();
  const { user, authReady } = useSelector((s) => s.auth);
  const { pathname } = useLocation();

  useEffect(() => {
    dispatch(restoreSession());
  }, [dispatch]);

  // Schedule prefetches once auth is resolved so they don't compete
  // with the current page's initial render
  useEffect(() => {
    if (authReady) {
      schedulePrefetches(pathname);
    }
  }, [authReady, pathname]);

  if (!authReady) return <SessionSkeleton />;

  return (
    <>
      <Helmet>
        <html lang="en" />
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>LUStay — Find Student Hostels in Kenya</title>
        <meta name="description" content="Book verified, affordable student hostels near your university in Kenya. Safe accommodation made simple." />
        <meta name="theme-color" content="#3b82f6" />
        <link rel="canonical" href="https://lustay.vercel.app/" />
        <meta property="og:site_name" content="LUStay" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://lustay.vercel.app/" />
        <meta property="og:title" content="LUStay — Find Student Hostels in Kenya" />
        <meta property="og:description" content="Book verified, affordable student hostels near your university in Kenya." />
        <meta property="og:image" content="https://lustay.vercel.app/og-image.jpg" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="LUStay — Find Student Hostels in Kenya" />
        <meta name="twitter:description" content="Book verified, affordable student hostels near your university in Kenya." />
        <meta name="twitter:image" content="https://lustay.vercel.app/og-image.jpg" />
      </Helmet>

      <Navbar />

      {/* Suspense uses the same route-aware skeleton while lazy chunks load */}
      <Suspense fallback={<SessionSkeleton />}>
        <Routes>
          {/* PUBLIC */}
          <Route path="/"               element={<Home />} />
          <Route path="/hostels"        element={<Hostels />} />
          <Route path="/hostels/:id"    element={<HostelDetails />} />
          <Route path="/room-types/:id" element={<RoomTypeDetails />} />
          <Route path="/rooms/:id"      element={<RoomDetails />} />
          <Route path="/maps"           element={<Maps />} />
          <Route path="/bookings"       element={<Bookings />} />
          <Route path="/about"          element={<About />} />
          <Route path="/auth/confirm"   element={<ConfirmPage />} />

          {/* FORGOT / RESET PASSWORD */}
          <Route path="/forgot-password"     element={<ForgotPassword />} />
          <Route path="/auth/reset-password" element={<ResetPassword />} />

          {/* AUTH */}
          <Route path="/login"    element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* STUDENT ONLY */}
          <Route
            path="/profile"
            element={
              <StudentRoute user={user}>
                <Profile />
              </StudentRoute>
            }
          />
          <Route
            path="/become-landlord"
            element={
              <StudentRoute user={user}>
                <BecomeLandlord />
              </StudentRoute>
            }
          />
          <Route
            path="/payments/:id"
            element={user ? <PaymentStatus /> : <Navigate to="/login" replace />}
          />

          {/* ACCOUNT CHANGE ROUTES */}
          <Route
            path="/account/change-email"
            element={
              <AuthRoute user={user}>
                <ChangeEmail />
              </AuthRoute>
            }
          />
          <Route
            path="/account/change-password"
            element={
              <AuthRoute user={user}>
                <ChangePassword />
              </AuthRoute>
            }
          />
          <Route
            path="/account/change-phone"
            element={
              <AuthRoute user={user}>
                <ChangePhone />
              </AuthRoute>
            }
          />

          {/* LANDLORD ONLY */}
          <Route
            path="/landlord/dashboard"
            element={
              <LandlordRoute user={user}>
                <LandlordDashboard />
              </LandlordRoute>
            }
          />

          {/* ADMIN ONLY */}
          <Route
            path="/admin/dashboard"
            element={
              <AdminRoute user={user}>
                <AdminDashboard />
              </AdminRoute>
            }
          />

          {/* FALLBACK */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </>
  );
};

// ── APP ───────────────────────────────────────────────────────
const App = () => (
  <Router>
    <AppContent />
    <Analytics />
    <SpeedInsights />
  </Router>
);

export default App;