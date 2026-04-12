import { useEffect, useState } from "react";
import api from "../api/axios";
import HostelCard, { HostelCardSkeleton } from "../components/HostelCard";

const Hostels = () => {
  const [hostels, setHostels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("");

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

  // 🔍 Filter + Sort logic
  const filteredHostels = hostels
    .filter((h) =>
      h.name.toLowerCase().includes(search.toLowerCase()) ||
      h.location.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === "price_asc") return a.price_per_month - b.price_per_month;
      if (sortBy === "price_desc") return b.price_per_month - a.price_per_month;
      if (sortBy === "rating") return b.rating - a.rating;
      return 0;
    });

  return (
    <section className="pt-28 bg-gray-50 min-h-screen pb-16">
      <div className="max-w-7xl mx-auto px-4">

        {/* 🔵 HEADER */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-800">
            All Hostels
          </h1>
          <p className="text-gray-500 mt-2">
            {loading
              ? "Loading..."
              : `${filteredHostels.length} hostel${
                  filteredHostels.length !== 1 ? "s" : ""
                } found`}
          </p>
        </div>

        {/* 🟡 SEARCH + SORT */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">

          {/* SEARCH */}
          <input
            type="text"
            placeholder="Search by location or hostel name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full md:flex-1 px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />

          {/* SORT */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value="">Sort By</option>
            <option value="price_asc">Price: Low → High</option>
            <option value="price_desc">Price: High → Low</option>
            <option value="rating">Highest Rated</option>
          </select>
        </div>

        {/* 🟢 GRID */}
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
              <HostelCard key={hostel.id} hostel={hostel} />
            ))
          )}
        </div>

      </div>
    </section>
  );
};

export default Hostels;