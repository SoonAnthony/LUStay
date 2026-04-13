import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import api from "../api/axios";
import Footer from "../components/Footer";
import { useAuth } from "../context/AuthContext";

const SkeletonBlock = ({ h = "h-4", w = "w-full" }) => (
  <div className={`animate-pulse bg-gray-100 ${h} ${w} rounded-lg`} />
);

const RoomDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();

  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);

  const [semester, setSemester] = useState("");
  const [isShared, setIsShared] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");

  useEffect(() => {
    const fetchRoom = async () => {
      try {
        const res = await api.get(`/rooms/${id}`);
        setRoom(res.data);
      } catch (err) {
        console.error("Error loading room:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchRoom();
  }, [id]);

  if (loading) {
    return (
      <>
        <div className="pt-28 bg-gray-50 min-h-screen px-4">
          <div className="max-w-4xl mx-auto space-y-4">
            <SkeletonBlock h="h-4" w="w-20" />
            <SkeletonBlock h="h-8" w="w-48" />
            <SkeletonBlock h="h-56" />
            <SkeletonBlock h="h-24" />
            <SkeletonBlock h="h-24" />
          </div>
        </div>
        <Footer />
      </>
    );
  }

  if (!room) {
    return (
      <div className="pt-28 text-center text-red-500">
        Room not found
      </div>
    );
  }

  const isAvailable = room.status !== "FULLY_OCCUPIED";

  const handleBooking = async () => {
    if (!isAuthenticated) {
      navigate("/login", { state: { from: location } });
      return;
    }

    if (!semester || !phoneNumber) {
      alert("Please fill all fields");
      return;
    }

    try {
      setBookingLoading(true);

      const res = await api.post("/bookings/reservations", {
        room_id: room.id,
        semester,
        is_shared: isShared,
        phone_number: phoneNumber,
      });

      const reservationId = res.data.id;
      navigate(`/payments/${reservationId}`);
    } catch (err) {
      console.error("Booking failed:", err);
      alert(err.response?.data?.detail || "Booking failed");
    } finally {
      setBookingLoading(false);
    }
  };

  return (
    <>
      <div className="pt-28 bg-gray-50 min-h-screen pb-16">
        <div className="max-w-4xl mx-auto px-4">

          {/* BACK */}
          <button
            onClick={() => navigate(-1)}
            className="mb-6 flex items-center gap-1 text-sm text-blue-400 hover:text-blue-500 transition-colors"
          >
            ← Back
          </button>

          {/* HEADER */}
          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-gray-900">
              Room {room.room_number}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {room.room_type?.name}
            </p>
          </div>

          {/* IMAGE */}
          <div className="mb-4">
            <img
              src={room.room_type?.images?.[0]?.image_url}
              alt="Room"
              className="w-full h-64 object-cover rounded-2xl"
            />
          </div>

          {/* DESCRIPTION */}
          <div className="bg-white border border-gray-100 rounded-2xl p-5 mb-4">
            <p className="text-xs text-gray-400 mb-2 uppercase tracking-wide">
              About
            </p>
            <p className="text-sm text-gray-700 leading-relaxed">
              {room.room_type?.description || "No description available."}
            </p>
          </div>

          {/* PRICING */}
          <div className="bg-white border border-gray-100 rounded-2xl p-5 mb-4">
            <p className="text-xs text-gray-400 mb-3 uppercase tracking-wide">
              Pricing
            </p>

            <div className="flex gap-8">
              <div>
                <p className="text-xs text-gray-400 mb-1">
                  Single occupancy
                </p>
                <p className="text-lg font-semibold text-gray-900">
                  KES {room.room_type?.price_single?.toLocaleString()}
                </p>
              </div>

              <div className="w-px bg-gray-100"></div>

              <div>
                <p className="text-xs text-gray-400 mb-1">
                  Shared occupancy
                </p>
                <p className="text-lg font-semibold text-gray-900">
                  KES{" "}
                  {Math.round(
                    room.room_type?.price_double /
                      room.room_type?.capacity
                  ).toLocaleString()}
                  <span className="text-sm font-normal text-gray-400">
                    {" "}
                    / person
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* STATUS */}
          <div className="mb-6">
            <p className="text-sm font-medium text-gray-700 mb-2">
              Status
            </p>

            <span
              className={`inline-block px-4 py-1 text-xs rounded-full font-medium
                ${
                  isAvailable
                    ? "bg-lime-50 text-lime-600"
                    : "bg-red-50 text-red-400"
                }`}
            >
              {isAvailable ? "Available" : "Fully Occupied"}
            </span>
          </div>

          {/* BOOKING FORM */}
          {isAvailable && (
            <div className="bg-white border border-gray-100 rounded-2xl p-5 mb-6">
              <p className="text-xs text-gray-400 mb-3 uppercase tracking-wide">
                Booking details
              </p>

              {/* Semester */}
              <div className="mb-4">
                <label className="text-sm text-gray-600 mb-1 block">
                  Semester
                </label>
                <select
                  value={semester}
                  onChange={(e) => setSemester(e.target.value)}
                  className="w-full border border-gray-200 px-4 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  <option value="">Select semester</option>
                  <option value="2026-S1">2026 Semester 1</option>
                  <option value="2026-S2">2026 Semester 2</option>
                </select>
              </div>

              {/* Shared */}
              <div className="mb-4 flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={isShared}
                  onChange={(e) => setIsShared(e.target.checked)}
                />
                <label className="text-sm text-gray-600">
                  Shared room
                </label>
              </div>

              {/* Phone */}
              <div>
                <label className="text-sm text-gray-600 mb-1 block">
                  Phone Number (M-Pesa)
                </label>
                <input
                  type="text"
                  placeholder="2547XXXXXXXX or 2541XXXXXXXX"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full border border-gray-200 px-4 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
            </div>
          )}

          {/* 🔥 MODERN BUTTON (BACK IN PAGE) */}
          <div className="mt-6">
            <button
              onClick={handleBooking}
              disabled={!isAvailable || bookingLoading}
              className={`w-full py-3 rounded-2xl text-sm font-medium transition-all duration-200
                ${
                  isAvailable
                    ? "bg-blue-500 hover:bg-blue-600 text-white shadow-sm hover:shadow-md"
                    : "bg-gray-200 text-gray-400 cursor-not-allowed"
                }`}
            >
              {bookingLoading
                ? "Processing payment..."
                : isAvailable
                ? "Reserve & Pay Deposit"
                : "Unavailable"}
            </button>
          </div>

        </div>
      </div>

      <Footer />
    </>
  );
};

export default RoomDetails;