import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { requestPasswordChange } from "../api/account";
import Footer from "../components/Footer";

const PasswordRule = ({ met, label }) => (
  <li className={`flex items-center gap-1.5 text-xs transition-colors duration-200 ${met ? "text-green-500" : "text-red-400"}`}>
    <span className={`flex items-center justify-center w-4 h-4 rounded-full shrink-0 transition-colors duration-200 ${met ? "bg-green-100" : "bg-red-100"}`}>
      {met ? (
        <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 16 16">
          <path d="M3 8l3.5 3.5L13 4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ) : (
        <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 16 16">
          <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
        </svg>
      )}
    </span>
    {label}
  </li>
);

const ChangePassword = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ current_password: "", new_password: "" });
  const [showCurrent,      setShowCurrent]      = useState(false);
  const [showNew,          setShowNew]          = useState(false);
  const [newPasswordFocused, setNewPasswordFocused] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [status,   setStatus]   = useState("");
  const [message,  setMessage]  = useState("");

  const rules = {
    minLength:  form.new_password.length >= 8,
    hasUpper:   /[A-Z]/.test(form.new_password),
    hasLower:   /[a-z]/.test(form.new_password),
    hasNumber:  /[0-9]/.test(form.new_password),
    hasSpecial: /[^A-Za-z0-9]/.test(form.new_password),
  };
  const passwordValid = Object.values(rules).every(Boolean);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!passwordValid) {
      setStatus("error");
      setMessage("New password does not meet all requirements.");
      return;
    }
    setLoading(true);
    setStatus("");
    setMessage("");
    try {
      await requestPasswordChange(form);
      setStatus("success");
      setMessage("Check your email to confirm the password change.");
      setForm({ current_password: "", new_password: "" });
    } catch (err) {
      setStatus("error");
      setMessage(err?.response?.data?.detail || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 pt-16 pb-16">
        <div className="w-full max-w-sm">
          <div className="bg-white border border-gray-100 rounded-2xl p-8">

            {/* HEADER */}
            <div className="mb-7">
              <button
                onClick={() => navigate(-1)}
                className="text-xs text-gray-400 hover:text-gray-600 mb-4 flex items-center gap-1 transition-colors"
              >
                ← Back
              </button>
              <h1 className="text-2xl font-semibold text-gray-900">Change password</h1>
              <p className="text-sm text-gray-400 mt-1">
                You'll receive a confirmation link via email before the change takes effect.
              </p>
            </div>

            {/* STATUS MESSAGE */}
            {message && (
              <div className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium mb-5
                ${status === "success"
                  ? "bg-green-50 border border-green-100 text-green-600"
                  : "bg-red-50 border border-red-100 text-red-500"
                }`}
              >
                <span className={`flex items-center justify-center w-6 h-6 rounded-full shrink-0
                  ${status === "success" ? "bg-green-100" : "bg-red-100"}`}
                >
                  {status === "success" ? (
                    <svg className="w-3.5 h-3.5 text-green-500" fill="none" viewBox="0 0 16 16">
                      <path d="M3 8l3.5 3.5L13 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  ) : (
                    <svg className="w-3.5 h-3.5 text-red-400" fill="none" viewBox="0 0 16 16">
                      <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  )}
                </span>
                {message}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">

              {/* CURRENT PASSWORD */}
              <div>
                <div className="flex justify-between items-center">
                  <label className="text-xs font-medium text-gray-500 uppercase">Current password</label>
                  <button
                    type="button"
                    onClick={() => setShowCurrent(!showCurrent)}
                    className="text-xs text-blue-500"
                  >
                    {showCurrent ? "Hide" : "Show"}
                  </button>
                </div>
                <input
                  type={showCurrent ? "text" : "password"}
                  placeholder="••••••••"
                  value={form.current_password}
                  onChange={(e) => setForm({ ...form, current_password: e.target.value })}
                  disabled={loading}
                  className="w-full mt-1 px-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:ring-2 focus:ring-blue-400 outline-none disabled:opacity-50"
                  required
                />
              </div>

              {/* NEW PASSWORD */}
              <div>
                <div className="flex justify-between items-center">
                  <label className="text-xs font-medium text-gray-500 uppercase">New password</label>
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="text-xs text-blue-500"
                  >
                    {showNew ? "Hide" : "Show"}
                  </button>
                </div>
                <input
                  type={showNew ? "text" : "password"}
                  placeholder="••••••••"
                  value={form.new_password}
                  onChange={(e) => setForm({ ...form, new_password: e.target.value })}
                  onFocus={() => setNewPasswordFocused(true)}
                  disabled={loading}
                  className="w-full mt-1 px-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:ring-2 focus:ring-blue-400 outline-none disabled:opacity-50"
                  required
                />

                {/* LIVE RULES */}
                {(newPasswordFocused || form.new_password.length > 0) && (
                  <ul className="mt-2 space-y-1 pl-0.5">
                    <PasswordRule met={rules.minLength}  label="At least 8 characters" />
                    <PasswordRule met={rules.hasUpper}   label="One uppercase letter" />
                    <PasswordRule met={rules.hasLower}   label="One lowercase letter" />
                    <PasswordRule met={rules.hasNumber}  label="One number" />
                    <PasswordRule met={rules.hasSpecial} label="One special character" />
                  </ul>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`w-full py-2.5 rounded-xl text-sm font-medium text-white transition flex items-center justify-center gap-2
                  ${loading ? "bg-blue-400 cursor-not-allowed" : "bg-blue-500 hover:bg-blue-600"}`}
              >
                {loading ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                    </svg>
                    Sending…
                  </>
                ) : "Request change"}
              </button>

            </form>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default ChangePassword;