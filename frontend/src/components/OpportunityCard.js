/**
 * OpportunityCard.js - Reusable card for displaying a job/internship
 * Used on home page (featured) and browse page
 */

import { useNavigate } from "react-router-dom";

export default function OpportunityCard({ opportunity }) {
  const navigate = useNavigate();
  
  // Detect if this is a company job (has company_id) or regular opportunity
  const isCompanyJob = !!opportunity.company_id;
  
  // Handle both opportunity and company job data structures
  const type = opportunity.type || (opportunity.employment_type?.replace("_", " ") || "job");
  const company = opportunity.company 
    ? (typeof opportunity.company === 'string' ? opportunity.company : opportunity.company.name) 
    : (opportunity.company_name || "Company");
  const stipend = opportunity.stipend || opportunity.salary || "Competitive";
  const logo = opportunity.logo || "🏢";
  
  const skills = (opportunity.skills || "").split(",").map((s) => s.trim());

  const handleClick = () => {
    if (isCompanyJob) {
      navigate(`/company-job/${opportunity.id}`);
    } else {
      navigate(`/opportunity/${opportunity.id}`);
    }
  };

  return (
    <div className="opp-card" onClick={handleClick}>
      <div className="opp-card-header">
        {/* Company logo placeholder */}
        <div className="opp-card-logo">{logo}</div>
        {/* Job or Internship badge */}
        <span className={`opp-type-badge badge-${type.toLowerCase().replace(" ", "-")}`}>
          {type}
        </span>
      </div>

      {/* Title & Company */}
      <h3 className="opp-title">{opportunity.title}</h3>
      <p className="opp-company">{company}</p>

      {/* Location & Stipend */}
      <div className="opp-meta">
        <span>📍 {opportunity.location}</span>
        <span>💰 {stipend}</span>
      </div>

      {/* Skills */}
      <div className="opp-skills">
        {skills.slice(0, 4).map((skill, i) => (
          <span key={i} className="skill-tag">{skill}</span>
        ))}
        {skills.length > 4 && (
          <span className="skill-tag">+{skills.length - 4} more</span>
        )}
      </div>
    </div>
  );
}
