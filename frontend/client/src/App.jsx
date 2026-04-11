import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Hostels from "./pages/Hostels";
import Maps from "./pages/Maps";
import Bookings from "./pages/Bookings";
import About from "./pages/About";  

const App = () => {
  return (
    <Router>
      <>
        {/* Global Navbar (always visible) */}
        <Navbar />

        {/* Pages */}
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/hostels" element={<Hostels />} />
          <Route path="/maps" element={<Maps />} />
          <Route path="/bookings" element={<Bookings />} />
          <Route path="/about" element={<About />} /> 
        </Routes>
      </>
    </Router>
  );
};

export default App;