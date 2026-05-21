import './MetricCard.css';

export default function MetricCard({ label, value, sub, variant }) {
  return (
    <div className={`metric-card${variant ? ` metric-card--${variant}` : ''}`}>
      <span className="metric-label">{label}</span>
      <span className="metric-value">{value}</span>
      {sub && <span className="metric-sub">{sub}</span>}
    </div>
  );
}
