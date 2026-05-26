import { useState, useEffect } from 'react';
import CursoDrawer from '../components/ui/CursoDrawer';
import HorarioDrawer from '../components/ui/HorarioDrawer';
import { useToast } from '../components/ui/Toast';
import './Configuracion.css';

const API = import.meta.env.VITE_API_URL || '/api';
const DIAS = ['lunes','martes','miercoles','jueves','viernes','sabado','domingo'];
const DIAS_LABEL = ['L','M','X','J','V','S','D'];

function formatHora(t) {
  if (!t) return '—';
  return t.slice(0, 5);
}

function diasDeCurso(c) {
  return (c.curso_dias || []).map(d => d.dia);
}

function diasDeHorario(h) {
  return (h.horario_bloqueado_dias || []).map(d => d.dia);
}

export default function Configuracion() {
  const [cursos, setCursos] = useState([]);
  const [bloqueados, setBloqueados] = useState([]);
  const [loadingCursos, setLoadingCursos] = useState(true);
  const [loadingBloqueados, setLoadingBloqueados] = useState(true);
  const [cursoDrawerOpen, setCursoDrawerOpen] = useState(false);
  const [bloqueDrawerOpen, setBloqueDrawerOpen] = useState(false);
  const [editingCurso, setEditingCurso] = useState(null);
  const [editingBloque, setEditingBloque] = useState(null);
  const [confirmingCurso, setConfirmingCurso] = useState(null);
  const [confirmingBloque, setConfirmingBloque] = useState(null);
  const toast = useToast();

  useEffect(() => {
    fetch(`${API}/cursos`)
      .then(r => r.json())
      .then(data => setCursos(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoadingCursos(false));

    fetch(`${API}/horarios`)
      .then(r => r.json())
      .then(data => setBloqueados(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoadingBloqueados(false));
  }, []);

  async function agregarCurso(form) {
    const res = await fetch(`${API}/cursos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const nuevo = await res.json();
    if (nuevo.error) throw new Error(nuevo.error);
    setCursos(prev => [...prev, nuevo]);
    toast('Curso agregado');
  }

  async function eliminarCurso(id) {
    const res = await fetch(`${API}/cursos/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.ok) {
      setCursos(prev => prev.filter(c => c.id !== id));
      toast('Curso eliminado', 'error');
    }
    setConfirmingCurso(null);
  }

  async function editarCurso(form) {
    const res = await fetch(`${API}/cursos/${editingCurso.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const updated = await res.json();
    if (updated.error) throw new Error(updated.error);
    setCursos(prev => prev.map(c => c.id === editingCurso.id ? updated : c));
    toast('Curso actualizado');
  }

  async function agregarBloque(form) {
    const res = await fetch(`${API}/horarios`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const nuevo = await res.json();
    if (nuevo.error) throw new Error(nuevo.error);
    setBloqueados(prev => [...prev, nuevo]);
    toast('Horario agregado');
  }

  async function editarBloque(form) {
    const res = await fetch(`${API}/horarios/${editingBloque.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const updated = await res.json();
    if (updated.error) throw new Error(updated.error);
    setBloqueados(prev => prev.map(b => b.id === editingBloque.id ? updated : b));
    toast('Horario actualizado');
  }

  async function eliminarBloque(id) {
    const res = await fetch(`${API}/horarios/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.ok) {
      setBloqueados(prev => prev.filter(b => b.id !== id));
      toast('Bloque eliminado', 'error');
    }
    setConfirmingBloque(null);
  }

  return (
    <div className="config-page">
      <div className="config-page-header">
        <h1 className="config-title">Configuración</h1>
        <p className="config-sub">
          {cursos.length} curso{cursos.length !== 1 ? 's' : ''} · {bloqueados.length} bloque{bloqueados.length !== 1 ? 's' : ''} bloqueado{bloqueados.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Cursos */}
      <section className="config-section">
        <div className="section-header">
          <div>
            <h2 className="section-title">Mis cursos</h2>
            <p className="section-sub">Horario académico del ciclo</p>
          </div>
          <button className="btn-add" onClick={() => setCursoDrawerOpen(true)}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Agregar curso
          </button>
        </div>

        {loadingCursos ? (
          <p className="empty-msg">Cargando…</p>
        ) : cursos.length === 0 ? (
          <div className="config-empty">
            <p className="empty-msg">Sin cursos configurados.</p>
            <button className="empty-link" onClick={() => setCursoDrawerOpen(true)}>Agregar el primero →</button>
          </div>
        ) : (
          <div className="items-list">
            {cursos.map(c => {
              const dias = diasDeCurso(c);
              return (
                <div key={c.id} className="config-item">
                  <span className="item-dot item-dot--lime" />
                  <div className="item-main">
                    <span className="item-name">{c.nombre}</span>
                    <span className="item-horario">{formatHora(c.hora_inicio)} — {formatHora(c.hora_fin)}</span>
                  </div>
                  <div className="item-dias">
                    {dias.map(d => (
                      <span key={d} className="dia-tag">{DIAS_LABEL[DIAS.indexOf(d)]}</span>
                    ))}
                  </div>
                  {confirmingCurso === c.id ? (
                    <div className="item-confirm">
                      <span className="item-confirm-text">¿Eliminar?</span>
                      <button className="item-confirm-yes" onClick={() => eliminarCurso(c.id)}>Sí</button>
                      <button className="item-confirm-no" onClick={() => setConfirmingCurso(null)}>No</button>
                    </div>
                  ) : (
                    <div className="item-actions">
                      <button className="item-edit" onClick={() => setEditingCurso(c)} title="Editar">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                      </button>
                      <button className="item-del" onClick={() => setConfirmingCurso(c.id)} title="Eliminar">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Horarios bloqueados */}
      <section className="config-section">
        <div className="section-header">
          <div>
            <h2 className="section-title">Horarios bloqueados</h2>
            <p className="section-sub">Gym, trabajo, tiempo personal</p>
          </div>
          <button className="btn-add" onClick={() => setBloqueDrawerOpen(true)}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Agregar bloque
          </button>
        </div>

        {loadingBloqueados ? (
          <p className="empty-msg">Cargando…</p>
        ) : bloqueados.length === 0 ? (
          <div className="config-empty">
            <p className="empty-msg">Sin horarios bloqueados.</p>
            <button className="empty-link" onClick={() => setBloqueDrawerOpen(true)}>Agregar el primero →</button>
          </div>
        ) : (
          <div className="items-list">
            {bloqueados.map(b => {
              const dias = diasDeHorario(b);
              return (
                <div key={b.id} className="config-item">
                  <span className="item-dot item-dot--blue" />
                  <div className="item-main">
                    <span className="item-name">{b.tipo}</span>
                    <span className="item-horario">{formatHora(b.hora_inicio)} — {formatHora(b.hora_fin)}</span>
                  </div>
                  <div className="item-dias">
                    {dias.map(d => (
                      <span key={d} className="dia-tag dia-tag--blue">{DIAS_LABEL[DIAS.indexOf(d)]}</span>
                    ))}
                  </div>
                  {confirmingBloque === b.id ? (
                    <div className="item-confirm">
                      <span className="item-confirm-text">¿Eliminar?</span>
                      <button className="item-confirm-yes" onClick={() => eliminarBloque(b.id)}>Sí</button>
                      <button className="item-confirm-no" onClick={() => setConfirmingBloque(null)}>No</button>
                    </div>
                  ) : (
                    <div className="item-actions">
                      <button className="item-edit" onClick={() => setEditingBloque(b)} title="Editar">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                      </button>
                      <button className="item-del" onClick={() => setConfirmingBloque(b.id)} title="Eliminar">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <CursoDrawer
        open={cursoDrawerOpen || editingCurso !== null}
        onClose={() => { setCursoDrawerOpen(false); setEditingCurso(null); }}
        onSubmit={editingCurso ? editarCurso : agregarCurso}
        initialValues={editingCurso}
        isEdit={editingCurso !== null}
      />
      <HorarioDrawer
        open={bloqueDrawerOpen || editingBloque !== null}
        onClose={() => { setBloqueDrawerOpen(false); setEditingBloque(null); }}
        onSubmit={editingBloque ? editarBloque : agregarBloque}
        initialValues={editingBloque}
        isEdit={editingBloque !== null}
      />
    </div>
  );
}
