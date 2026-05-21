import { useState, useEffect } from 'react';
import DiaToggle from './DiaToggle';
import './TaskDrawer.css';

const EMPTY = { tipo: '', hora_inicio: '', hora_fin: '', dias: [] };

function toFormValues(bloque) {
  if (!bloque) return EMPTY;
  return {
    tipo:        bloque.tipo        ?? '',
    hora_inicio: (bloque.hora_inicio ?? '').slice(0, 5),
    hora_fin:    (bloque.hora_fin    ?? '').slice(0, 5),
    dias:        (bloque.horario_bloqueado_dias || []).map(d => d.dia),
  };
}

export default function HorarioDrawer({ open, onClose, onSubmit, initialValues = null, isEdit = false }) {
  const [form, setForm]               = useState(EMPTY);
  const [submitting, setSubmitting]   = useState(false);
  const [submitError, setSubmitError] = useState(null);

  useEffect(() => {
    if (open) { setForm(toFormValues(initialValues)); setSubmitError(null); }
  }, [open, initialValues]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  function set(key, value) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.tipo || !form.hora_inicio || !form.hora_fin || !form.dias.length) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await onSubmit(form);
      onClose();
    } catch (err) {
      setSubmitError(err.message || 'Error al guardar');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className={`drawer-overlay ${open ? 'drawer-overlay--open' : ''}`} onClick={onClose} />
      <aside className={`task-drawer ${open ? 'task-drawer--open' : ''}`} role="dialog" aria-modal="true">
        <div className="drawer-header">
          <span className="drawer-eyebrow">{isEdit ? 'EDITAR BLOQUE' : 'NUEVO BLOQUE'}</span>
          <button className="drawer-close" onClick={onClose} aria-label="Cerrar">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <form className="drawer-form" onSubmit={handleSubmit}>
          <div className="drawer-field">
            <label className="drawer-label">Actividad</label>
            <input
              className="drawer-input"
              placeholder="Ej: Gym, Trabajo, Almuerzo"
              value={form.tipo}
              onChange={e => set('tipo', e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="drawer-row">
            <div className="drawer-field">
              <label className="drawer-label">Hora inicio</label>
              <input
                className="drawer-input"
                type="time"
                value={form.hora_inicio}
                onChange={e => set('hora_inicio', e.target.value)}
                required
              />
            </div>
            <div className="drawer-field">
              <label className="drawer-label">Hora fin</label>
              <input
                className="drawer-input"
                type="time"
                value={form.hora_fin}
                onChange={e => set('hora_fin', e.target.value)}
                required
              />
            </div>
          </div>

          <div className="drawer-field">
            <label className="drawer-label">Días</label>
            <DiaToggle dias={form.dias} onChange={dias => set('dias', dias)} />
            {form.dias.length === 0 && (
              <span className="drawer-hint">Selecciona al menos un día</span>
            )}
          </div>

          {submitError && <p className="drawer-error">{submitError}</p>}

          <div className="drawer-footer">
            <button type="button" className="drawer-cancel" onClick={onClose} disabled={submitting}>Cancelar</button>
            <button type="submit" className="drawer-submit" disabled={submitting}>
              {submitting ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Guardar bloque'}
            </button>
          </div>
        </form>
      </aside>
    </>
  );
}
