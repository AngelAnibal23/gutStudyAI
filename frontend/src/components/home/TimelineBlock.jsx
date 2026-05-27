import './TimelineBlock.css';

const CATEGORY = {
  estudio:   { label: 'ESTUDIO',    rail: 'lime'  },
  clases:    { label: 'CLASES',     rail: 'blue'  },
  ejercicio: { label: 'EJERCICIO',  rail: 'blue'  },
  comida:    { label: 'COMIDA',     rail: 'muted' },
  pausa:     { label: 'PAUSA',      rail: 'dim'   },
  sueño:     { label: 'SUEÑO',      rail: 'dim'   },
  libre:     { label: 'LIBRE',      rail: 'muted' },
  rutina:    { label: 'RUTINA',     rail: 'muted' },
};

function getCategory(bloque) {
  if (bloque.tarea_id !== null) return 'estudio';
  const act = bloque.actividad.toLowerCase();
  if (act.includes('pausa')) return 'pausa';
  if (act.includes('dorm') || act.includes('nocturno')) return 'sueño';
  if (['desayuno', 'almuerzo', 'cena', 'comida'].some(w => act.includes(w))) return 'comida';
  if (['gym', 'ejercicio', 'deporte', 'entrena'].some(w => act.includes(w))) return 'ejercicio';
  if (['universidad', 'clase', 'laboratorio', 'seminario'].some(w => act.includes(w))) return 'clases';
  if (['libre', 'ocio'].some(w => act.includes(w))) return 'libre';
  return 'rutina';
}

function minutosAHoras(mins) {
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function fmtTimer(secs) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function esActivo(horaInicio, horaFin) {
  const ahora = new Date();
  const [h1, m1] = horaInicio.split(':').map(Number);
  const [h2, m2] = horaFin.split(':').map(Number);
  const totalMins = ahora.getHours() * 60 + ahora.getMinutes();
  return totalMins >= h1 * 60 + m1 && totalMins < h2 * 60 + m2;
}

const PX_PER_MIN = 1.2;
const MIN_H      = 72;
const MAX_H      = 320;
const COMPACT_H  = 44;

export default function TimelineBlock({
  bloque, onToggle, completado,
  timerKey, timer,
  onStartTimer, onPauseTimer, onResumeTimer, onStopTimer,
}) {
  const cat          = getCategory(bloque);
  const { label: catLabel, rail } = CATEGORY[cat];
  const esTarea      = bloque.tarea_id !== null;
  const activo       = esActivo(bloque.hora_inicio, bloque.hora_fin);
  const isTimerBlock = timer?.key === timerKey;
  const isCompact    = bloque.tiempo_asignado <= 20;
  const minH         = isCompact
    ? COMPACT_H
    : Math.min(Math.max(MIN_H, bloque.tiempo_asignado * PX_PER_MIN), MAX_H);

  const pct = isTimerBlock && timer.total > 0
    ? ((timer.total - timer.remaining) / timer.total) * 100
    : 0;

  return (
    <div
      className={[
        'tblock',
        `tblock--${cat}`,
        completado   ? 'tblock--done'   : '',
        activo       ? 'tblock--active'  : '',
        isTimerBlock ? 'tblock--timer'   : '',
        isCompact    ? 'tblock--compact' : '',
      ].filter(Boolean).join(' ')}
      style={{ minHeight: `${minH}px` }}
    >
      <div className={`tblock-rail tblock-rail--${rail}`} />

      <div className="tblock-card">
        {isCompact ? (
          <div className="tblock-compact-row">
            <span className="tblock-hora-inicio">{bloque.hora_inicio}</span>
            <span className="tblock-actividad">{bloque.actividad}</span>
            <span className="tblock-dur">{minutosAHoras(bloque.tiempo_asignado)}</span>
            {esTarea && (
              <button
                className={`tblock-check${completado ? ' tblock-check--done' : ''}`}
                onClick={onToggle}
              >
                {completado && (
                  <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="#06080A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </button>
            )}
          </div>
        ) : (
          <div className="tblock-card-inner">
            <div className="tblock-top">
              <span className="tblock-hora-inicio">{bloque.hora_inicio}</span>
              <span className={`tblock-cat-pill tblock-cat-pill--${rail}`}>{catLabel}</span>
            </div>

            <span className="tblock-actividad">{bloque.actividad}</span>

            <div className="tblock-bottom">
              <span className="tblock-dur">{minutosAHoras(bloque.tiempo_asignado)}</span>
              {esTarea && (
                <div className="tblock-actions">
                  {!isTimerBlock && !completado && (
                    <button
                      className="tblock-start"
                      onClick={() => onStartTimer(timerKey, bloque.tiempo_asignado)}
                      title="Iniciar temporizador"
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="5 3 19 12 5 21 5 3"/>
                      </svg>
                    </button>
                  )}
                  <button
                    className={`tblock-check${completado ? ' tblock-check--done' : ''}`}
                    onClick={onToggle}
                  >
                    {completado && (
                      <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6l3 3 5-5" stroke="#06080A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {isTimerBlock && (
          <div className="tblock-timer">
            <div className="tblock-timer-track">
              <div className="tblock-timer-fill" style={{ width: `${pct}%` }} />
            </div>
            <div className="tblock-timer-row">
              <span className={`tblock-timer-mm${timer.remaining === 0 ? ' tblock-timer-mm--done' : ''}`}>
                {fmtTimer(timer.remaining)}
              </span>
              <div className="tblock-timer-btns">
                <button
                  className="timer-btn"
                  onClick={timer.running ? onPauseTimer : onResumeTimer}
                  title={timer.running ? 'Pausar' : 'Reanudar'}
                >
                  {timer.running ? (
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="6" y="4" width="4" height="16"/>
                      <rect x="14" y="4" width="4" height="16"/>
                    </svg>
                  ) : (
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="5 3 19 12 5 21 5 3"/>
                    </svg>
                  )}
                </button>
                <button
                  className="timer-btn timer-btn--stop"
                  onClick={onStopTimer}
                  title="Detener"
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
