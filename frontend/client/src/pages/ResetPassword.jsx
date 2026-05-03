import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../api/axios";
import Footer from "../components/Footer";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [password,     setPassword]     = useState("");
  const [confirm,      setConfirm]      = useState("");
  const [submitting,   setSubmitting]   = useState(false);
  const [done,         setDone]         = useState(false);
  const [error,        setError]        = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirm) return setError("Passwords do not match.");
    setSubmitting(true);
    setError(null);
    try {
      await api.post("/users/reset-password", { token, new_password: password });
      setDone(true);
      setTimeout(() => navigate("/login"), 2500);
    } catch (e) {
      setError(e.response?.data?.detail || "Reset failed. The link may have expired.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!token) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white border border-gray-100 rounded-2xl p-8 text-center space-y-3 max-w-sm w-full">
        <p className="text-sm text-red-500">Invalid or missing reset token.</p>
        <button
          onClick={() => navigate("/forgot-password")}
          className="text-sm text-blue-500 hover:underline"
        >
          Request a new link
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* ── SUCCESS FLASH ─────────────────────────────── */}
      {done && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl shadow-xl text-sm font-medium bg-white border border-green-100 text-green-600">
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-green-50">
            <svg className="w-3.5 h-3.5 text-green-500" fill="none" viewBox="0 0 16 16">
              <path d="M3 8l3.5 3.5L13 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span>
          Password reset successfully! Redirecting to login…
        </div>
      )}

      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 pt-16">
        <div className="w-full max-w-sm">
          <div className="bg-white border border-gray-100 rounded-2xl p-8">
            <div className="mb-7">
              <h1 className="text-2xl font-semibold text-gray-900">Reset password</h1>
              <p className="text-sm text-gray-400 mt-1">Enter your new password below.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <div className="flex justify-between items-center">
                  <label className="text-xs font-medium text-gray-500 uppercase">New password</label>
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
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  disabled={submitting || done}
                  className="w-full mt-1 px-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:ring-2 focus:ring-blue-400 outline-none disabled:opacity-50"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">Confirm password</label>
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="••••••••"
                  required
                  disabled={submitting || done}
                  className="w-full mt-1 px-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:ring-2 focus:ring-blue-400 outline-none disabled:opacity-50"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-100 text-red-500 text-sm px-3 py-2 rounded-xl">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || done}
                className="w-full py-2.5 rounded-xl text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
              >
                {submitting && (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                )}
                {submitting ? "Resetting…" : done ? "Done!" : "Reset password"}
              </button>
            </form>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default ResetPassword;