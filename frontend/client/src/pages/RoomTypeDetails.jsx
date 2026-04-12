import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/axios";
import Footer from "../components/Footer";

const RoomTypeDetails = () => {
  const { id } = useParams(); // room_type_id
  const navigate = useNavigate();

  const [roomType, setRoomType] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoom, setSelectedRoom] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const roomsRes = await api.get(`/rooms/?room_type_id=${id}`);

        const data = roomsRes.data;

        if (data.length > 0) {
          setRoomType(data[0].room_type);
        }

        setRooms(data);
      } catch (err) {
        console.error("Error loading room type:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  if (loading) {
    return (
      <div className="pt-28 text-center text-gray-500">
        Loading room details...
      </div>
    );
  }

  if (!roomType) {
    return (
      <div className="pt-28 text-center text-red-500">
        Room type not found
      </div>
    );
  }

  const availableRooms = rooms.filter(
    (r) => r.status !== "FULLY_OCCUPIED"
  ).length;

  const totalRooms = rooms.length;

  return (
    <>
      <div className="pt-28 bg-gray-50 min-h-screen pb-16">
        <div className="max-w-6xl mx-auto px-4">

          {/* BACK */}
          <button
            onClick={() => navigate(-1)}
            className="mb-6 text-blue-600 hover:underline"
          >
            ← Back
          </button>

          {/* HEADER */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-800">
              {roomType.name} Room
            </h1>
            <p className="text-gray-500 mt-2">
              Capacity: {roomType.capacity} students per room
            </p>
          </div>

          {/* DESCRIPTION */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-2">About this room type</h2>
            <p className="text-gray-600">
              {roomType.description || "No description available."}
            </p>
          </div>

          {/* PRICING */}
          <div className="bg-white p-5 rounded-2xl border mb-8">
            <h2 className="text-lg font-semibold mb-3">Pricing</h2>
            <p>Single occupancy: <b>KES {roomType.price_single}</b></p>
            <p>Shared occupancy: <b>KES {roomType.price_double}</b></p>
          </div>

          {/* AVAILABILITY SUMMARY */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-3">Availability</h2>
            <p className="text-green-600 font-medium">
              {availableRooms} available
            </p>
            <p className="text-gray-500 text-sm">
              out of {totalRooms} rooms
            </p>
          </div>

          {/* ROOMS GRID */}
          <h2 className="text-xl font-semibold mb-4">
            All Rooms
          </h2>

          {rooms.length === 0 ? (
            <p className="text-gray-500">
              No rooms found for this type.
            </p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

              {rooms.map((room) => {
                const isAvailable = room.status !== "FULLY_OCCUPIED";

                return (
                  <button
                    key={room.id}
                    onClick={() => {
                      if (isAvailable) {
                        setSelectedRoom(room);
                      }
                    }}
                    disabled={!isAvailable}
                    className={`p-4 rounded-xl border text-center transition
                      ${
                        isAvailable
                          ? "bg-white hover:border-blue-500 cursor-pointer"
                          : "bg-gray-100 opacity-60 cursor-not-allowed"
                      }`}
                  >
                    <p className="font-semibold">
                      Room {room.room_number}
                    </p>

                    <p
                      className={`text-sm mt-1 ${
                        isAvailable
                          ? "text-green-600"
                          : "text-red-500"
                      }`}
                    >
                      {isAvailable ? "Available" : "Occupied"}
                    </p>
                  </button>
                );
              })}
            </div>
          )}

          {/* BOOKING PANEL */}
          {selectedRoom && (
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 shadow-lg">
              <div className="max-w-5xl mx-auto flex justify-between items-center">

                <div>
                  <p className="font-semibold">
                    Room {selectedRoom.room_number}
                  </p>
                  <p className="text-sm text-gray-500">
                    Ready for booking
                  </p>
                </div>

                <button
                  onClick={() =>
                    navigate(`/rooms/${selectedRoom.id}`)
                  }
                  className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700"
                >
                  Continue Booking
                </button>

              </div>
            </div>
          )}

        </div>
      </div>

      <Footer />
    </>
  );
};

export default RoomTypeDetails;