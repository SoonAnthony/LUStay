import { useState, useEffect } from "react";
import { Menu, X, User } from "lucide-react";
import axios from "axios";
import { Link } from "react-router-dom";
import logo from "../assets/images/LUStay_logo.png";
import { getToken, logout } from "../utils/auth";

export default function Navbar() {
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
    <nav className="bg-sky-100 shadow-md">
      <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">

        {/* Logo */}
        <Link to="/" className="flex items-center space-x-2">
          <img src={logo} alt="LUStay Logo" className="h-10" />
          <span className="text-xl font-bold text-blue-600">LUStay</span>
        </Link>

        {/* Desktop Links */}
        <ul className="hidden md:flex space-x-6 text-gray-700 font-medium">
          <Link to="/">Home</Link>
          <Link to="/hostels">Hostels</Link>
          <li>About</li>
          <li>Contact</li>
        </ul>

        {/* Right Side */}
        <div className="hidden md:flex items-center space-x-4">

          {user ? (
            <div className="flex items-center space-x-2">
              <User size={18} />
              <span>{user.name}</span>

              <button
                onClick={handleLogout}
                className="ml-3 bg-red-500 text-white px-3 py-1 rounded-lg"
              >
                Logout
              </button>
            </div>
          ) : (
            <Link to="/login" className="bg-blue-500 text-white px-4 py-2 rounded-xl">
                Login
            </Link>
          )}

        </div>

        {/* Mobile */}
        <div className="md:hidden">
          <button onClick={() => setIsOpen(!isOpen)}>
            {isOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden px-4 pb-4 space-y-3">
          <Link to="/">Home</Link>
          <Link to="/hostels">Hostels</Link>

          {user ? (
            <>
              <p>{user.name}</p>
              <button onClick={handleLogout} className="text-red-500">
                Logout
              </button>
            </>
          ) : (
            <button className="bg-blue-500 text-white px-3 py-2 rounded-lg">
              Login
            </button>
          )}
        </div>
      )}
    </nav>
  );
}