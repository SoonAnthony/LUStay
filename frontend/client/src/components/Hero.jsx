import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import heroImage from "../assets/images/hero.webp";

const Hero = () => {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  const handleSearch = () => {
    const trimmed = query.trim();
    if (trimmed) {
      navigate(`/hostels?search=${encodeURIComponent(trimmed)}`);
    } else {
      navigate("/hostels");
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSearch();
  };

  return (
    <section className="pt-28 md:pt-32 bg-linear-to-b from-cyan-800 to-sky-100 min-h-[90vh] flex items-center">
      <div className="max-w-7xl mx-auto px-4 grid md:grid-cols-2 gap-10 items-center">

        {/* LEFT SIDE */}
        <div className="text-white text-center md:text-left">
          <h1 className="text-4xl md:text-5xl font-bold leading-tight">
            Find Safe & Affordable Hostels Near Laikipia University
          </h1>

          <p className="mt-4 text-gray-200 text-lg">
            Discover and compare student-friendly hostels around your campus with ease.
          </p>

          {/* SEARCH BAR */}
          <div className="mt-6 flex items-center bg-white rounded-xl shadow-lg overflow-hidden w-full">
            <div className="pl-3 md:pl-4 text-gray-400 shrink-0">
              <Search size={18} />
            </div>
            <input
              type="text"
              placeholder="Search hostels by name or location..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full px-2 md:px-3 py-2 md:py-3 text-gray-700 text-sm md:text-base focus:outline-none"
            />
            <button
              onClick={handleSearch}
              className="bg-blue-500 px-3 md:px-6 py-2 md:py-3 text-white text-sm md:text-base hover:bg-blue-600 transition duration-300 whitespace-nowrap"
            >
              Search
            </button>
          </div>

          {/* CTA BUTTON */}
          <div className="mt-6">
            <Link
              to="/hostels"
              className="bg-lime-500 text-white px-6 py-3 rounded-xl hover:bg-lime-600 transition duration-300 inline-block"
            >
              Browse Hostels
            </Link>
          </div>
        </div>

        {/* RIGHT SIDE */}
        <div className="flex justify-center">
          <div className="relative w-full max-w-md md:max-w-lg">
            <img
              src={heroImage}
              alt="Students Hostel"
              fetchpriority="high"
              decoding="async"
              className="w-full object-cover rounded-3xl shadow-2xl"
            />
            <div className="absolute inset-0 rounded-3xl bg-linear-to-r from-cyan-800 via-transparent to-transparent opacity-60" />
          </div>
        </div>

      </div>
    </section>
  );
};

export default Hero;