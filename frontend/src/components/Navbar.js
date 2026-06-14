/**
 * Navbar.js - Top navigation bar
 * Shows brand, navigation links, and student/admin toggle
 */

import { NavLink } from "react-router-dom";

export default function Navbar() {
  return (
    <nav className="navbar">
      <div className="container">
        {/* Brand */}
        <NavLink to="/" className="navbar-brand">
          <div className="brand-icon">🚀</div>
          <span>As<span className="brand-accent">pire</span></span>
        </NavLink>

        {/* Navigation Links */}
        <ul className="navbar-links">
          <li><NavLink to="/">Home</NavLink></li>
          <li><NavLink to="/browse">Browse</NavLink></li>
          <li><NavLink to="/dashboard">My Dashboard</NavLink></li>
          <li><NavLink to="/login">Login / Sign Up</NavLink></li>
          <li><NavLink to="/admin/login" className="btn-admin">Admin Panel</NavLink></li>  
          <li><NavLink to="/company/login">For Companies</NavLink></li>      </ul>
      </div>
    </nav>
  );
}
