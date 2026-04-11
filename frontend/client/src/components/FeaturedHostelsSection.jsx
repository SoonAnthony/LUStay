import { useEffect, useState } from "react";
import HostelCard, { HostelCardSkeleton } from "./HostelCard";
import api from "../api/axios";

const FeaturedHostelsSection = () => {
  const [hostels, setHostels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    api
      .get("/hostels/featured")
      .then((res) => {
        setHostels(res.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching featured hostels:", err);
        setError(true);
        setLoading(false);
      });
  }, []);

  return (
    <section className="bg-white py-16">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-800">
            Featured Hostels
          </h2>
          <p className="text-gray-500 mt-2">
            Top student-friendly hostels near you
          </p>
        </div>

        {error ? (
          <p className="text-center text-gray-400">
            Could not load featured hostels. Please try again later.
          </p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3">
            {loading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <HostelCardSkeleton key={i} />
                ))
              : hostels.length === 0
              ? (
                <p className="col-span-3 text-center text-gray-400">
                  No featured hostels at the moment.
                </p>
              )
              : hostels.map((hostel) => (
                  <HostelCard key={hostel.id} hostel={hostel} />
                ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default FeaturedHostelsSection;