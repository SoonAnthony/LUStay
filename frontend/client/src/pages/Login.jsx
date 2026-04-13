import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Footer from "../components/Footer";

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const from = location.state?.from?.pathname || "/";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(email, password);

      // redirect user back or to home
      navigate(from, { replace: true });
    } catch (err) {
      console.error(err);
      setError(
        err?.response?.data?.detail ||
          "Invalid email or password. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 pt-24">
        <div className="w-full max-w-md bg-white shadow-lg rounded-2xl p-8 border">

          {/* HEADER */}
          <h1 className="text-2xl font-bold text-center text-gray-800 mb-2">
            Welcome Back
          </h1>
          <p className="text-center text-gray-500 mb-6">
            Login to book your hostel room
          </p>

          {/* ERROR */}
          {error && (
            <div className="bg-red-100 text-red-700 text-sm px-3 py-2 rounded-lg mb-4">
              {error}
            </div>
          )}

          {/* FORM */}
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* EMAIL */}
            <div>
              <label className="text-sm text-gray-600">Email</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full mt-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                required
              />
            </div>

            {/* PASSWORD */}
            <div>
              <label className="text-sm text-gray-600">Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full mt-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                required
              />
            </div>

            {/* BUTTON */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-2 rounded-lg text-white font-medium transition
                ${
                  loading
                    ? "bg-blue-300 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
            >
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>

          {/* FOOTER LINKS */}
          <div className="text-center mt-6 text-sm text-gray-500">
            Don't have an account?{" "}
            <button
              onClick={() => navigate("/register")}
              className="text-blue-600 hover:underline"
            >
              Register
            </button>
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
};

export default Login;