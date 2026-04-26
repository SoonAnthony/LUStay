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
  // ✅ Guard so we only call the expire endpoint once
  const hasExpiredRef = useRef(false);

  // ── Expire reservation on the backend and update UI ──────────
  const handleExpiry = async () => {
    // Already handled — don't fire twice
    if (hasExpiredRef.current) return;
    hasExpiredRef.current = true;

    // Stop polling immediately — no point checking status anymore
    clearInterval(pollingRef.current);
    clearInterval(timerRef.current);

    try {
      await api.patch(`/bookings/reservations/${id}/expire`);
    } catch (err) {
      // Even if the network call fails the TTL will expire server-side
      // on the next request, so we still transition the UI.
      console.warn("Expire call failed (TTL will clean up server-side):", err);
    }

    // Transition UI to expired state regardless of network outcome
    setTimeLeft(0);
    setStatus("expired");
  };

  // ── Countdown timer ───────────────────────────────────────────
  useEffect(() => {
    if (!reservation?.expires_at) return;

    const tick = () => {
      const now = new Date();
      const expiry = new Date(reservation.expires_at);
      const diff = Math.max(0, Math.floor((expiry - now) / 1000));
      setTimeLeft(diff);

      // ✅ When the countdown reaches zero, expire immediately
      if (diff === 0) {
        handleExpiry();
      }
    };

    tick(); // run once immediately
    timerRef.current = setInterval(tick, 1000);
    return () => clearInterval(timerRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reservation?.expires_at]);

  // ── Polling ───────────────────────────────────────────────────
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await api.get(`/bookings/reservations/${id}`);
        const data = res.data;

        setReservation(data);

        if (data.status === "converted") {
          setStatus("success");
          clearInterval(pollingRef.current);
          clearInterval(timerRef.current);
          setTimeout(() => navigate("/bookings", { replace: true }), 2000);
        } else if (data.status === "expired") {
          // Server already expired it (e.g. user came back after TTL)
          handleExpiry();
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
    pollingRef.current = setInterval(fetchStatus, 3000); // poll every 3s, not 1s
    return () => clearInterval(pollingRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, navigate]);

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

          {status === "loading" && (
            <p className="text-gray-500">Initializing payment...</p>
          )}

          {status === "waiting" && (
            <>
              <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-600 mx-auto mb-6" />
              <h2 className="text-xl font-semibold text-gray-800 mb-2">Waiting for Payment</h2>
              <p className="text-gray-600">
                Please check your phone and complete the M-Pesa payment.
              </p>

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
                      className={`font-semibold tabular-nums ${
                        timeLeft !== null && timeLeft <= 10
                          ? "text-red-500"
                          : "text-blue-600"
                      }`}
                    >
                      {formatTime(timeLeft)}
                    </span>
                  </div>
                </div>
              )}

              <p className="text-sm text-gray-400 mt-4">This page updates automatically...</p>
            </>
          )}

          {status === "success" && (
            <>
              <div className="text-green-600 text-4xl mb-4">✔</div>
              <h2 className="text-xl font-semibold text-gray-800 mb-2">Payment Successful</h2>

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

              <p className="text-gray-600 mt-4">Your booking has been confirmed 🎉</p>
              <p className="text-sm text-gray-400 mt-2">Redirecting to your bookings...</p>
            </>
          )}

          {status === "expired" && (
            <>
              <div className="text-red-500 text-4xl mb-4">✖</div>
              <h2 className="text-xl font-semibold text-gray-800 mb-2">Reservation Expired</h2>
              <p className="text-gray-600">
                Your reservation expired before payment was completed. The slot has been released.
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

          {error && <p className="text-red-500 mt-4">{error}</p>}

        </div>
      </div>
      <Footer />
    </>
  );
};

export default PaymentStatus;