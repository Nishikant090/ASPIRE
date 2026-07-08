/**
 * Navbar.js - Role-aware navigation with logout
 */

import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { isAuthenticated, role, logout, initializing } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  if (initializing) {
    return (
      <nav className="navbar">
        <div className="container">
          <NavLink to="/" className="navbar-brand">
            <div className="brand-icon">🚀</div>
            <span>
              As<span className="brand-accent">pire</span>
            </span>
          </NavLink>
        </div>
      </nav>
    );
  }

  return (
    <nav className="navbar">
      <div className="container">
        <NavLink to="/" className="navbar-brand">
          <div className="brand-icon">🚀</div>
          <span>
            As<span className="brand-accent">pire</span>
          </span>
        </NavLink>

        <ul className="navbar-links">
          <li>
            <NavLink to="/">Home</NavLink>
          </li>
          <li>
            <NavLink to="/browse">Browse</NavLink>
          </li>

          {isAuthenticated && role === "student" && (
            <li>
              <NavLink to="/dashboard">My Dashboard</NavLink>
            </li>
          )}

          {isAuthenticated && role === "company" && (
            <li>
              <NavLink to="/company/dashboard">Company Dashboard</NavLink>
            </li>
          )}

          {isAuthenticated && role === "admin" && (
            <li>
              <NavLink to="/admin">Admin Panel</NavLink>
            </li>
          )}

          {!isAuthenticated && (
            <>
              <li>
                <NavLink to="/register">Register</NavLink>
              </li>
              <li>
                <NavLink to="/login">Student Login</NavLink>
              </li>
              <li>
                <NavLink to="/company/login">For Companies</NavLink>
              </li>
            </>
          )}

          {isAuthenticated ? (
            <li>
              <button
                type="button"
                className="btn-admin"
                onClick={handleLogout}
                style={{ border: "none", cursor: "pointer", font: "inherit" }}
              >
                Logout
              </button>
            </li>
          ) : (
            <li>
              <NavLink to="/admin/login" className="btn-admin">
                Admin
              </NavLink>
            </li>
          )}
        </ul>
      </div>
    </nav>
  );
}
