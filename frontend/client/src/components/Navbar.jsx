import { useState } from "react";
import {
  Menu,
  X,
  User,
  Home,
  Building2,
  MapPin,       // ✅ location pin for Maps (mobile only)
  CalendarDays,
  Info,
  LogOut,
  LogIn,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { logoutUser } from "../features/auth/authSlice";
import logo from "../assets/images/LUStay_logo.png";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const isAuthenticated = useSelector((s) => s.auth.isAuthenticated);
  const user = useSelector((s) => s.auth.user);

  const handleLogout = () => {
    dispatch(logoutUser());
    navigate("/");
    setIsOpen(false);
  };

  const displayName = user
    ? `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim() || "Profile"
    : "Profile";

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

        {/* Desktop Links (text only) */}
        <ul className="hidden md:flex space-x-6 text-white font-medium">
          <Link to="/" className="hover:text-gray-200 transition">Home</Link>
          <Link to="/hostels" className="hover:text-gray-200 transition">Hostels</Link>
          <Link to="/maps" className="hover:text-gray-200 transition">Maps</Link>
          <Link to="/bookings" className="hover:text-gray-200 transition">Bookings</Link>
          <Link to="/about" className="hover:text-gray-200 transition">About Us</Link>
        </ul>

        {/* Desktop Auth */}
        <div className="hidden md:flex items-center space-x-4 text-white">
          {isAuthenticated ? (
            <div className="flex items-center space-x-4">
              <Link
                to="/profile"
                className="flex items-center space-x-1.5 hover:text-gray-200 transition"
              >
                {user?.profile_image ? (
                  <img
                    src={user.profile_image}
                    alt="avatar"
                    className="w-7 h-7 rounded-full object-cover"
                  />
                ) : (
                  <User size={18} />
                )}
                <span className="text-sm">{displayName}</span>
              </Link>
              <button
                onClick={handleLogout}
                className="bg-red-500 text-white px-3 py-1 rounded-lg hover:bg-red-600 transition text-sm flex items-center space-x-1"
              >
                <LogOut size={16} />
                <span>Logout</span>
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="bg-blue-500 text-white px-4 py-2 rounded-xl hover:bg-blue-600 transition flex items-center space-x-1"
            >
              <LogIn size={18} />
              <span>Sign In</span>
            </Link>
          )}
        </div>

        {/* Mobile Hamburger */}
        <div className="md:hidden text-white">
          <button onClick={() => setIsOpen(!isOpen)}>
            {isOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu (with icons) */}
      {isOpen && (
        <div className="fixed top-16 right-0 w-2/3 h-[calc(100%-64px)] bg-cyan-900 shadow-lg z-40 flex flex-col px-6 py-6 space-y-4 text-white">
          <Link to="/" onClick={() => setIsOpen(false)} className="flex items-center space-x-2">
            <Home size={20} /> <span>Home</span>
          </Link>
          <Link to="/hostels" onClick={() => setIsOpen(false)} className="flex items-center space-x-2">
            <Building2 size={20} /> <span>Hostels</span>
          </Link>
          <Link to="/maps" onClick={() => setIsOpen(false)} className="flex items-center space-x-2">
            <MapPin size={20} /> <span>Maps</span>
          </Link>
          <Link to="/bookings" onClick={() => setIsOpen(false)} className="flex items-center space-x-2">
            <CalendarDays size={20} /> <span>Bookings</span>
          </Link>
          <Link to="/about" onClick={() => setIsOpen(false)} className="flex items-center space-x-2">
            <Info size={20} /> <span>About Us</span>
          </Link>

          {isAuthenticated ? (
            <>
              <Link
                to="/profile"
                onClick={() => setIsOpen(false)}
                className="flex items-center space-x-2 mt-4"
              >
                {user?.profile_image ? (
                  <img
                    src={user.profile_image}
                    alt="avatar"
                    className="w-7 h-7 rounded-full object-cover"
                  />
                ) : (
                  <User size={20} />
                )}
                <span>{displayName}</span>
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 text-red-400 mt-2 text-left text-sm"
              >
                <LogOut size={18} />
                <span>Logout</span>
              </button>
            </>
          ) : (
            <Link
              to="/login"
              onClick={() => setIsOpen(false)}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg mt-4 text-center flex items-center justify-center space-x-2"
            >
              <LogIn size={20} />
              <span>Sign In</span>
            </Link>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
