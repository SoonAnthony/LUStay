import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/axios";
import Footer from "../components/Footer";

const SkeletonCard = () => (
  <div className="animate-pulse bg-gray-100 rounded-xl h-24"></div>
);

const SkeletonBlock = ({ h = "h-4", w = "w-full", rounded = "rounded-lg" }) => (
  <div className={`animate-pulse bg-gray-100 ${h} ${w} ${rounded}`}></div>
);

const RoomTypeDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [roomType, setRoomType] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoom, setSelectedRoom] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const roomsRes = await api.get(`/rooms/?room_type_id=${id}&t=${Date.now()}`);
        const data = roomsRes.data;
        if (data.length > 0) setRoomType(data[0].room_type);
        setRooms(data);
      } catch (err) {
        console.error("Error loading room type:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const totalRooms = rooms.length;
  const fullyOccupied = rooms.filter((r) => r.status === "FULLY_OCCUPIED").length;
  const partialRooms = rooms.filter((r) => r.status === "PARTIALLY_OCCUPIED").length;
  const availableRooms = rooms.filter((r) => r.status === "AVAILABLE").length;

  if (loading) {
    return (
      <>
        <div className="pt-28 bg-gray-50 min-h-screen pb-16">
          <div className="max-w-4xl mx-auto px-4">
            <SkeletonBlock h="h-4" w="w-16" rounded="rounded" />
            <div className="mt-6 mb-6">
              <SkeletonBlock h="h-8" w="w-56" rounded="rounded" />
              <div className="mt-2">
                <SkeletonBlock h="h-4" w="w-36" rounded="rounded" />
              </div>
            </div>
            <SkeletonBlock h="h-24" rounded="rounded-2xl" />
            <div className="mt-4">
              <SkeletonBlock h="h-20" rounded="rounded-2xl" />
            </div>
            <div className="mt-6 grid grid-cols-4 gap-3">
              {[...Array(4)].map((_, i) => (
                <SkeletonBlock key={i} h="h-16" rounded="rounded-xl" />
              ))}
            </div>
            <div className="mt-6 grid grid-cols-2 md:grid-cols-3 gap-3">
              {[...Array(6)].map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  if (!roomType) {
    return (
      <div className="pt-28 text-center text-red-500">Room type not found</div>
    );
  }

  return (
    <>
      <div className="pt-28 bg-gray-50 min-h-screen pb-24">
        <div className="max-w-4xl mx-auto px-4">

          {/* BACK */}
          <button
            onClick={() => navigate(-1)}
            className="mb-6 flex items-center gap-1 text-sm text-blue-400 hover:text-blue-500 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 16 16">
              <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Back
          </button>

          {/* HEADER */}
          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-gray-900">{roomType.name} Room</h1>
            <p className="text-sm text-gray-500 mt-1">Capacity: {roomType.capacity} students per room</p>
          </div>

          {/* DESCRIPTION */}
          <div className="bg-white border border-gray-100 rounded-2xl p-5 mb-4">
            <p className="text-xs text-gray-400 mb-2 uppercase tracking-wide">About</p>
            <p className="text-sm text-gray-700 leading-relaxed">
              {roomType.description || "No description available."}
            </p>
          </div>

          {/* PRICING */}
          <div className="bg-white border border-gray-100 rounded-2xl p-5 mb-6">
            <p className="text-xs text-gray-400 mb-3 uppercase tracking-wide">Pricing</p>
            <div className="flex gap-8">
              <div>
                <p className="text-xs text-gray-400 mb-1">Single occupancy</p>
                <p className="text-lg font-semibold text-gray-900">KES {roomType.price_single.toLocaleString()}</p>
              </div>
              <div className="w-px bg-gray-100"></div>
              <div>
                <p className="text-xs text-gray-400 mb-1">Shared occupancy</p>
                <p className="text-lg font-semibold text-gray-900">
                  KES {Math.round(roomType.price_double / roomType.capacity).toLocaleString()}
                  <span className="text-sm font-normal text-gray-400"> / person</span>
                </p>
              </div>
            </div>
          </div>

          {/* AVAILABILITY SUMMARY */}
          <div className="mb-6">
            <p className="text-sm font-medium text-gray-700 mb-3">Availability</p>
            <div className="grid grid-cols-4 gap-3">
              <div className="bg-white border border-gray-100 rounded-xl p-4 text-center">
                <p className="text-xl font-semibold text-lime-500">{availableRooms}</p>
                <p className="text-xs text-gray-400 mt-1">Available</p>
              </div>
              <div className="bg-white border border-gray-100 rounded-xl p-4 text-center">
                <p className="text-xl font-semibold text-amber-500">{partialRooms}</p>
                <p className="text-xs text-gray-400 mt-1">Partial</p>
              </div>
              <div className="bg-white border border-gray-100 rounded-xl p-4 text-center">
                <p className="text-xl font-semibold text-red-400">{fullyOccupied}</p>
                <p className="text-xs text-gray-400 mt-1">Occupied</p>
              </div>
              <div className="bg-white border border-gray-100 rounded-xl p-4 text-center">
                <p className="text-xl font-semibold text-gray-700">{totalRooms}</p>
                <p className="text-xs text-gray-400 mt-1">Total</p>
              </div>
            </div>
          </div>

          {/* ROOMS GRID */}
          <p className="text-sm font-medium text-gray-700 mb-3">All rooms</p>

          {rooms.length === 0 ? (
            <p className="text-gray-400 text-sm">No rooms found for this type.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {rooms.map((room) => {
                const isFullyOccupied = room.status === "FULLY_OCCUPIED";
                const isPartial = room.status === "PARTIALLY_OCCUPIED";
                const isSelected = selectedRoom?.id === room.id;
                const slotsLeft = room.room_type
                  ? room.room_type.capacity - (room.occupants || 0)
                  : null;

                return (
                  <button
                    key={room.id}
                    onClick={() => {
                      if (!isFullyOccupied) setSelectedRoom(room);
                    }}
                    disabled={isFullyOccupied}
                    className={`p-4 rounded-xl border text-center transition-all duration-150
                      ${isFullyOccupied
                        ? "bg-gray-50 opacity-50 cursor-not-allowed border-gray-100"
                        : isSelected
                        ? "border-blue-400 border-2 bg-blue-50"
                        : isPartial
                        ? "bg-amber-50 border-amber-100 hover:border-amber-300 cursor-pointer"
                        : "bg-white border-gray-100 hover:border-lime-400 cursor-pointer"
                      }`}
                  >
                    <p className="text-sm font-medium text-gray-800 mb-2">Room {room.room_number}</p>

                    <span className={`inline-block text-xs font-medium px-3 py-1 rounded-full
                      ${isFullyOccupied
                        ? "bg-red-50 text-red-400"
                        : isPartial
                        ? "bg-amber-100 text-amber-600"
                        : "bg-lime-50 text-lime-600"
                      }`}>
                      {isFullyOccupied ? "Occupied" : isPartial ? "Partial" : "Available"}
                    </span>

                    {isPartial && slotsLeft !== null && (
                      <p className="text-xs text-gray-400 mt-2">
                        {slotsLeft} slot{slotsLeft !== 1 ? "s" : ""} left
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* BOOKING PANEL */}
      {selectedRoom && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-4 z-50">
          <div className="max-w-4xl mx-auto flex justify-between items-center">
            <div>
              <p className="text-sm font-semibold text-gray-900">Room {selectedRoom.room_number}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {selectedRoom.status === "PARTIALLY_OCCUPIED"
                  ? `${(selectedRoom.room_type?.capacity || 0) - (selectedRoom.occupants || 0)} slot(s) remaining`
                  : "Ready for booking"}
              </p>
            </div>
            <button
              onClick={() => navigate(`/rooms/${selectedRoom.id}`)}
              className="bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-colors"
            >
              Continue booking
            </button>
          </div>
        </div>
      )}

      <Footer />
    </>
  );
};

export default RoomTypeDetails;