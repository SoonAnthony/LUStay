import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import heroImage from "../assets/images/hero.png";

const Hero = () => {
  return (
    <section className="pt-28 md:pt-32 bg-linear-to-b from-cyan-800 to-sky-100 min-h-[90vh] flex items-center">
        <div className="max-w-7xl mx-auto px-4 grid md:grid-cols-2 gap-10 items-center">

            {/* LEFT SIDE */}
            <div className="text-white text-center md:text-left">

                {/* Heading */}
                <h1 className="text-4xl md:text-5xl font-bold leading-tight">
                    Find Safe & Affordable Hostels Near Laikipia University
                </h1>

                {/* Subtext */}
                <p className="mt-4 text-gray-200 text-lg">
                    Discover and compare student-friendly hostels around your campus with ease.
                </p>
                {/* SEARCH BAR */}
                <div className="mt-6 flex items-center bg-white rounded-xl shadow-lg overflow-hidden w-full">

                    {/* ICON */}
                    <div className="pl-3 md:pl-4 text-gray-400 shrink-0">
                        <Search size={18} />
                    </div>

                    {/* INPUT */}
                    <input
                        type="text"
                        placeholder="Search hostels..."
                        className="w-full px-2 md:px-3 py-2 md:py-3 text-gray-700 text-sm md:text-base focus:outline-none"
                    />

                    {/* BUTTON */}
                    <button className="bg-blue-500 px-3 md:px-6 py-2 md:py-3 text-white text-sm md:text-base hover:bg-blue-600 transition duration-300 whitespace-nowrap">
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
                <img
                    src={heroImage}
                    alt="Students Hostel"
                    className="w-full max-w-md md:max-w-lg object-contain"
                />
            </div>
        </div>
    </section>
  );
};

export default Hero;