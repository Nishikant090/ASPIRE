/**
 * Browse.js - Browse all jobs and internships
 * Features: search, type filters, company filter, grid display
 */

import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { getOpportunities } from "../api";
import OpportunityCard from "../components/OpportunityCard";

export default function Browse() {
  const [searchParams] = useSearchParams();
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [activeType, setActiveType] = useState("all");
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState("");

  // Fetch opportunities whenever filters change
  const fetchOpportunities = (params = {}) => {
    setLoading(true);
    getOpportunities(params)
      .then((res) => {
        setOpportunities(res.data);
        // Extract unique companies for the dropdown
        const unique = [...new Set(res.data.map((o) => o.company))].sort();
        setCompanies(unique);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  // Initial load with URL search param
  useEffect(() => {
    fetchOpportunities({ search: searchParams.get("search") || "" });
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    const params = { search };
    if (activeType !== "all") params.type = activeType;
    if (selectedCompany) params.company = selectedCompany;
    fetchOpportunities(params);
  };

  const handleTypeFilter = (type) => {
    setActiveType(type);
    const params = { search };
    if (type !== "all") params.type = type;
    if (selectedCompany) params.company = selectedCompany;
    fetchOpportunities(params);
  };

  const handleCompanyFilter = (company) => {
    setSelectedCompany(company);
    const params = { search };
    if (activeType !== "all") params.type = activeType;
    if (company) params.company = company;
    fetchOpportunities(params);
  };

  return (
    <div className="page-wrapper">
      {/* Page Header */}
      <div className="page-header">
        <div className="container">
          <h1>Browse Opportunities</h1>
          <p>Find the perfect job or internship to launch your career</p>
        </div>
      </div>

      <div className="section" style={{ paddingTop: 32 }}>
        <div className="container">
          {/* Search & Filters */}
          <div
            style={{
              background: "white",
              borderRadius: "var(--radius-lg)",
              padding: 24,
              border: "1px solid var(--gray-200)",
              marginBottom: 28,
              boxShadow: "var(--shadow-sm)",
            }}
          >
            {/* Search bar */}
            <form onSubmit={handleSearch} style={{ marginBottom: 20 }}>
              <div className="search-bar">
                <span style={{ paddingLeft: 18, color: "#94A3B8" }}>🔍</span>
                <input
                  type="text"
                  placeholder="Search by title, skill, or keyword..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <button type="submit">Search</button>
              </div>
            </form>

            {/* Filters row */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 12,
              }}
            >
              {/* Type filter */}
              <div className="filter-bar">
                <span style={{ fontSize: "0.83rem", color: "var(--gray-500)", fontWeight: 600 }}>Type:</span>
                {["all", "job", "internship"].map((type) => (
                  <button
                    key={type}
                    className={`filter-btn ${activeType === type ? "active" : ""}`}
                    onClick={() => handleTypeFilter(type)}
                  >
                    {type === "all" ? "All" : type.charAt(0).toUpperCase() + type.slice(1) + "s"}
                  </button>
                ))}
              </div>

              {/* Company filter */}
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: "0.83rem", color: "var(--gray-500)", fontWeight: 600 }}>Company:</span>
                <select
                  className="form-select"
                  style={{ width: "auto", padding: "6px 12px" }}
                  value={selectedCompany}
                  onChange={(e) => handleCompanyFilter(e.target.value)}
                >
                  <option value="">All Companies</option>
                  {companies.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Results count */}
          <div style={{ marginBottom: 20, color: "var(--gray-500)", fontSize: "0.875rem" }}>
            {!loading && (
              <span>
                Showing <strong style={{ color: "var(--gray-800)" }}>{opportunities.length}</strong> opportunities
              </span>
            )}
          </div>

          {/* Opportunities Grid */}
          {loading ? (
            <div className="loading-wrapper">
              <div className="spinner" />
              <p style={{ color: "var(--gray-400)" }}>Finding opportunities...</p>
            </div>
          ) : opportunities.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🔍</div>
              <h3>No opportunities found</h3>
              <p>Try adjusting your search or filters to find what you're looking for.</p>
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
              {opportunities.map((opp) => (
                <OpportunityCard key={opp.id} opportunity={opp} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
