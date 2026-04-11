import { Link } from "react-router-dom";
import { HiOutlineMail, HiOutlinePhone } from "react-icons/hi";
import { FaTwitter, FaInstagram, FaLinkedinIn } from "react-icons/fa";
import logo from "../assets/images/LUStay_logo.png";

const LINKS = {
  Platform: [
    { label: "Browse Hostels", to: "/hostels" },
    { label: "Maps", to: "/maps" },
    { label: "My Bookings", to: "/bookings" },
  ],
  Company: [
    { label: "About LUStay", to: "/about" },
    { label: "Safety & Trust", to: "/trust" },
  ],
  Support: [
    { label: "Help Center", to: "/help" },
    { label: "Contact Us", to: "/contact" },
    { label: "Privacy Policy", to: "/privacy" },
  ],
};

export default function Footer() {
  return (
    <footer className="bg-cyan-800 text-white pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4">

        {/* TOP GRID */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-10">

          {/* BRAND */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <img src={logo} alt="LUStay" className="h-12 w-auto -ml-2 -mr-9 object-contain scale-110" />
              <span className="text-2xl font-bold">
                <span className="text-blue-400">LU</span>
                <span className="text-lime-400">Stay</span>
              </span>
            </div>

            <p className="text-gray-300 text-sm leading-relaxed mb-4">
              LUStay helps Laikipia University students find safe, verified,
              and affordable hostels around campus and nearby towns like Nanyuki
              and Nyahururu. Book instantly using secure mobile payments.
            </p>

            {/* SOCIALS */}
            <div className="flex gap-3">
              {[FaTwitter, FaInstagram, FaLinkedinIn].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="w-9 h-9 rounded-lg bg-cyan-700 flex items-center justify-center
                             text-gray-300 hover:text-white hover:bg-lime-500
                             transition-all duration-300"
                >
                  <Icon size={15} />
                </a>
              ))}
            </div>
          </div>

          {/* LINK SECTIONS */}
          {Object.entries(LINKS).map(([section, links]) => (
            <div key={section}>
              <h4 className="text-white font-semibold mb-4">{section}</h4>
              <ul className="space-y-3">
                {links.map(({ label, to }) => (
                  <li key={to}>
                    <Link
                      to={to}
                      className="relative text-gray-300 text-sm w-fit block
                                 after:block after:content-[''] after:absolute
                                 after:h-0.5 after:bg-lime-400 after:w-0
                                 after:bottom-0 after:left-0
                                 hover:after:w-full after:transition-all after:duration-300"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* CONTACT STRIP */}
        <div className="border-t border-cyan-700 border-b py-6 mb-6 flex flex-col md:flex-row gap-4 md:gap-8">
          <a
            href="mailto:support@lustay.co.ke"
            className="flex items-center gap-2 text-gray-300 text-sm hover:text-white"
          >
            <HiOutlineMail className="text-lime-400" />
            support@lustay.co.ke
          </a>

          <a
            href="tel:+254705446434"
            className="flex items-center gap-2 text-gray-300 text-sm hover:text-white"
          >
            <HiOutlinePhone className="text-lime-400" />
            +254 705 446 434
          </a>
        </div>

        {/* BOTTOM */}
        <div className="flex flex-col md:flex-row justify-between items-center text-xs text-gray-400">
          <p>© {new Date().getFullYear()} LUStay. All rights reserved.</p>
          <p>Secure bookings · M-Pesa payments · Student-focused platform</p>
        </div>

      </div>
    </footer>
  );
}