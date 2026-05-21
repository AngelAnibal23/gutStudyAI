import { useState, useEffect } from 'react';
import './CrisisModal.css';

const OPCIONES = [
  {
    id: 'priorizar_hoy',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
      </svg>
    ),
    titulo: 'Priorizar hoy',
    desc: 'Regenera el día con esta tarea al tope. Sin excusas.',
  },
  {
    id: 'dividir_bloques',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
        <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
      </svg>
    ),
    titulo: 'Dividir en bloques',
    desc: 'Programa 2-3 sesiones cortas en lugar de un bloque largo. Más fácil de ejecutar.',
  },
  {
    id: 'diferir_manana',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
        <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
        <line x1="3" y1="10" x2="21" y2="10"/>
        <line x1="12" y1="14" x2="12" y2="18"/><line x1="10" y1="16" x2="14" y2="16"/>
      </svg>
    ),
    titulo: 'Diferir a mañana',
    desc: 'Acepta que hoy no se puede y comprométete a hacerla mañana primero.',
  },
  {
    id: 'buscar_dia_optimo',
    isAI: true,
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <path d="M12 8v4l3 3"/>
        <path d="M5.2 5.2l1.4 1.4M17.4 5.2l-1.4 1.4M5.2 18.8l1.4-1.4M17.4 18.8l-1.4-1.4"/>
      </svg>
    ),
    titulo: 'Encontrar el día óptimo',
    desc: 'La IA analiza los próximos días, detecta cuál tiene más horas libres antes del deadline y reorganiza el plan.',
  },
  {
    id: 'reconocer',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 6L9 17l-5-5"/>
      </svg>
    ),
    titulo: 'Entendido',
    desc: 'Recibida la alerta. La tengo en mente para el día de hoy.',
  },
];

export default function CrisisModal({ open, onClose, onConfirm, alertas = [] }) {
  const [selected, setSelected]   = useState(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(null);

  const rojas = alertas.filter(a => a.startsWith('ALERTA ROJA'));

  useEffect(() => {
    if (!open) { setSelected(null); setError(null); setLoading(false); return; }
    const handler = (e) => { if (e.key === 'Escape' && !loading) onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose, loading]);

  if (!open) return null;

  async function handleConfirm() {
    if (!selected) { onClose(); return; }
    if (selected === 'reconocer') { onClose(); return; }

    setLoading(true);
    setError(null);
    try {
      await onConfirm(selected);
    } catch (err) {
      setError(err.message || 'Error al procesar la acción');
      setLoading(false);
    }
  }

  const opcionSeleccionada = OPCIONES.find(o => o.id === selected);
  const necesitaIA = selected && selected !== 'reconocer';

  return (
    <>
      <div className="cm-overlay" onClick={!loading ? onClose : undefined} />
      <div className="cm-modal" role="dialog" aria-modal="true">
        <div className="cm-header">
          <div className="cm-header-left">
            <span className="cm-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </span>
            <div>
              <span className="cm-eyebrow">CRISIS DETECTADA</span>
              <h2 className="cm-title">¿Qué hacemos?</h2>
            </div>
          </div>
          <button className="cm-close" onClick={onClose} aria-label="Cerrar" disabled={loading}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="cm-alerts">
          {rojas.map((a, i) => (
            <p key={i} className="cm-alert-text">{a}</p>
          ))}
        </div>

        <div className="cm-options">
          {OPCIONES.map(o => (
            <button
              key={o.id}
              className={`cm-option${selected === o.id ? ' cm-option--selected' : ''}${o.isAI ? ' cm-option--ai' : ''}`}
              onClick={() => !loading && setSelected(o.id)}
              disabled={loading}
            >
              <span className="cm-option-icon">{o.icon}</span>
              <div className="cm-option-body">
                <div className="cm-option-titulo-row">
                  <span className="cm-option-titulo">{o.titulo}</span>
                  {o.isAI && <span className="cm-ai-badge">IA</span>}
                </div>
                <span className="cm-option-desc">{o.desc}</span>
              </div>
              {selected === o.id && (
                <span className="cm-option-check">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="cm-footer">
          {error && <p className="cm-error">{error}</p>}
          <button
            className={`cm-cerrar${loading ? ' cm-cerrar--loading' : ''}`}
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading
              ? (
                <>
                  <span className="cm-spinner" />
                  {opcionSeleccionada?.isAI ? 'La IA está analizando los próximos días…' : 'La IA está reorganizando…'}
                </>
              )
              : necesitaIA ? 'Confirmar y regenerar' : selected ? 'Confirmar' : 'Cerrar'
            }
          </button>
        </div>
      </div>
    </>
  );
}
