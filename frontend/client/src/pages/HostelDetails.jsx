import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/axios";
import Footer from "../components/Footer";

const SkeletonBlock = ({ h = "h-4", w = "w-full", rounded = "rounded-lg" }) => (
  <div className={`animate-pulse bg-gray-100 ${h} ${w} ${rounded}`}></div>
);

const HostelDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [hostel, setHostel] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const hostelRes = await api.get(`/hostels/${id}`);
        const roomsRes = await api.get(`/rooms/?hostel_id=${id}&t=${Date.now()}`);
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
      <>
        <div className="pt-28 bg-gray-50 min-h-screen pb-16">
          <div className="max-w-4xl mx-auto px-4">
            <SkeletonBlock h="h-4" w="w-16" rounded="rounded" />
            <div className="mt-6 mb-6">
              <SkeletonBlock h="h-72" rounded="rounded-2xl" />
            </div>
            <SkeletonBlock h="h-8" w="w-48" rounded="rounded" />
            <div className="mt-2 mb-6">
              <SkeletonBlock h="h-4" w="w-32" rounded="rounded" />
            </div>
            <SkeletonBlock h="h-20" rounded="rounded-2xl" />
            <div className="mt-4 flex gap-2">
              {[...Array(4)].map((_, i) => (
                <SkeletonBlock key={i} h="h-8" w="w-24" rounded="rounded-full" />
              ))}
            </div>
            <div className="mt-8 grid md:grid-cols-2 gap-5">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="bg-white border border-gray-100 rounded-2xl p-5 space-y-3">
                  <SkeletonBlock h="h-44" rounded="rounded-xl" />
                  <SkeletonBlock h="h-5" w="w-32" rounded="rounded" />
                  <SkeletonBlock h="h-4" w="w-24" rounded="rounded" />
                  <SkeletonBlock h="h-4" rounded="rounded" />
                  <SkeletonBlock h="h-10" rounded="rounded-xl" />
                </div>
              ))}
            </div>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  if (!hostel) {
    return (
      <div className="pt-28 text-center text-red-500">Hostel not found</div>
    );
  }

  const roomTypesMap = {};
  rooms.forEach((room) => {
    const typeId = room.room_type.id;
    if (!roomTypesMap[typeId]) {
      roomTypesMap[typeId] = {
        ...room.room_type,
        total: 0,
        available: 0,
        partial: 0,
        occupied: 0,
      };
    }
    roomTypesMap[typeId].total += 1;
    if (room.status === "AVAILABLE") roomTypesMap[typeId].available += 1;
    else if (room.status === "PARTIALLY_OCCUPIED") {
      roomTypesMap[typeId].available += 1;
      roomTypesMap[typeId].partial += 1;
    } else if (room.status === "FULLY_OCCUPIED") roomTypesMap[typeId].occupied += 1;
  });

  const roomTypes = Object.values(roomTypesMap);

  return (
    <>
      <div className="pt-28 bg-gray-50 min-h-screen pb-16">
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

          {/* HERO IMAGE */}
          {hostel.images?.[0]?.image_url && (
            <div className="mb-6 relative">
              <img
                src={hostel.images[0].image_url}
                alt={hostel.name}
                className="w-full h-72 object-cover rounded-2xl"
              />
              {hostel.is_featured && (
                <span className="absolute top-3 left-3 bg-blue-500 text-white text-xs font-medium px-3 py-1 rounded-full">
                  Featured
                </span>
              )}
            </div>
          )}

          {/* BASIC INFO */}
          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-gray-900">{hostel.name}</h1>
            <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 16 16">
                <path d="M8 1.5A4.5 4.5 0 0 0 3.5 6c0 3 4.5 8.5 4.5 8.5S12.5 9 12.5 6A4.5 4.5 0 0 0 8 1.5Zm0 6a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Z" fill="currentColor"/>
              </svg>
              {hostel.location}
            </p>
          </div>

          {/* DESCRIPTION */}
          <div className="bg-white border border-gray-100 rounded-2xl p-5 mb-5">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">About</p>
            <p className="text-sm text-gray-700 leading-relaxed">
              {hostel.description || "No description available."}
            </p>
          </div>

          {/* AMENITIES */}
          {hostel.amenities?.length > 0 && (
            <div className="mb-8">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-3">Amenities</p>
              <div className="flex flex-wrap gap-2">
                {hostel.amenities.map((a) => (
                  <span
                    key={a.id}
                    className="bg-blue-50 text-blue-500 text-xs font-medium px-3 py-1.5 rounded-full border border-blue-100"
                  >
                    {a.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* ROOM TYPES */}
          <p className="text-sm font-medium text-gray-700 mb-4">Room types</p>

          {roomTypes.length === 0 ? (
            <p className="text-sm text-gray-400">No rooms available for this hostel.</p>
          ) : (
            <div className="grid md:grid-cols-2 gap-5">
              {roomTypes.map((type) => (
                <div
                  key={type.id}
                  className="bg-white border border-gray-100 rounded-2xl overflow-hidden"
                >
                  {type.images?.[0]?.image_url && (
                    <img
                      src={type.images[0].image_url}
                      alt={type.name}
                      className="w-full h-44 object-cover"
                    />
                  )}

                  <div className="p-5">
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="text-base font-semibold text-gray-900">{type.name} Room</h3>
                      <span className="text-xs text-gray-400 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-full">
                        {type.capacity} person{type.capacity > 1 ? "s" : ""}
                      </span>
                    </div>

                    {type.description && (
                      <p className="text-xs text-gray-500 leading-relaxed mb-4">{type.description}</p>
                    )}

                    {/* PRICING */}
                    <div className="flex gap-4 mb-4">
                      <div>
                        <p className="text-xs text-gray-400">Single</p>
                        <p className="text-sm font-semibold text-gray-800">KES {type.price_single.toLocaleString()}</p>
                      </div>
                      <div className="w-px bg-gray-100"></div>
                      <div>
                        <p className="text-xs text-gray-400">Shared</p>
                        <p className="text-sm font-semibold text-gray-800">KES {type.price_double.toLocaleString()}</p>
                      </div>
                    </div>

                    {/* AVAILABILITY BADGES */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      <span className="text-xs font-medium bg-lime-50 text-lime-600 px-2.5 py-1 rounded-full">
                        {type.available} available
                      </span>
                      {type.partial > 0 && (
                        <span className="text-xs font-medium bg-amber-50 text-amber-600 px-2.5 py-1 rounded-full">
                          {type.partial} partial
                        </span>
                      )}
                      {type.occupied > 0 && (
                        <span className="text-xs font-medium bg-red-50 text-red-400 px-2.5 py-1 rounded-full">
                          {type.occupied} occupied
                        </span>
                      )}
                    </div>

                    {/* CTA */}
                    <button
                      onClick={() => navigate(`/room-types/${type.id}`)}
                      disabled={type.available === 0}
                      className={`w-full py-2.5 rounded-xl text-sm font-medium transition-colors
                        ${type.available === 0
                          ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                          : "bg-blue-500 hover:bg-blue-600 text-white"
                        }`}
                    >
                      {type.available === 0 ? "Fully occupied" : "View rooms"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      </div>

      <Footer />
    </>
  );
};

export default HostelDetails;