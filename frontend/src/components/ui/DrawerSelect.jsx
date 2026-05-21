import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import './DrawerSelect.css';

export default function DrawerSelect({ value, onChange, options, placeholder = 'Selecciona...' }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });
  const triggerRef = useRef(null);

  function openDropdown() {
    if (triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 4, left: r.left, width: r.width });
    }
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;
    function onOutside(e) {
      if (!triggerRef.current?.contains(e.target)) setOpen(false);
    }
    window.addEventListener('mousedown', onOutside);
    return () => window.removeEventListener('mousedown', onOutside);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e) { if (e.key === 'Escape') setOpen(false); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const selected = options.find(o => o.value === value);

  return (
    <div className="dsel-wrap">
      <button
        ref={triggerRef}
        type="button"
        className={`dsel-trigger ${open ? 'dsel-trigger--open' : ''} ${!selected ? 'dsel-trigger--empty' : ''}`}
        onClick={() => open ? setOpen(false) : openDropdown()}
      >
        <span className="dsel-label">{selected ? selected.label : placeholder}</span>
        <svg
          className={`dsel-chevron ${open ? 'dsel-chevron--up' : ''}`}
          width="10" height="6" viewBox="0 0 10 6" fill="none"
        >
          <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && createPortal(
        <div
          className="dsel-dropdown"
          style={{ top: pos.top, left: pos.left, width: pos.width }}
        >
          {options.map(opt => {
            const active = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                className={`dsel-option ${active ? 'dsel-option--active' : ''}`}
                onMouseDown={() => { onChange(opt.value); setOpen(false); }}
              >
                <span className="dsel-option-check">
                  {active && (
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  )}
                </span>
                {opt.label}
              </button>
            );
          })}
        </div>,
        document.body
      )}
    </div>
  );
}
