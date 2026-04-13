import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/axios";
import Footer from "../components/Footer";

const PaymentStatus = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [status, setStatus] = useState("loading");
  const [reservation, setReservation] = useState(null);
  const [error, setError] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);

  const pollingRef = useRef(null);
  const timerRef = useRef(null);

  // ⏱ Countdown timer based on expires_at
  useEffect(() => {
    if (!reservation?.expires_at) return;

    const tick = () => {
      const now = new Date();
      const expiry = new Date(reservation.expires_at);
      const diff = Math.max(0, Math.floor((expiry - now) / 1000));
      setTimeLeft(diff);
    };

    tick();
    timerRef.current = setInterval(tick, 1000);
    return () => clearInterval(timerRef.current);
  }, [reservation?.expires_at]);

  // 🔁 Poll reservation status
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await api.get(`/bookings/reservations/${id}`);
        const data = res.data;

        setReservation(data);

        if (data.status === "converted") {
          setStatus("success");
          setTimeout(() => navigate("/my-bookings"), 2000);
          clearInterval(pollingRef.current);
        } else if (data.status === "expired") {
          setStatus("expired");
          clearInterval(pollingRef.current);
        } else {
          setStatus("waiting");
        }
      } catch (err) {
        console.error("Error checking payment:", err);
        setError("Failed to check payment status");
        clearInterval(pollingRef.current);
      }
    };

    fetchStatus();
    pollingRef.current = setInterval(fetchStatus, 3000);
    return () => clearInterval(pollingRef.current);
  }, [id, navigate]);

  // Format seconds into mm:ss
  const formatTime = (secs) => {
    if (secs === null) return "--:--";
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  return (
    <>
      <div className="pt-28 bg-gray-50 min-h-screen pb-16 flex items-center justify-center">
        <div className="bg-white p-8 rounded-2xl shadow-md text-center max-w-md w-full">

          {/* 🔄 LOADING */}
          {status === "loading" && (
            <p className="text-gray-500">Initializing payment...</p>
          )}

          {/* ⏳ WAITING */}
          {status === "waiting" && (
            <>
              <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-600 mx-auto mb-6"></div>

              <h2 className="text-xl font-semibold text-gray-800 mb-2">
                Waiting for Payment
              </h2>

              <p className="text-gray-600">
                Please check your phone and complete the M-Pesa payment.
              </p>

              {/* Reservation details */}
              {reservation && (
                <div className="mt-5 bg-gray-50 rounded-xl p-4 text-left space-y-2 text-sm text-gray-600">
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-700">Semester</span>
                    <span>{reservation.semester}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-700">Room Type</span>
                    <span>{reservation.is_shared ? "Shared" : "Single"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-700">Reservation expires in</span>
                    <span
                      className={`font-semibold ${
                        timeLeft <= 30 ? "text-red-500" : "text-blue-600"
                      }`}
                    >
                      {formatTime(timeLeft)}
                    </span>
                  </div>
                </div>
              )}

              <p className="text-sm text-gray-400 mt-4">
                This page updates automatically...
              </p>
            </>
          )}

          {/* ✅ SUCCESS */}
          {status === "success" && (
            <>
              <div className="text-green-600 text-4xl mb-4">✔</div>

              <h2 className="text-xl font-semibold text-gray-800 mb-2">
                Payment Successful
              </h2>

              {reservation && (
                <div className="mt-3 bg-green-50 rounded-xl p-4 text-left space-y-2 text-sm text-gray-600">
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-700">Semester</span>
                    <span>{reservation.semester}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-700">Room Type</span>
                    <span>{reservation.is_shared ? "Shared" : "Single"}</span>
                  </div>
                </div>
              )}

              <p className="text-gray-600 mt-4">
                Your booking has been confirmed 🎉
              </p>

              <p className="text-sm text-gray-400 mt-2">
                Redirecting to your bookings...
              </p>
            </>
          )}

          {/* ❌ EXPIRED */}
          {status === "expired" && (
            <>
              <div className="text-red-500 text-4xl mb-4">✖</div>

              <h2 className="text-xl font-semibold text-gray-800 mb-2">
                Payment Expired
              </h2>

              <p className="text-gray-600">
                Your reservation expired before payment was completed.
              </p>

              {reservation && (
                <div className="mt-4 bg-red-50 rounded-xl p-4 text-left space-y-2 text-sm text-gray-600">
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-700">Semester</span>
                    <span>{reservation.semester}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-700">Room Type</span>
                    <span>{reservation.is_shared ? "Shared" : "Single"}</span>
                  </div>
                </div>
              )}

              <button
                onClick={() => navigate(-1)}
                className="mt-6 bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700"
              >
                Try Again
              </button>
            </>
          )}

          {/* ⚠ ERROR */}
          {error && (
            <p className="text-red-500 mt-4">{error}</p>
          )}

        </div>
      </div>

      <Footer />
    </>
  );
};

export default PaymentStatus;