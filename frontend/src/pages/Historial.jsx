import { useState, useEffect } from 'react';
import './Historial.css';

const API = '/api';

const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MESES = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];

function parseFecha(str) {
  const [y, mo, d] = str.split('-').map(Number);
  const date = new Date(y, mo - 1, d);
  return { dow: DIAS[date.getDay()], d, mes: MESES[mo - 1] };
}

function minutosAHoras(mins) {
  if (!mins) return '—';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export default function Historial() {
  const [dias, setDias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    fetch(`${API}/historial`)
      .then(r => r.json())
      .then(data => setDias(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function toggle(id) {
    setExpanded(prev => (prev === id ? null : id));
  }

  return (
    <div className="historial-page">
      <div className="historial-header">
        <h1 className="historial-title">Historial</h1>
        <p className="historial-sub">
          {!loading && dias.length > 0
            ? `${dias.length} día${dias.length !== 1 ? 's' : ''} programados`
            : 'Programaciones anteriores'}
        </p>
      </div>

      {loading ? (
        <div className="he-wrap">
          <p className="he-msg">Cargando…</p>
        </div>
      ) : dias.length === 0 ? (
        <div className="he-wrap he-wrap--empty">
          <div className="he-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="12 8 12 12 14 14"/>
              <path d="M3.05 11a9 9 0 1 1 .5 4m-.5 5v-5h5"/>
            </svg>
          </div>
          <p className="he-title">Sin historial todavía</p>
          <p className="he-desc">Las programaciones generadas aparecerán aquí al día siguiente de haberlas creado.</p>
        </div>
      ) : (
        <div className="historial-list">
          {dias.map(d => {
            const isOpen = expanded === d.id;
            const { dow, d: dayNum, mes } = parseFecha(d.fecha);
            const pct = d.total > 0 ? Math.round((d.completadas / d.total) * 100) : 0;
            const allDone = d.total > 0 && d.completadas === d.total;

            return (
              <div key={d.id} className={`hdia${isOpen ? ' hdia--open' : ''}`}>
                <button className="hdia-header" onClick={() => toggle(d.id)}>
                  <div className="hdia-date">
                    <span className="hdia-dow">{dow}</span>
                    <span className="hdia-dm">{dayNum} {mes}</span>
                  </div>

                  <div className="hdia-center">
                    <div className="hdia-track">
                      <div
                        className={`hdia-fill${allDone ? ' hdia-fill--full' : ''}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  <div className="hdia-right">
                    <span className="hdia-fraction">{d.completadas}/{d.total}</span>
                    <span className={`hdia-pct${allDone ? ' hdia-pct--full' : ''}`}>{pct}%</span>
                    {d.hubo_crisis && (
                      <span className="hdia-crisis-tag">Crisis</span>
                    )}
                  </div>

                  <svg
                    className={`hdia-chevron${isOpen ? ' hdia-chevron--up' : ''}`}
                    width="12" height="7" viewBox="0 0 12 7" fill="none"
                  >
                    <path d="M1 1L6 6L11 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>

                <div className="hdia-tasks">
                  <div className="hdia-tasks-inner">
                    {d.tareas.length === 0 ? (
                      <p className="hdia-tasks-empty">Sin tareas registradas.</p>
                    ) : (
                      d.tareas.map((t, i) => (
                        <div key={i} className={`htarea${t.completada ? ' htarea--done' : ' htarea--missed'}`}>
                          <span className={`htarea-icon${t.completada ? ' htarea-icon--check' : ' htarea-icon--x'}`}>
                            {t.completada ? (
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12"/>
                              </svg>
                            ) : (
                              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18"/>
                                <line x1="6" y1="6" x2="18" y2="18"/>
                              </svg>
                            )}
                          </span>
                          <div className="htarea-body">
                            <span className="htarea-nombre">{t.nombre}</span>
                            <span className="htarea-meta">{t.curso} · {t.tipo}</span>
                            {t.notas && <span className="htarea-notas">{t.notas}</span>}
                          </div>
                          <div className="htarea-right">
                            <span className="htarea-tiempo">{minutosAHoras(t.tiempo_asignado)}</span>
                            {t.fue_postergada && (
                              <span className="htarea-post" title="Fue postergada">↩</span>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
