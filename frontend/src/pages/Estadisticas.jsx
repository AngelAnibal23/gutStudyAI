import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './Estadisticas.css';

const API = '/api';

function heatLevel(completadas) {
  if (completadas === 0) return 0;
  if (completadas === 1) return 1;
  if (completadas === 2) return 2;
  return 3;
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function Estadisticas() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const today = todayStr();

  useEffect(() => {
    fetch(`${API}/estadisticas`)
      .then(r => r.json())
      .then(data => setStats(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="stats-page">
      <div className="stats-header">
        <div>
          <h1 className="stats-title">Estadísticas</h1>
          <p className="stats-sub">últimos 7 días · datos reales</p>
        </div>
      </div>

      {loading ? (
        <div className="stats-placeholder">
          <p className="stats-placeholder__text">Cargando datos…</p>
        </div>
      ) : !stats ? (
        <div className="stats-placeholder">
          <p className="stats-placeholder__text">No se pudieron cargar las estadísticas.</p>
        </div>
      ) : stats.totalProgramadasSemana === 0 && stats.racha === 0 && stats.totalHoras === 0 ? (
        <div className="stats-empty">
          <div className="stats-empty__icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="20" x2="18" y2="10"/>
              <line x1="12" y1="20" x2="12" y2="4"/>
              <line x1="6" y1="20" x2="6" y2="14"/>
            </svg>
          </div>
          <p className="stats-empty__title">Sin actividad todavía</p>
          <p className="stats-empty__desc">Genera tu primer día desde Inicio para empezar a registrar tu progreso aquí.</p>
          <Link to="/" className="stats-empty__cta">Ir al inicio →</Link>
        </div>
      ) : (
        <>
          <div className="stat-cards">
            {/* Racha */}
            <div className="stat-card stat-card--fire">
              <div className="stat-card__top">
                <span className="stat-card__icon-wrap stat-card__icon-wrap--fire">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
                  </svg>
                </span>
                <span className="stat-card__label">Racha activa</span>
              </div>
              <div className="stat-card__metric">
                <span className="stat-card__value">{stats.racha}</span>
                <span className="stat-card__unit">días</span>
              </div>
              <span className="stat-card__foot">
                {stats.mejorRacha > 0
                  ? stats.racha === stats.mejorRacha && stats.racha > 0
                    ? '¡Es tu mejor racha!'
                    : `Mejor: ${stats.mejorRacha} días`
                  : 'Completa tareas para iniciar'}
              </span>
            </div>

            {/* Tasa de completado */}
            <div className="stat-card stat-card--lime">
              <div className="stat-card__top">
                <span className="stat-card__icon-wrap stat-card__icon-wrap--lime">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </span>
                <span className="stat-card__label">Completado</span>
              </div>
              <div className="stat-card__metric">
                <span className="stat-card__value">{stats.tasaCompletado}</span>
                <span className="stat-card__unit">%</span>
              </div>
              <span className="stat-card__foot">
                {stats.totalProgramadasSemana > 0
                  ? `${stats.totalCompletadasSemana} de ${stats.totalProgramadasSemana} tareas`
                  : 'Sin tareas programadas'}
              </span>
              {stats.totalProgramadasSemana > 0 && (
                <div className="stat-card__bar">
                  <div
                    className="stat-card__bar-fill"
                    style={{ width: `${stats.tasaCompletado}%` }}
                  />
                </div>
              )}
            </div>

            {/* Horas de estudio */}
            <div className="stat-card stat-card--blue">
              <div className="stat-card__top">
                <span className="stat-card__icon-wrap stat-card__icon-wrap--blue">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12 6 12 12 16 14"/>
                  </svg>
                </span>
                <span className="stat-card__label">Horas de estudio</span>
              </div>
              <div className="stat-card__metric">
                <span className="stat-card__value">{stats.totalHoras}</span>
                <span className="stat-card__unit">h</span>
              </div>
              <span className="stat-card__foot">esta semana</span>
            </div>
          </div>

          {/* Week heatmap */}
          <div className="heatmap-section">
            <span className="heatmap-section__title">Actividad diaria</span>
            <div className="heatmap-row">
              {stats.porDia.map(d => (
                <div
                  key={d.fecha}
                  className={`hcell heat-${heatLevel(d.completadas)}${d.fecha === today ? ' hcell--today' : ''}`}
                >
                  <span className="hcell__day">{d.dia}</span>
                  <div className="hcell__square">
                    {d.completadas > 0 && (
                      <span className="hcell__count">{d.completadas}</span>
                    )}
                  </div>
                  <span className="hcell__sub">
                    {d.programadas > 0 ? `${d.completadas}/${d.programadas}` : '—'}
                  </span>
                </div>
              ))}
            </div>

            <div className="heatmap-legend">
              <span className="heatmap-legend__item">
                <span className="heatmap-legend__dot heat-0" />
                Sin actividad
              </span>
              <span className="heatmap-legend__item">
                <span className="heatmap-legend__dot heat-1" />
                1 tarea
              </span>
              <span className="heatmap-legend__item">
                <span className="heatmap-legend__dot heat-2" />
                2 tareas
              </span>
              <span className="heatmap-legend__item">
                <span className="heatmap-legend__dot heat-3" />
                3+
              </span>
            </div>
          </div>

          {stats.porCurso?.length > 0 && (
            <div className="cursos-section">
              <span className="cursos-section__title">Por curso</span>
              <div className="cursos-list">
                {stats.porCurso.map(c => (
                  <div key={c.nombre} className="ccurso">
                    <div className="ccurso__header">
                      <span className="ccurso__nombre">{c.nombre}</span>
                      <div className="ccurso__meta">
                        <span className="ccurso__horas">{c.horas}h</span>
                        <span className={`ccurso__tasa${c.tasa === 100 ? ' ccurso__tasa--full' : ''}`}>{c.tasa}%</span>
                      </div>
                    </div>
                    <div className="ccurso__track">
                      <div className="ccurso__fill" style={{ width: `${c.tasa}%` }} />
                    </div>
                    <span className="ccurso__sub">{c.completadas}/{c.programadas} tareas completadas</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
