import { useEffect, useRef } from 'react';
import './SuccessModal.css';

export default function SuccessModal({ show, onClose, title = '¡Guardado!', desc = 'La operación se completó correctamente.' }) {
  const barRef = useRef(null);

  useEffect(() => {
    if (!show) return;
    const timer = setTimeout(onClose, 2800);
    return () => clearTimeout(timer);
  }, [show, onClose]);

  if (!show) return null;

  return (
    <div className="smodal-overlay" onClick={onClose}>
      <div className="smodal" onClick={e => e.stopPropagation()}>
        <div className="smodal-icon-wrap">
          <span className="smodal-ring" />
          <svg className="smodal-check" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <p className="smodal-title">{title}</p>
        <p className="smodal-desc">{desc}</p>
        <div className="smodal-bar" ref={barRef} />
      </div>
    </div>
  );
}
