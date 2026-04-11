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
    <nav className="bg-cyan-800 shadow-md">
      <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">

        {/* Logo */}
        <Link to="/" className="flex items-center space-x-1">
          {/* 1. The new icon-only logo */}
          <img src={logo} alt="LUStay Logo" className="h-12 w-auto -ml-2 -mr-9 object-contain scale-110" />
          
          {/* 2. Text with 'spanning' for different colors */}
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

        {/* Right Side */}
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
              Login
            </Link>
          )}
        </div>

        {/* Mobile */}
        <div className="md:hidden text-white">
          <button onClick={() => setIsOpen(!isOpen)} className="hover:text-gray-200 transition-colors duration-300">
            {isOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden px-4 pb-4 space-y-3 text-white">
          <Link to="/" className="hover:text-gray-200 transition-colors duration-300">Home</Link>
          <Link to="/hostels" className="hover:text-gray-200 transition-colors duration-300">Hostels</Link>
          {user ? (
            <>
              <p>{user.name}</p>
              <button
                onClick={handleLogout}
                className="text-red-500 hover:text-red-600 transition duration-300"
              >
                Logout
              </button>
            </>
          ) : (
            <button className="bg-blue-500 text-white px-3 py-2 rounded-lg hover:bg-blue-600 transition duration-300">
              Login
            </button>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
