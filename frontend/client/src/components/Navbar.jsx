import { useState, useEffect } from "react";
import { Menu, X, User } from "lucide-react";
import axios from "axios";
import { Link } from "react-router-dom";
import logo from "../assets/images/LUStay_logo.png";
import { getToken, logout } from "../utils/auth";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = getToken();

    if (!token) return;

    axios
      .get("http://127.0.0.1:8000/api/user", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      .then((res) => setUser(res.data))
      .catch(() => setUser(null));
  }, []);

  const handleLogout = () => {
    logout();
    setUser(null);
    window.location.href = "/";
  };

  return (
    <nav className="bg-cyan-800 shadow-md fixed top-0 left-0 w-full z-50">
      <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
        {/* Logo */}
        <Link to="/" className="flex items-center space-x-1">
          <img
            src={logo}
            alt="LUStay Logo"
            className="h-12 w-auto -ml-2 -mr-9 object-contain scale-110"
          />
          <span className="text-3xl font-bold tracking-tight">
            <span className="text-blue-600">LU</span>
            <span className="text-lime-500">Stay</span>
          </span>
        </Link>

        {/* Desktop Links */}
        <ul className="hidden md:flex space-x-6 text-white font-medium">
          <Link to="/" className="hover:text-gray-200 transition-colors duration-300">Home</Link>
          <Link to="/hostels" className="hover:text-gray-200 transition-colors duration-300">Hostels</Link>
          <Link to="/maps" className="hover:text-gray-200 transition-colors duration-300">Maps</Link>
          <Link to="/bookings" className="hover:text-gray-200 transition-colors duration-300">Bookings</Link>
          <Link to="/about" className="hover:text-gray-200 transition-colors duration-300">About Us</Link>
        </ul>

        {/* Right Side (Desktop Auth) */}
        <div className="hidden md:flex items-center space-x-4 text-white">
          {user ? (
            <div className="flex items-center space-x-2">
              <User size={18} />
              <span>{user.name}</span>
              <button
                onClick={handleLogout}
                className="ml-3 bg-red-500 text-white px-3 py-1 rounded-lg hover:bg-red-600 transition duration-300"
              >
                Logout
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="bg-blue-500 text-white px-4 py-2 rounded-xl hover:bg-blue-600 transition duration-300"
            >
               Sign In
            </Link>
          )}
        </div>

        {/* Mobile Hamburger */}
        <div className="md:hidden text-white">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="hover:text-gray-200 transition-colors duration-300"
          >
            {isOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="fixed top-[64px] right-0 w-2/3 h-[calc(100%-64px)] bg-cyan-900 shadow-lg z-40 flex flex-col items-start px-6 py-6 space-y-4 text-white transition-transform duration-300">
          {/* Vertical nav links */}
          <Link to="/" className="hover:text-gray-200 transition-colors duration-300">Home</Link>
          <Link to="/hostels" className="hover:text-gray-200 transition-colors duration-300">Hostels</Link>
          <Link to="/maps" className="hover:text-gray-200 transition-colors duration-300">Maps</Link>
          <Link to="/bookings" className="hover:text-gray-200 transition-colors duration-300">Bookings</Link>
          <Link to="/about" className="hover:text-gray-200 transition-colors duration-300">About Us</Link>

          {/* Auth section (Mobile) */}
          {user ? (
            <>
              <p className="mt-4">{user.name}</p>
              <button
                onClick={handleLogout}
                className="text-red-500 hover:text-red-600 transition duration-300"
              >
                Logout
              </button>
            </>
          ) : (
            <Link
              to="/login"
              className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition duration-300 mt-4"
            >
              Sign In
            </Link>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
