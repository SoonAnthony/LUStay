import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Helmet } from "react-helmet-async";
import { loginUser } from "../features/auth/authSlice";
import Footer from "../components/Footer";

// ── Role → dashboard path mapping ────────────────────────────
const ROLE_HOME = {
  ADMIN:    "/admin/dashboard",
  LANDLORD: "/landlord/dashboard",
  STUDENT:  "/profile",
};

const getHomeForRole = (role) => ROLE_HOME[role?.toUpperCase()] ?? "/";

// ─────────────────────────────────────────────────────────────

const Login = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const { error } = useSelector((state) => state.auth);

  const [email,         setEmail]         = useState("");
  const [password,      setPassword]      = useState("");
  const [showPassword,  setShowPassword]  = useState(false);
  const [submitting,    setSubmitting]    = useState(false);
  const [flashMessage,  setFlashMessage]  = useState(null);
  const [flashType,     setFlashType]     = useState("success");

  const from = location.state?.from?.pathname;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const resultAction = await dispatch(loginUser({ email, password }));

      if (loginUser.fulfilled.match(resultAction)) {
        const user = resultAction.payload;

        setFlashType("success");
        setFlashMessage("Login Successful 🎉");

        setTimeout(() => {
          if (from && from !== "/" && from !== "/login") {
            navigate(from, { replace: true });
          } else {
            navigate(getHomeForRole(user.role), { replace: true });
          }
        }, 1200);
      }

      if (loginUser.rejected.match(resultAction)) {
        setFlashType("error");
        setFlashMessage("Invalid credentials. Try again.");
        setTimeout(() => setFlashMessage(null), 3000);
        setSubmitting(false);
      }

    } catch {
      setFlashType("error");
      setFlashMessage("Something went wrong. Please try again.");
      setTimeout(() => setFlashMessage(null), 3000);
      setSubmitting(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Login — LUStay</title>
        <meta name="description" content="Login to your LUStay account to manage bookings and find student hostels near your university in Kenya." />
        <link rel="canonical" href="https://lustay.vercel.app/login" />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      {/* ── FLASH MESSAGE ──────────────────────────────── */}
      {flashMessage && (
        <div
          className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl shadow-xl text-sm font-medium
            ${flashType === "success"
              ? "bg-white border border-green-100 text-green-600 shadow-green-100"
              : "bg-white border border-red-100 text-red-500 shadow-red-100"
            }`}
        >
          {flashType === "success" ? (
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-green-50">
              <svg className="w-3.5 h-3.5 text-green-500" fill="none" viewBox="0 0 16 16">
                <path d="M3 8l3.5 3.5L13 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
          ) : (
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-red-50">
              <svg className="w-3.5 h-3.5 text-red-400" fill="none" viewBox="0 0 16 16">
                <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </span>
          )}
          {flashMessage}
        </div>
      )}

      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 pt-16">
        <div className="w-full max-w-sm">
          <div className="bg-white border border-gray-100 rounded-2xl p-8">

            {/* HEADER */}
            <div className="mb-7">
              <h1 className="text-2xl font-semibold text-gray-900">Welcome back</h1>
              <p className="text-sm text-gray-400 mt-1">Login to your LUStay account</p>
            </div>

            {/* REDUX ERROR */}
            {error && !submitting && !flashMessage && (
              <div className="bg-red-50 border border-red-100 text-red-500 text-sm px-3 py-2 rounded-xl mb-5">
                {error}
              </div>
            )}

            {/* FORM */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">Email</label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={submitting}
                  className="w-full mt-1 px-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:ring-2 focus:ring-blue-400 outline-none disabled:opacity-50"
                  required
                />
              </div>

              <div>
                <div className="flex justify-between items-center">
                  <label className="text-xs font-medium text-gray-500 uppercase">Password</label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-xs text-blue-500"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={submitting}
                  className="w-full mt-1 px-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:ring-2 focus:ring-blue-400 outline-none disabled:opacity-50"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className={`w-full py-2.5 rounded-xl text-sm font-medium text-white transition flex items-center justify-center gap-2
                  ${submitting ? "bg-blue-400 cursor-not-allowed" : "bg-blue-500 hover:bg-blue-600"}`}
              >
                {submitting && (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                )}
                {submitting ? "Logging in..." : "Login"}
              </button>
            </form>

            <p className="text-right -mt-1">
              <button
                type="button"
                onClick={() => navigate("/forgot-password")}
                className="text-xs text-blue-500 hover:underline"
              >
                Forgot password?
              </button>
            </p>

            <p className="text-center text-sm text-gray-400 mt-5">
              Don't have an account?{" "}
              <button onClick={() => navigate("/register")} className="text-blue-500 font-medium">
                Register
              </button>
            </p>
          </div>

          <p className="text-center text-xs text-gray-300 mt-5">
            By logging in you agree to our terms and privacy policy.
          </p>
        </div>
      </div>

      <Footer />
    </>
  );
};

export default Login;