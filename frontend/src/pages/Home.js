/**
 * Home.js - Landing page for Aspire
 * Features: hero section, search, stats, and featured opportunities
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getStats, getFeaturedJobs } from "../api";
import OpportunityCard from "../components/OpportunityCard";

export default function Home() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [stats, setStats] = useState(null);
  const [featured, setFeatured] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch both stats and featured opportunities simultaneously
    Promise.all([getStats(), getFeaturedJobs()])
      .then(([statsRes, featuredRes]) => {
        setStats(statsRes.data);
        setFeatured(featuredRes.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    navigate(`/browse?search=${encodeURIComponent(search)}`);
  };

  return (
    <div className="page-wrapper">
      {/* ── Hero Section ── */}
      <section
        style={{
          background: "linear-gradient(135deg, #0F1B2D 0%, #1A2D45 50%, #243B55 100%)",
          padding: "80px 0 60px",
          color: "white",
          textAlign: "center",
        }}
      >
        <div className="container">
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "rgba(79,70,229,0.2)",
              border: "1px solid rgba(79,70,229,0.4)",
              borderRadius: 99,
              padding: "6px 16px",
              fontSize: "0.8rem",
              color: "#A5B4FC",
              fontWeight: 600,
              marginBottom: 24,
              letterSpacing: "0.5px",
            }}
          >
            ✨ YOUR CAREER STARTS HERE
          </div>

          <h1
            style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: "clamp(2rem, 5vw, 3.2rem)",
              fontWeight: 800,
              lineHeight: 1.15,
              marginBottom: 20,
              letterSpacing: "-1px",
            }}
          >
            Discover Your Dream{" "}
            <span
              style={{
                background: "linear-gradient(135deg, #818CF8, #A78BFA)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Internship
            </span>{" "}
            &amp; <br />
            Launch Your Career
          </h1>

          <p
            style={{
              fontSize: "1.1rem",
              color: "#94A3B8",
              maxWidth: 560,
              margin: "0 auto 40px",
              lineHeight: 1.7,
            }}
          >
            Connect with top companies, apply to curated opportunities, and
            track your journey — all in one place built for students like you.
          </p>

          {/* Search bar */}
          <form
            onSubmit={handleSearch}
            style={{ maxWidth: 560, margin: "0 auto 48px" }}
          >
            <div className="search-bar">
              <span style={{ paddingLeft: 18, color: "#94A3B8", fontSize: "1.1rem" }}>🔍</span>
              <input
                type="text"
                placeholder="Search jobs, internships, companies..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <button type="submit">Search</button>
            </div>
          </form>

          {/* Quick filter pills */}
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            {["React.js", "Python", "Data Science", "UI/UX", "Machine Learning"].map((tag) => (
              <button
                key={tag}
                onClick={() => navigate(`/browse?search=${tag}`)}
                style={{
                  padding: "6px 16px",
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: 99,
                  color: "#CBD5E1",
                  fontSize: "0.82rem",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => (e.target.style.background = "rgba(79,70,229,0.3)")}
                onMouseLeave={(e) => (e.target.style.background = "rgba(255,255,255,0.08)")}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats Section ── */}
      <section style={{ padding: "40px 0", background: "white", borderBottom: "1px solid #E2E8F0" }}>
        <div className="container">
          {loading ? (
            <div className="loading-wrapper" style={{ padding: 40 }}>
              <div className="spinner" />
            </div>
          ) : (
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon indigo">💼</div>
                <div className="stat-number">{stats?.total_jobs || 0}</div>
                <div className="stat-label">Total Jobs</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon mint">🎓</div>
                <div className="stat-number">{stats?.total_internships || 0}</div>
                <div className="stat-label">Internships</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon amber">🏢</div>
                <div className="stat-number">{stats?.total_companies || 0}</div>
                <div className="stat-label">Companies</div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── Featured Opportunities ── */}
      <section className="section" style={{ background: "var(--gray-50)" }}>
        <div className="container">
          <div className="section-header">
            <div>
              <h2 className="section-title">Featured Opportunities</h2>
              <p className="section-subtitle">Handpicked roles from top companies, updated daily</p>
            </div>
            <button className="btn btn-secondary" onClick={() => navigate("/browse")}>
              View All →
            </button>
          </div>

          {loading ? (
            <div className="loading-wrapper">
              <div className="spinner" />
              <p style={{ color: "var(--gray-400)" }}>Loading opportunities...</p>
            </div>
          ) : featured.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🔍</div>
              <h3>No opportunities yet</h3>
              <p>Check back soon or add some from the Admin panel.</p>
            </div>
          ) : (
            <div
              className="opp-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
                gap: 20,
              }}
            >
              {featured.map((opp) => (
                <OpportunityCard key={opp.unique_key || `${opp.source}-${opp.id}`} opportunity={opp} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── CTA Section ── */}
      <section
        style={{
          background: "linear-gradient(135deg, var(--indigo), #7C3AED)",
          padding: "60px 0",
          color: "white",
          textAlign: "center",
        }}
      >
        <div className="container">
          <h2
            style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: "1.8rem",
              fontWeight: 800,
              marginBottom: 12,
            }}
          >
            Ready to take the next step?
          </h2>
          <p style={{ color: "rgba(255,255,255,0.75)", marginBottom: 28, fontSize: "1rem" }}>
            Join thousands of students already using Aspire to land their dream roles.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <button
              className="btn btn-lg"
              style={{ background: "white", color: "var(--indigo)", fontWeight: 700 }}
              onClick={() => navigate("/browse")}
            >
              Browse Opportunities
            </button>
            <button
              className="btn btn-lg btn-ghost"
              style={{ color: "white", borderColor: "rgba(255,255,255,0.4)" }}
              onClick={() => navigate("/dashboard")}
            >
              My Dashboard
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <p>© 2025 <strong>Aspire</strong> — Built for students, by students. 🚀</p>
        </div>
      </footer>
    </div>
  );
}
