/**
 * NotFound.js - 404 page
 */

import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="page-wrapper">
      <div className="section" style={{ paddingTop: 120, textAlign: "center" }}>
        <div className="container">
          <div style={{ fontSize: "4rem", marginBottom: 16 }}>🔍</div>
          <h1 style={{ marginBottom: 8 }}>Page not found</h1>
          <p style={{ color: "var(--gray-500)", marginBottom: 24 }}>
            The page you are looking for does not exist or has moved.
          </p>
          <Link to="/" className="btn btn-primary">
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
