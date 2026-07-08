/**
 * LoadingSkeleton - Placeholder loading UI
 */

export default function LoadingSkeleton({ rows = 3 }) {
  return (
    <div className="skeleton-wrap">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton-row" style={{ width: i === rows - 1 ? "70%" : "100%" }} />
      ))}
    </div>
  );
}

export function PageLoader({ message = "Loading..." }) {
  return (
    <div className="loading-wrapper" style={{ paddingTop: 120 }}>
      <div className="spinner" />
      <p style={{ color: "var(--gray-400)" }}>{message}</p>
    </div>
  );
}
