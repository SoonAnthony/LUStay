import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import Footer from "../components/Footer";

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [email,      setEmail]      = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent,       setSent]       = useState(false);
  const [error,      setError]      = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.post("/users/forgot-password", { email });
      setSent(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 pt-16">
        <div className="w-full max-w-sm">
          <div className="bg-white border border-gray-100 rounded-2xl p-8">
            <div className="mb-7">
              <h1 className="text-2xl font-semibold text-gray-900">Forgot password</h1>
              <p className="text-sm text-gray-400 mt-1">
                Enter your email and we'll send a reset link.
              </p>
            </div>

            {sent ? (
              <div className="text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-lime-50 flex items-center justify-center mx-auto">
                  <svg className="w-5 h-5 text-lime-500" fill="none" viewBox="0 0 16 16">
                    <path d="M3 8l3.5 3.5L13 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <p className="text-sm text-gray-600">
                  If that email exists, a reset link has been sent. Check your inbox.
                </p>
                <button
                  onClick={() => navigate("/login")}
                  className="text-sm text-blue-500 hover:underline"
                >
                  Back to login
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    disabled={submitting}
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
                  disabled={submitting}
                  className="w-full py-2.5 rounded-xl text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
                >
                  {submitting && (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  )}
                  {submitting ? "Sending…" : "Send reset link"}
                </button>

                <p className="text-center text-sm text-gray-400">
                  <button
                    type="button"
                    onClick={() => navigate("/login")}
                    className="text-blue-500 hover:underline"
                  >
                    Back to login
                  </button>
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default ForgotPassword;