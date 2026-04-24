import { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
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
import ChangeEmail from "./pages/ChangeEmail";
import ChangePhone from "./pages/ChangePhone";
import ChangePassword from "./pages/ChangePassword";
import ConfirmPage from "./pages/ConfirmPage";
import BecomeLandlord from "./pages/BecomeLandlord";
import LandlordDashboard from "./pages/LandlordDashboard";

const SessionSkeleton = () => (
  <div style={{ minHeight: "100vh", background: "#f3f4f6" }}>
    <style>{`
      @keyframes shimmer {
        0% { background-position: -700px 0; }
        100% { background-position: 700px 0; }
      }
      .sk {
        background: linear-gradient(90deg, #e5e7eb 25%, #f9fafb 50%, #e5e7eb 75%);
        background-size: 700px 100%;
        animation: shimmer 1.4s infinite linear;
        border-radius: 6px;
      }
    `}</style>
    <div style={{ height: 64, background: "#fff", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", padding: "0 24px", gap: 16 }}>
      <div className="sk" style={{ width: 120, height: 32, borderRadius: 8 }} />
      <div style={{ flex: 1 }} />
      <div className="sk" style={{ width: 70, height: 18 }} />
      <div className="sk" style={{ width: 70, height: 18 }} />
      <div className="sk" style={{ width: 70, height: 18 }} />
      <div className="sk" style={{ width: 36, height: 36, borderRadius: "50%" }} />
    </div>
    <div style={{ maxWidth: 1100, margin: "40px auto", padding: "0 24px", display: "flex", flexDirection: "column", gap: 20 }}>
      <div className="sk" style={{ width: "50%", height: 36 }} />
      <div className="sk" style={{ width: "30%", height: 20 }} />
      <div className="sk" style={{ width: "100%", height: 50, borderRadius: 10 }} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 24, marginTop: 16 }}>
        {[1, 2, 3].map(i => (
          <div key={i} style={{ borderRadius: 12, overflow: "hidden", background: "#fff" }}>
            <div className="sk" style={{ width: "100%", height: 180, borderRadius: 0 }} />
            <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
              <div className="sk" style={{ width: "70%", height: 16 }} />
              <div className="sk" style={{ width: "50%", height: 14 }} />
              <div className="sk" style={{ width: "40%", height: 14 }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

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

const AuthRoute = ({ user, children }) => {
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

const App = () => {
  const dispatch = useDispatch();
  const { user, isAuthenticated, authReady } = useSelector((state) => state.auth);

  useEffect(() => {
    dispatch(restoreSession());
  }, [dispatch]);

  if (!authReady) return <SessionSkeleton />;

  const roleHome =
    user?.role?.toUpperCase() === "LANDLORD" ? "/landlord/dashboard" :
    user?.role?.toUpperCase() === "ADMIN"    ? "/admin/dashboard" :
    "/profile";

  return (
    <Router>
      <>
        <Navbar />
        <Routes>
          <Route path="/"               element={<Home />} />
          <Route path="/hostels"        element={<Hostels />} />
          <Route path="/hostels/:id"    element={<HostelDetails />} />
          <Route path="/room-types/:id" element={<RoomTypeDetails />} />
          <Route path="/rooms/:id"      element={<RoomDetails />} />
          <Route path="/maps"           element={<Maps />} />
          <Route path="/bookings"       element={<Bookings />} />
          <Route path="/about"          element={<About />} />
          <Route path="/auth/confirm"   element={<ConfirmPage />} />
          <Route path="/login"          element={isAuthenticated ? <Navigate to={roleHome} replace /> : <Login />} />
          <Route path="/register"       element={isAuthenticated ? <Navigate to={roleHome} replace /> : <Register />} />
          <Route path="/payments/:id"   element={<AuthRoute user={user}><PaymentStatus /></AuthRoute>} />
          <Route path="/profile"        element={<StudentRoute user={user}><Profile /></StudentRoute>} />
          <Route path="/become-landlord" element={<StudentRoute user={user}><BecomeLandlord /></StudentRoute>} />
          <Route path="/change-email"   element={<AuthRoute user={user}><ChangeEmail /></AuthRoute>} />
          <Route path="/change-phone"   element={<AuthRoute user={user}><ChangePhone /></AuthRoute>} />
          <Route path="/change-password" element={<AuthRoute user={user}><ChangePassword /></AuthRoute>} />
          <Route path="/landlord/dashboard" element={<LandlordRoute user={user}><LandlordDashboard /></LandlordRoute>} />
          <Route path="*"               element={<Navigate to="/" replace />} />
        </Routes>
      </>
    </Router>
  );
};

export default App;