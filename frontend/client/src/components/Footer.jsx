import { Link } from "react-router-dom";
import logo from "../assets/images/LUStay_logo.png";

const Footer = () => {
  return (
    <footer className="bg-cyan-800 text-white mt-16">
      <div className="max-w-7xl mx-auto px-4 py-12 grid grid-cols-1 md:grid-cols-3 gap-10">

        {/* Brand Section */}
        <div>
          <div className="flex items-center space-x-2 mb-4">
            <img src={logo} alt="LUStay Logo" className="h-10" />
            <span className="text-2xl font-bold">
              <span className="text-blue-400">LU</span>
              <span className="text-lime-400">Stay</span>
            </span>
          </div>

          <p className="text-gray-300 text-sm leading-relaxed">
            Find safe, affordable, and verified student hostels around Laikipia University.
            Book instantly with secure mobile payments.
          </p>
        </div>

        {/* Quick Links */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Quick Links</h3>

          <ul className="space-y-3 text-gray-300">
            <li>
              <Link
                to="/"
                className="relative w-fit block
                           after:block after:content-[''] after:absolute after:h-0.5
                           after:bg-lime-400 after:w-0 after:bottom-0 after:left-0
                           hover:after:w-full after:transition-all after:duration-300"
              >
                Home
              </Link>
            </li>

            <li>
              <Link
                to="/hostels"
                className="relative w-fit block
                           after:block after:content-[''] after:absolute after:h-0.5
                           after:bg-lime-400 after:w-0 after:bottom-0 after:left-0
                           hover:after:w-full after:transition-all after:duration-300"
              >
                Hostels
              </Link>
            </li>

            <li>
              <Link
                to="/maps"
                className="relative w-fit block
                           after:block after:content-[''] after:absolute after:h-0.5
                           after:bg-lime-400 after:w-0 after:bottom-0 after:left-0
                           hover:after:w-full after:transition-all after:duration-300"
              >
                Maps
              </Link>
            </li>

            <li>
              <Link
                to="/bookings"
                className="relative w-fit block
                           after:block after:content-[''] after:absolute after:h-0.5
                           after:bg-lime-400 after:w-0 after:bottom-0 after:left-0
                           hover:after:w-full after:transition-all after:duration-300"
              >
                Bookings
              </Link>
            </li>

            <li>
              <Link
                to="/about"
                className="relative w-fit block
                           after:block after:content-[''] after:absolute after:h-0.5
                           after:bg-lime-400 after:w-0 after:bottom-0 after:left-0
                           hover:after:w-full after:transition-all after:duration-300"
              >
                About Us
              </Link>
            </li>
          </ul>
        </div>

        {/* Contact Section */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Contact</h3>

          <div className="text-gray-300 text-sm space-y-2">
            <p>Laikipia University, Nyahururu</p>
            <p>Email: support@lustay.com</p>
            <p>Phone: +254 700 000 000</p>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-cyan-700 text-center py-4 text-gray-300 text-sm">
        © {new Date().getFullYear()} LUStay. All rights reserved.
      </div>
    </footer>
  );
};

export default Footer;