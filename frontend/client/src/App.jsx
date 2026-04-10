import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Hostels from "./pages/Hostels";

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
        </Routes>
      </>
    </Router>
  );
};

export default App;