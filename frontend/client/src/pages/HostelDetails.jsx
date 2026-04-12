import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/axios";
import Footer from "../components/Footer";

const HostelDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [hostel, setHostel] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch hostel + rooms
  useEffect(() => {
    const fetchData = async () => {
      try {
        const hostelRes = await api.get(`/hostels/${id}`);
        const roomsRes = await api.get(`/rooms/?hostel_id=${id}`);

        setHostel(hostelRes.data);
        setRooms(roomsRes.data);
      } catch (err) {
        console.error("Error loading hostel:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  if (loading) {
    return (
      <div className="pt-28 text-center text-gray-500">
        Loading hostel details...
      </div>
    );
  }

  if (!hostel) {
    return (
      <div className="pt-28 text-center text-red-500">
        Hostel not found
      </div>
    );
  }

  // GROUP rooms by room_type
  const roomTypesMap = {};

  rooms.forEach((room) => {
    const typeId = room.room_type.id;

    if (!roomTypesMap[typeId]) {
      roomTypesMap[typeId] = {
        ...room.room_type,
        total: 0,
        available: 0,
      };
    }

    roomTypesMap[typeId].total += 1;

    if (room.status !== "FULLY_OCCUPIED") {
      roomTypesMap[typeId].available += 1;
    }
  });

  const roomTypes = Object.values(roomTypesMap);

  return (
    <>
      <div className="pt-28 bg-gray-50 min-h-screen pb-16">
        <div className="max-w-6xl mx-auto px-4">

          {/* BACK BUTTON */}
          <button
            onClick={() => navigate(-1)}
            className="mb-6 text-blue-600 hover:underline"
          >
            ← Back
          </button>

          {/* IMAGE */}
          <div className="mb-6">
            <img
              src={hostel.images?.[0]?.image_url}
              alt={hostel.name}
              className="w-full h-87.5 object-cover rounded-2xl"
            />
          </div>

          {/* BASIC INFO */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-800">
              {hostel.name}
            </h1>
            <p className="text-gray-500 mt-2">{hostel.location}</p>
          </div>

          {/* DESCRIPTION */}
          <div className="mb-10">
            <h2 className="text-xl font-semibold mb-3">About</h2>
            <p className="text-gray-600 leading-relaxed">
              {hostel.description || "No description available"}
            </p>
          </div>

          {/* AMENITIES */}
          <div className="mb-10">
            <h2 className="text-xl font-semibold mb-3">Amenities</h2>
            <div className="flex flex-wrap gap-3">
              {hostel.amenities?.map((a) => (
                <span
                  key={a.id}
                  className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm"
                >
                  {a.name}
                </span>
              ))}
            </div>
          </div>

          {/* ROOM TYPES */}
          <div>
            <h2 className="text-xl font-semibold mb-6">
              Available Rooms
            </h2>

            {roomTypes.length === 0 ? (
              <p className="text-gray-500">
                No rooms available for this hostel.
              </p>
            ) : (
              <div className="grid md:grid-cols-2 gap-6">
                {roomTypes.map((type) => (
                  <div
                    key={type.id}
                    className="bg-white p-5 rounded-2xl shadow-sm border"
                  >
                    {/* IMAGE */}
                    <img
                      src={type.images?.[0]?.image_url}
                      alt={type.name}
                      className="w-full h-48 object-cover rounded-xl mb-4"
                    />

                    {/* INFO */}
                    <h3 className="text-lg font-semibold text-gray-800">
                     {type.name} Room
                    </h3>

                    <p className="text-gray-500 text-sm mt-1">
                      Capacity: {type.capacity} people
                    </p>

                    <p className="text-gray-600 mt-2 text-sm">
                      {type.description}
                    </p>

                    {/* PRICE */}
                    <div className="mt-4 text-sm text-gray-700">
                      <p>Single: KES {type.price_single}</p>
                      <p>Shared: KES {type.price_double}</p>
                    </div>

                    {/* AVAILABILITY */}
                    <div className="mt-3 text-sm">
                      <span className="text-green-600 font-medium">
                        {type.available} available
                      </span>{" "}
                      out of {type.total}
                    </div>

                    {/* BUTTON */}
                    <button
                      onClick={() => navigate(`/room-types/${type.id}`)}
                      className="mt-4 w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
                    >
                      View Rooms
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* FOOTER */}
      <Footer />
    </>
  );
};

export default HostelDetails;