import { useState, useEffect, useCallback } from 'react';
import Badge from '../components/ui/Badge';
import TaskDrawer from '../components/ui/TaskDrawer';
import SuccessModal from '../components/ui/SuccessModal';
import ImportModal from '../components/ui/ImportModal';
import DrawerSelect from '../components/ui/DrawerSelect';
import { useToast } from '../components/ui/Toast';
import './Tareas.css';

const API = import.meta.env.VITE_API_URL || '/api';

const FILTROS = [
  { key: 'todas',      label: 'Todas' },
  { key: 'pendiente',  label: 'Pendiente' },
  { key: 'en_riesgo',  label: 'En riesgo' },
  { key: 'vencida',    label: 'Vencida' },
  { key: 'crisis',     label: 'Crisis' },
  { key: 'completada', label: 'Completada' },
];

const MESES = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];

function formatFecha(str) {
  if (!str) return '—';
  const [, mo, d] = str.split('-');
  return `${parseInt(d)} ${MESES[parseInt(mo) - 1]}`;
}

function minutosAHoras(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function estadoVariant(t) {
  if (t.estado === 'completada') return 'completada';
  if (t.veces_postergada >= 3) return 'crisis';
  const dias = Math.ceil((new Date(t.fecha_entrega + 'T12:00:00') - new Date()) / 86400000);
  if (dias < 0)  return 'vencida';
  if (dias <= 2) return 'en_riesgo';
  return 'pendiente';
}

function diasLabel(str) {
  const dias = Math.ceil((new Date(str + 'T12:00:00') - new Date()) / 86400000);
  if (dias < 0) return 'Vencida';
  if (dias === 0) return 'Hoy';
  if (dias === 1) return 'Mañana';
  return null;
}

export default function Tareas() {
  const [tareas, setTareas] = useState([]);
  const [cursos, setCursos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState('todas');
  const [filtroCurso, setFiltroCurso] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingTarea, setEditingTarea] = useState(null);
  const [confirmingId, setConfirmingId] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [mostrarCompletadas, setMostrarCompletadas] = useState(false);
  const [successModal, setSuccessModal] = useState({ show: false, title: '', desc: '' });
  const [importOpen, setImportOpen] = useState(false);
  const toast = useToast();

  const closeSuccess = useCallback(() => setSuccessModal(s => ({ ...s, show: false })), []);

  async function handleImportSuccess(count) {
    const [tareasData] = await Promise.all([fetch(`${API}/tareas`).then(r => r.json())]);
    if (Array.isArray(tareasData)) setTareas(tareasData);
    setSuccessModal({ show: true, title: '¡Importación completada!', desc: `${count} tarea${count !== 1 ? 's' : ''} añadida${count !== 1 ? 's' : ''} correctamente.` });
  }

  useEffect(() => {
    Promise.all([
      fetch(`${API}/tareas`).then(r => r.json()),
      fetch(`${API}/cursos`).then(r => r.json()),
    ]).then(([tareasData, cursosData]) => {
      setTareas(Array.isArray(tareasData) ? tareasData : []);
      setCursos(Array.isArray(cursosData) ? cursosData : []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  async function agregarTarea(form) {
    const res = await fetch(`${API}/tareas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const nueva = await res.json();
    if (nueva.error) throw new Error(nueva.error);
    setTareas(prev => [...prev, nueva]);
    setSuccessModal({ show: true, title: '¡Tarea guardada!', desc: `"${nueva.nombre}" se añadió correctamente a tu lista.` });
  }

  async function editarTarea(form) {
    const res = await fetch(`${API}/tareas/${editingTarea.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const updated = await res.json();
    if (updated.error) throw new Error(updated.error);
    setTareas(prev => prev.map(t => t.id === editingTarea.id ? updated : t));
    setSuccessModal({ show: true, title: '¡Tarea actualizada!', desc: `"${updated.nombre}" se modificó correctamente.` });
  }

  async function toggleEstado(id, estadoActual) {
    const nuevoEstado = estadoActual === 'completada' ? 'pendiente' : 'completada';
    const res = await fetch(`${API}/tareas/${id}/estado`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado: nuevoEstado }),
    });
    const updated = await res.json();
    if (!updated.error) setTareas(prev => prev.map(t => t.id === id ? updated : t));
  }

  async function eliminarTarea(id) {
    const res = await fetch(`${API}/tareas/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.ok) {
      setTareas(prev => prev.filter(t => t.id !== id));
      toast('Tarea eliminada', 'error');
    }
    setConfirmingId(null);
  }

  const tareasFiltradas = tareas.filter(t => {
    if (filtroEstado !== 'todas' && estadoVariant(t) !== filtroEstado) return false;
    if (filtroCurso && t.curso_id !== parseInt(filtroCurso)) return false;
    if (filtroEstado === 'todas' && !mostrarCompletadas && t.estado === 'completada') return false;
    if (busqueda && !t.nombre.toLowerCase().includes(busqueda.toLowerCase())) return false;
    return true;
  });

  const nCompletadasOcultas = filtroEstado === 'todas' && !mostrarCompletadas
    ? tareas.filter(t => t.estado === 'completada' && (!filtroCurso || t.curso_id === parseInt(filtroCurso))).length
    : 0;

  const counts = FILTROS.reduce((acc, f) => {
    acc[f.key] = f.key === 'todas'
      ? tareas.length
      : tareas.filter(t => estadoVariant(t) === f.key).length;
    return acc;
  }, {});

  return (
    <div className="tareas-page">
      <div className="tareas-header">
        <div>
          <h1 className="tareas-title">Mis tareas</h1>
          <p className="tareas-sub">{tareas.length} tarea{tareas.length !== 1 ? 's' : ''} en total</p>
        </div>
        <div className="header-actions">
          <button className="btn-import" onClick={() => setImportOpen(true)}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Importar CSV
          </button>
          <button className="btn-new" onClick={() => setDrawerOpen(true)}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Nueva tarea
          </button>
        </div>
      </div>

      <div className="filtros-bar">
        <div className="filtros-pills">
          {FILTROS.map(f => (
            <button
              key={f.key}
              className={`filtro-pill ${filtroEstado === f.key ? 'filtro-pill--active' : ''}`}
              onClick={() => setFiltroEstado(f.key)}
            >
              {f.label}
              {counts[f.key] > 0 && (
                <span className="filtro-count">{counts[f.key]}</span>
              )}
            </button>
          ))}
        </div>

        <div className="filtros-right">
          <div className="search-wrap">
            <svg className="search-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              className="search-input"
              type="text"
              placeholder="Buscar tarea…"
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
            />
            {busqueda && (
              <button className="search-clear" onClick={() => setBusqueda('')} aria-label="Limpiar">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            )}
          </div>
          <DrawerSelect
            value={filtroCurso}
            onChange={v => setFiltroCurso(v)}
            options={[
              { value: '', label: 'Todos los cursos' },
              ...cursos.map(c => ({ value: c.id, label: c.nombre })),
            ]}
          />
        </div>
      </div>

      {loading ? (
        <div className="tareas-empty tareas-empty--sm">
          <p className="empty-title">Cargando tareas…</p>
        </div>
      ) : tareas.length === 0 ? (
        <div className="tareas-empty">
          <div className="empty-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
            </svg>
          </div>
          <p className="empty-title">Sin tareas todavía</p>
          <p className="empty-desc">Agrega tus tareas para que el agente las incluya en tu programación diaria</p>
          <button className="empty-cta" onClick={() => setDrawerOpen(true)}>Agregar primera tarea</button>
        </div>
      ) : tareasFiltradas.length === 0 ? (
        <div className="tareas-empty tareas-empty--sm">
          <p className="empty-title">Sin resultados</p>
          <p className="empty-desc">No hay tareas que coincidan con el filtro seleccionado.</p>
        </div>
      ) : (
        <div className="tareas-table-wrap">
        <table className="tareas-table">
          <thead>
            <tr>
              <th>Tarea</th>
              <th>Curso</th>
              <th>Entrega</th>
              <th>Tiempo</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {tareasFiltradas.map(t => {
              const alerta = diasLabel(t.fecha_entrega);
              const variant = estadoVariant(t);
              return (
                <tr key={t.id} className={t.estado === 'completada' ? 'row--done' : ''}>
                  <td className="td-tarea">
                    <span className="tarea-nombre">{t.nombre}</span>
                    <span className="tarea-tipo">{t.tipo}</span>
                  </td>
                  <td className="td-secondary td-curso">{t.cursos?.nombre ?? '—'}</td>
                  <td className="td-fecha">
                    <span className="fecha-valor">{formatFecha(t.fecha_entrega)}</span>
                    {alerta && (
                      <span className={`fecha-alerta ${['en_riesgo','vencida','crisis'].includes(variant) ? 'fecha-alerta--red' : 'fecha-alerta--dim'}`}>
                        {alerta}
                      </span>
                    )}
                  </td>
                  <td className="td-mono">{minutosAHoras(t.tiempo_estimado)}</td>
                  <td><Badge variant={variant} /></td>
                  <td className={`td-actions${confirmingId === t.id ? ' td-actions--confirming' : ''}`}>
                    {confirmingId === t.id ? (
                      <>
                        <span className="confirm-text">¿Eliminar?</span>
                        <button className="action-btn action-btn--confirm" onClick={() => eliminarTarea(t.id)}>Sí</button>
                        <button className="action-btn action-btn--cancel" onClick={() => setConfirmingId(null)}>No</button>
                      </>
                    ) : (
                      <>
                        <button
                          className="action-btn action-btn--edit"
                          onClick={() => setEditingTarea(t)}
                          title="Editar"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </button>
                        <button
                          className="action-btn action-btn--check"
                          onClick={() => toggleEstado(t.id, t.estado)}
                          title={t.estado === 'completada' ? 'Marcar pendiente' : 'Marcar completada'}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                        </button>
                        <button
                          className="action-btn action-btn--del"
                          onClick={() => setConfirmingId(t.id)}
                          title="Eliminar"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"/>
                            <line x1="6" y1="6" x2="18" y2="18"/>
                          </svg>
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {nCompletadasOcultas > 0 && (
          <button className="ver-completadas-btn" onClick={() => setMostrarCompletadas(true)}>
            Ver {nCompletadasOcultas} tarea{nCompletadasOcultas !== 1 ? 's' : ''} completada{nCompletadasOcultas !== 1 ? 's' : ''}
          </button>
        )}
        </div>
      )}

      <TaskDrawer
        open={drawerOpen || editingTarea !== null}
        onClose={() => { setDrawerOpen(false); setEditingTarea(null); }}
        onSubmit={editingTarea ? editarTarea : agregarTarea}
        cursos={cursos}
        initialValues={editingTarea}
        isEdit={editingTarea !== null}
      />

      <ImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        cursos={cursos}
        onSuccess={handleImportSuccess}
      />

      <SuccessModal
        show={successModal.show}
        title={successModal.title}
        desc={successModal.desc}
        onClose={closeSuccess}
      />
    </div>
  );
}
