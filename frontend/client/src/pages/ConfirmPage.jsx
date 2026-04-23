import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../api/axios";
import Footer from "../components/Footer";

const CONFIG = {
  EMAIL_VERIFY: {
    title: "Email verified",
    label: "Account Verification",
    message: "Your email has been verified. You can now access your LUStay account.",
    button: "Go to login",
  },
  EMAIL_CHANGE: {
    title: "Email updated",
    label: "Email Change",
    message: "Your email address has been updated successfully.",
    button: "Continue",
  },
  PASSWORD_RESET: {
    title: "Password changed",
    label: "Security Update",
    message: "Your password has been changed successfully.",
    button: "Login again",
  },
  PHONE_CHANGE: {
    title: "Phone updated",
    label: "Phone Number",
    message: "Your phone number has been updated successfully.",
    button: "Continue",
  },
};

const ConfirmPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [status, setStatus] = useState("loading");
  const [config, setConfig] = useState(null);

  useEffect(() => {
    const token = searchParams.get("token");

    if (!token) {
      setStatus("error");
      return;
    }

    const verify = async () => {
      try {
        const res = await api.get(`/users/confirm?token=${token}`);

        // Normalize backend type (e.g. "phone_change" → "PHONE_CHANGE")
        const type = (res.data.type || "").toUpperCase().trim();

        // Fallback config if type not found
        const fallback = {
          title: "Success",
          label: "Confirmation",
          message: "Your request was processed successfully.",
          button: "Continue",
        };

        setConfig(CONFIG[type] || fallback);
        setStatus("success");
      } catch {
        setStatus("error");
      }
    };

    verify();
  }, [searchParams]);

  return (
    <>
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-16">
        <div className="bg-white border border-gray-100 rounded-2xl p-8 max-w-md w-full">

          {/* LOADING */}
          {status === "loading" && (
            <div className="text-center">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-5">
                <div className="w-7 h-7 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
              </div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">
                Processing request
              </p>
              <h1 className="text-lg font-semibold text-gray-900">
                Verifying your link
              </h1>
              <p className="text-sm text-gray-400 mt-1">
                Please wait while we confirm your request…
              </p>
            </div>
          )}

          {/* SUCCESS */}
          {status === "success" && config && (
            <div className="text-center">
              <div className="w-14 h-14 rounded-2xl bg-lime-50 flex items-center justify-center mx-auto mb-5 text-lime-500 text-2xl">
                ✓
              </div>

              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">
                {config.label}
              </p>

              <h1 className="text-lg font-semibold text-gray-900">
                {config.title}
              </h1>

              <p className="text-sm text-gray-400 mt-2 mb-6">
                {config.message}
              </p>

              <button
                onClick={() => navigate("/login")}
                className="w-full py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-xl transition-colors"
              >
                {config.button}
              </button>
            </div>
          )}

          {/* ERROR */}
          {status === "error" && (
            <div className="text-center">
              <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-5 text-red-400 text-2xl">
                ✕
              </div>

              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">
                Verification failed
              </p>

              <h1 className="text-lg font-semibold text-gray-900">
                Link expired or invalid
              </h1>

              <p className="text-sm text-gray-400 mt-2 mb-6">
                This link may have already been used or expired. Request a new one from your account settings.
              </p>

              <button
                onClick={() => navigate("/profile")}
                className="w-full py-2 bg-gray-900 hover:bg-black text-white text-sm rounded-xl transition-colors"
              >
                Back to profile
              </button>
            </div>
          )}

        </div>
      </div>
      <Footer />
    </>
  );
};

export default ConfirmPage;
