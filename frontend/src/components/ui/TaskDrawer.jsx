import { useState, useEffect } from 'react';
import DrawerSelect from './DrawerSelect';
import './TaskDrawer.css';

const TIPOS = [
  { value: 'tarea',      label: 'Tarea' },
  { value: 'exposicion', label: 'Exposición' },
  { value: 'proyecto',   label: 'Proyecto' },
  { value: 'examen',     label: 'Examen' },
];

const DIF_LABEL = ['', 'Muy fácil', 'Fácil', 'Normal', 'Difícil', 'Muy difícil'];
const EMPTY = { nombre: '', curso_id: '', tipo: 'tarea', fecha_entrega: '', dificultad: 3, tiempo_estimado: 60, notas: '' };

function toFormValues(tarea) {
  if (!tarea) return EMPTY;
  return {
    nombre:          tarea.nombre         ?? '',
    curso_id:        tarea.curso_id       ?? '',
    tipo:            tarea.tipo           ?? 'tarea',
    fecha_entrega:   tarea.fecha_entrega  ?? '',
    dificultad:      tarea.dificultad     ?? 3,
    tiempo_estimado: tarea.tiempo_estimado ?? 60,
    notas:           tarea.notas          ?? '',
  };
}

export default function TaskDrawer({ open, onClose, onSubmit, cursos = [], initialValues = null, isEdit = false }) {
  const [form, setForm]           = useState(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  useEffect(() => {
    if (open) {
      setForm(toFormValues(initialValues));
      setSubmitError(null);
    }
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
    if (!form.nombre || !form.fecha_entrega || !form.curso_id) return;
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
      <div
        className={`drawer-overlay ${open ? 'drawer-overlay--open' : ''}`}
        onClick={onClose}
      />
      <aside className={`task-drawer ${open ? 'task-drawer--open' : ''}`} role="dialog" aria-modal="true">
        <div className="drawer-header">
          <span className="drawer-eyebrow">{isEdit ? 'EDITAR TAREA' : 'NUEVA TAREA'}</span>
          <button className="drawer-close" onClick={onClose} aria-label="Cerrar">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <form className="drawer-form" onSubmit={handleSubmit}>
          <div className="drawer-field">
            <label className="drawer-label">Nombre</label>
            <input
              className="drawer-input"
              placeholder="Ej: Informe de compiladores"
              value={form.nombre}
              onChange={e => set('nombre', e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="drawer-field">
            <label className="drawer-label">Curso</label>
            <DrawerSelect
              value={form.curso_id}
              onChange={v => set('curso_id', v)}
              options={cursos.map(c => ({ value: c.id, label: c.nombre }))}
              placeholder="Selecciona un curso"
            />
          </div>

          <div className="drawer-row">
            <div className="drawer-field">
              <label className="drawer-label">Tipo</label>
              <DrawerSelect
                value={form.tipo}
                onChange={v => set('tipo', v)}
                options={TIPOS}
              />
            </div>
            <div className="drawer-field">
              <label className="drawer-label">Fecha de entrega</label>
              <input
                className="drawer-input"
                type="date"
                value={form.fecha_entrega}
                onChange={e => set('fecha_entrega', e.target.value)}
                required
              />
            </div>
          </div>

          <div className="drawer-field">
            <label className="drawer-label">Dificultad</label>
            <div className="dif-picker">
              {[1, 2, 3, 4, 5].map(n => (
                <button
                  key={n}
                  type="button"
                  className={`dif-dot ${form.dificultad >= n ? 'dif-dot--active' : ''}`}
                  onClick={() => set('dificultad', n)}
                />
              ))}
              <span className="dif-label">{DIF_LABEL[form.dificultad]}</span>
            </div>
          </div>

          <div className="drawer-field">
            <label className="drawer-label">Tiempo estimado</label>
            <div className="tiempo-wrap">
              <input
                className="drawer-input"
                type="number"
                min={15}
                step={15}
                value={form.tiempo_estimado}
                onChange={e => set('tiempo_estimado', parseInt(e.target.value) || 15)}
              />
              <span className="tiempo-suffix">min</span>
            </div>
          </div>

          <div className="drawer-field">
            <label className="drawer-label">Notas <span className="drawer-label-opt">(opcional)</span></label>
            <textarea
              className="drawer-input drawer-textarea"
              placeholder="Contexto, instrucciones, recursos…"
              value={form.notas}
              onChange={e => set('notas', e.target.value)}
              rows={3}
            />
          </div>

          {submitError && (
            <p className="drawer-error">{submitError}</p>
          )}

          <div className="drawer-footer">
            <button type="button" className="drawer-cancel" onClick={onClose} disabled={submitting}>
              Cancelar
            </button>
            <button type="submit" className="drawer-submit" disabled={submitting}>
              {submitting ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Guardar tarea'}
            </button>
          </div>
        </form>
      </aside>
    </>
  );
}
