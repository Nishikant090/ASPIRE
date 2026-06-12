/**
 * OpportunityCard.js - Reusable card for displaying a job/internship
 * Used on home page (featured) and browse page
 */

import { useNavigate } from "react-router-dom";

export default function OpportunityCard({ opportunity }) {
  const navigate = useNavigate();
  const skills = opportunity.skills.split(",").map((s) => s.trim());

  const handleClick = () => navigate(`/opportunity/${opportunity.id}`);

  return (
    <div className="opp-card" onClick={handleClick}>
      <div className="opp-card-header">
        {/* Company logo placeholder */}
        <div className="opp-card-logo">{opportunity.logo || "🏢"}</div>
        {/* Job or Internship badge */}
        <span className={`opp-type-badge badge-${opportunity.type}`}>
          {opportunity.type}
        </span>
      </div>

      {/* Title & Company */}
      <h3 className="opp-title">{opportunity.title}</h3>
      <p className="opp-company">{opportunity.company}</p>

      {/* Location & Stipend */}
      <div className="opp-meta">
        <span>📍 {opportunity.location}</span>
        <span>💰 {opportunity.stipend}</span>
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
