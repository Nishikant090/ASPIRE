/**
 * Browse.js - Unified job browse with search and filters
 */

import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { getUnifiedJobs } from "../api";
import OpportunityCard from "../components/OpportunityCard";

export default function Browse() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [activeType, setActiveType] = useState(searchParams.get("type") || "all");
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(searchParams.get("company") || "");

  const fetchJobs = (params = {}) => {
    setLoading(true);
    getUnifiedJobs(params)
      .then((res) => {
        const allJobs = res.data || [];
        setJobs(allJobs);
        const unique = [...new Set(allJobs.map((j) => j.company_name))].sort();
        setCompanies(unique);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const params = {};
    const q = searchParams.get("search");
    const type = searchParams.get("type");
    const company = searchParams.get("company");
    if (q) params.search = q;
    if (type && type !== "all") params.type = type;
    if (company) params.company = company;
    fetchJobs(params);
  }, [searchParams]);

  const applyFilters = (overrides = {}) => {
    const params = {
      search: overrides.search ?? search,
      type: overrides.type ?? activeType,
      company: overrides.company ?? selectedCompany,
    };
    const query = {};
    if (params.search) query.search = params.search;
    if (params.type && params.type !== "all") query.type = params.type;
    if (params.company) query.company = params.company;
    setSearchParams(query);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    applyFilters({ search });
  };

  const handleTypeFilter = (type) => {
    setActiveType(type);
    applyFilters({ type });
  };

  const handleCompanyFilter = (company) => {
    setSelectedCompany(company);
    applyFilters({ company });
  };

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div className="container">
          <h1>Browse Opportunities</h1>
          <p>Find the perfect job or internship to launch your career</p>
        </div>
      </div>

      <div className="section" style={{ paddingTop: 32 }}>
        <div className="container">
          <div style={{
            background: "white", borderRadius: "var(--radius-lg)", padding: 24,
            border: "1px solid var(--gray-200)", marginBottom: 28, boxShadow: "var(--shadow-sm)",
          }}>
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

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
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

          <div style={{ marginBottom: 20, color: "var(--gray-500)", fontSize: "0.875rem" }}>
            {!loading && (
              <span>Showing <strong style={{ color: "var(--gray-800)" }}>{jobs.length}</strong> opportunities</span>
            )}
          </div>

          {loading ? (
            <div className="loading-wrapper">
              <div className="spinner" />
              <p style={{ color: "var(--gray-400)" }}>Finding opportunities...</p>
            </div>
          ) : jobs.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🔍</div>
              <h3>No opportunities found</h3>
              <p>Try adjusting your search or filters.</p>
            </div>
          ) : (
            <div className="opp-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 20 }}>
              {jobs.map((job) => (
                <OpportunityCard key={job.unique_key || `${job.source}-${job.id}`} opportunity={job} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
