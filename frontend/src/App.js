/**
 * App.js - Root component
 * Sets up React Router with all page routes and global layout
 */

import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Browse from "./pages/Browse";
import OpportunityDetail from "./pages/OpportunityDetail";
import Dashboard from "./pages/Dashboard";
import Admin from "./pages/Admin";
import "./styles/global.css";

function App() {
  return (
    <Router>
      {/* Navbar is shown on every page */}
      <Navbar />

      {/* Main content area - padded for fixed navbar */}
      <div className="main-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/browse" element={<Browse />} />
          <Route path="/opportunity/:id" element={<OpportunityDetail />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
