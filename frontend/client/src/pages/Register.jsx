import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import Footer from "../components/Footer";

const Register = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone_number: "",
    password: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [flashMessage, setFlashMessage] = useState(null);
  const [flashType, setFlashType] = useState("success");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (form.password !== form.confirmPassword) {
      setFlashType("error");
      setFlashMessage("Passwords do not match.");
      setTimeout(() => setFlashMessage(null), 3000);
      return;
    }

    setSubmitting(true);

    try {
      await api.post("/users/register", {
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        phone_number: form.phone_number,
        password: form.password,
      });

      setFlashType("success");
      setFlashMessage("Account created! Check your email to verify. 🎉");

      setTimeout(() => {
        navigate("/login");
      }, 3000);

    } catch (err) {
      setFlashType("error");
      const detail = err.response?.data?.detail;
      setFlashMessage(detail || "Registration failed. Please try again.");
      setTimeout(() => setFlashMessage(null), 3000);
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 pt-16 pb-16">
        <div className="w-full max-w-sm">

          <div className="bg-white border border-gray-100 rounded-2xl p-8">

            {/* HEADER */}
            <div className="mb-7">
              <h1 className="text-2xl font-semibold text-gray-900">
                Create account
              </h1>
              <p className="text-sm text-gray-400 mt-1">
                Register to book your hostel room
              </p>
            </div>

            {/* FLASH MESSAGE — inside the card, above the form */}
            {flashMessage && (
              <div
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium mb-5
                  ${flashType === "success"
                    ? "bg-green-50 border border-green-100 text-green-600"
                    : "bg-red-50 border border-red-100 text-red-500"
                  }`}
              >
                {flashType === "success" ? (
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-green-100 shrink-0">
                    <svg className="w-3.5 h-3.5 text-green-500" fill="none" viewBox="0 0 16 16">
                      <path d="M3 8l3.5 3.5L13 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
                ) : (
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-red-100 shrink-0">
                    <svg className="w-3.5 h-3.5 text-red-400" fill="none" viewBox="0 0 16 16">
                      <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  </span>
                )}
                {flashMessage}
              </div>
            )}

            {/* FORM */}
            <form onSubmit={handleSubmit} className="space-y-4">

              {/* FIRST & LAST NAME */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">
                    First name
                  </label>
                  <input
                    type="text"
                    name="first_name"
                    placeholder="John"
                    value={form.first_name}
                    onChange={handleChange}
                    disabled={submitting}
                    className="w-full mt-1 px-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:ring-2 focus:ring-blue-400 outline-none disabled:opacity-50"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">
                    Last name
                  </label>
                  <input
                    type="text"
                    name="last_name"
                    placeholder="Doe"
                    value={form.last_name}
                    onChange={handleChange}
                    disabled={submitting}
                    className="w-full mt-1 px-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:ring-2 focus:ring-blue-400 outline-none disabled:opacity-50"
                    required
                  />
                </div>
              </div>

              {/* EMAIL */}
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={handleChange}
                  disabled={submitting}
                  className="w-full mt-1 px-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:ring-2 focus:ring-blue-400 outline-none disabled:opacity-50"
                  required
                />
              </div>

              {/* PHONE */}
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">
                  Phone number
                </label>
                <input
                  type="text"
                  name="phone_number"
                  placeholder="07XXXXXXXX"
                  value={form.phone_number}
                  onChange={handleChange}
                  disabled={submitting}
                  className="w-full mt-1 px-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:ring-2 focus:ring-blue-400 outline-none disabled:opacity-50"
                  required
                />
                <p className="text-xs text-gray-400 mt-1">
                  Accepts 07XXXXXXXX, +2547XXXXXXXX, or 2547XXXXXXXX
                </p>
              </div>

              {/* PASSWORD */}
              <div>
                <div className="flex justify-between items-center">
                  <label className="text-xs font-medium text-gray-500 uppercase">
                    Password
                  </label>
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
                  name="password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={handleChange}
                  disabled={submitting}
                  className="w-full mt-1 px-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:ring-2 focus:ring-blue-400 outline-none disabled:opacity-50"
                  required
                />
                <p className="text-xs text-gray-400 mt-1">
                  Must have uppercase, lowercase, number & special character
                </p>
              </div>

              {/* CONFIRM PASSWORD */}
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">
                  Confirm password
                </label>
                <input
                  type={showPassword ? "text" : "password"}
                  name="confirmPassword"
                  placeholder="••••••••"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  disabled={submitting}
                  className="w-full mt-1 px-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:ring-2 focus:ring-blue-400 outline-none disabled:opacity-50"
                  required
                />
              </div>

              {/* SUBMIT */}
              <button
                type="submit"
                disabled={submitting}
                className={`w-full py-2.5 rounded-xl text-sm font-medium text-white transition flex items-center justify-center gap-2
                  ${submitting
                    ? "bg-blue-400 cursor-not-allowed"
                    : "bg-blue-500 hover:bg-blue-600"
                  }`}
              >
                {submitting ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                    </svg>
                    Creating account...
                  </>
                ) : (
                  "Create account"
                )}
              </button>

            </form>

            {/* LOGIN LINK */}
            <p className="text-center text-sm text-gray-400 mt-5">
              Already have an account?{" "}
              <button
                onClick={() => navigate("/login")}
                className="text-blue-500 font-medium"
              >
                Login
              </button>
            </p>

          </div>

          <p className="text-center text-xs text-gray-300 mt-5">
            By registering you agree to our terms and privacy policy.
          </p>

        </div>
      </div>

      <Footer />
    </>
  );
};

export default Register;