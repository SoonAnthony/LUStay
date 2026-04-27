import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../api/axios";
import HostelCard, { HostelCardSkeleton } from "../components/HostelCard";
import Footer from "../components/Footer";

const Hostels = () => {
  const [hostels, setHostels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const navigate = useNavigate();
  const location = useLocation();

  // On mount, read ?search= from URL and pre-fill the search box
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const q = params.get("search") || "";
    setSearch(q);
  }, [location.search]);

  useEffect(() => {
    api
      .get("/hostels/")
      .then((res) => {
        setHostels(res.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching hostels:", err);
        setLoading(false);
      });
  }, []);

  // Keep URL in sync as user types in the search box on this page
  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearch(val);
    const params = new URLSearchParams(location.search);
    if (val.trim()) {
      params.set("search", val.trim());
    } else {
      params.delete("search");
    }
    navigate(`/hostels?${params.toString()}`, { replace: true });
  };

  const filteredHostels = hostels.filter((h) =>
    h.name.toLowerCase().includes(search.toLowerCase()) ||
    h.location.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <section className="pt-28 bg-gray-50 min-h-screen pb-16">
        <div className="max-w-7xl mx-auto px-4">

          {/* HEADER */}
          <div className="mb-8 text-center">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800">
              All Verified Hostels
            </h1>
            <p className="text-gray-500 mt-2">
              {loading
                ? "Loading..."
                : `${filteredHostels.length} hostel${
                    filteredHostels.length !== 1 ? "s" : ""
                  } found${search ? ` for "${search}"` : ""}`}
            </p>
          </div>

          {/* SEARCH */}
          <div className="mb-10 flex justify-center">
            <input
              type="text"
              placeholder="Search by location or hostel name..."
              value={search}
              onChange={handleSearchChange}
              className="w-full max-w-2xl px-5 py-3 rounded-xl border border-gray-300
                         focus:outline-none focus:ring-2 focus:ring-blue-400
                         shadow-sm bg-white"
            />
          </div>

          {/* GRID */}
          <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3">
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <HostelCardSkeleton key={i} />
              ))
            ) : filteredHostels.length === 0 ? (
              <div className="col-span-full text-center py-20">
                <p className="text-5xl mb-4">🏠</p>
                <h3 className="text-xl font-semibold text-gray-700">
                  No hostels found
                </h3>
                <p className="text-gray-500 mt-2">
                  Try searching a different location or name.
                </p>
              </div>
            ) : (
              filteredHostels.map((hostel) => (
                <div
                  key={hostel.id}
                  onClick={() => navigate(`/hostels/${hostel.id}`)}
                  className="cursor-pointer"
                >
                  <HostelCard hostel={hostel} />
                </div>
              ))
            )}
          </div>

        </div>
      </section>

      <Footer />
    </>
  );
};

export default Hostels;