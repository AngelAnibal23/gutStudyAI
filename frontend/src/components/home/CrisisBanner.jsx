import './CrisisBanner.css';

export default function CrisisBanner({ alertas, onVerOpciones }) {
  const rojas = alertas.filter(a => a.startsWith('ALERTA ROJA'));
  if (!rojas.length) return null;

  return (
    <div className="crisis-banner">
      <span className="crisis-icon">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
      </span>
      <div className="crisis-content">
        <span className="crisis-label">
          Crisis detectada{rojas.length > 1 ? ` · ${rojas.length} tareas` : ''}
        </span>
        {rojas.map((r, i) => (
          <p key={i} className="crisis-text">{r}</p>
        ))}
      </div>
      <button className="crisis-action" onClick={onVerOpciones}>Ver opciones →</button>
    </div>
  );
}
