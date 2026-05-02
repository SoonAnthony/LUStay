import { useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { restoreSession } from "./features/auth/authSlice";

import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Hostels from "./pages/Hostels";
import Maps from "./pages/Maps";
import Bookings from "./pages/Bookings";
import About from "./pages/About";
import HostelDetails from "./pages/HostelDetails";
import RoomTypeDetails from "./pages/RoomTypeDetails";
import RoomDetails from "./pages/RoomDetails";
import Login from "./pages/Login";
import Register from "./pages/Register";
import PaymentStatus from "./pages/PaymentStatus";
import Profile from "./pages/Profile";
import ConfirmPage from "./pages/ConfirmPage";
import BecomeLandlord from "./pages/BecomeLandlord";
import LandlordDashboard from "./pages/LandlordDashboard"; 
import ChangeEmail from "./pages/ChangeEmail";
import ChangePassword from "./pages/ChangePassword";
import ChangePhone from "./pages/ChangePhone";
import AdminDashboard from "./pages/Admindashboard";

// ── SESSION SKELETON ──────────────────────────────────────────
const SessionSkeleton = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
    <div className="w-full max-w-sm bg-white border border-gray-100 rounded-2xl p-8 shadow-sm">
      <div className="flex flex-col items-center gap-4 animate-pulse">
        <div className="w-14 h-14 rounded-2xl bg-gray-100" />
        <div className="h-4 w-32 bg-gray-200 rounded" />
        <div className="h-3 w-48 bg-gray-100 rounded" />
        <div className="w-full mt-4 space-y-3">
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full w-1/2 bg-blue-200 animate-pulse" />
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full w-2/3 bg-blue-100 animate-pulse" />
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-2">Loading your dashboard…</p>
      </div>
    </div>
  </div>
);

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

  useEffect(() => {
    dispatch(restoreSession());
  }, [dispatch]);

  if (!authReady) return <SessionSkeleton />;

  return (
    <>
      <Navbar />

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

        {/* ACCOUNT CHANGE ROUTES (any authenticated user) */}
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
    </>
  );
};

// ── APP ───────────────────────────────────────────────────────
const App = () => (
  <Router>
    <AppContent />
  </Router>
);

export default App;