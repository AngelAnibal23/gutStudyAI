import './TimelineBlock.css';

function railColor(bloque) {
  if (bloque.tarea_id !== null) return 'lime';
  const act = bloque.actividad.toLowerCase();
  if (act.includes('gym') || act.includes('ejercicio')) return 'blue';
  if (act.includes('dorm') || act.includes('descanso nocturno')) return 'dim';
  return 'muted';
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

export default function TimelineBlock({
  bloque, onToggle, completado,
  timerKey, timer,
  onStartTimer, onPauseTimer, onResumeTimer, onStopTimer,
}) {
  const rail        = railColor(bloque);
  const esTarea     = bloque.tarea_id !== null;
  const activo      = esActivo(bloque.hora_inicio, bloque.hora_fin);
  const isTimerBlock = timer?.key === timerKey;
  const pct = isTimerBlock && timer.total > 0
    ? ((timer.total - timer.remaining) / timer.total) * 100
    : 0;

  return (
    <div className={[
      'tblock',
      completado    ? 'tblock--done'  : '',
      activo        ? 'tblock--active' : '',
      isTimerBlock  ? 'tblock--timer'  : '',
    ].join(' ')}>
      <div className={`tblock-rail tblock-rail--${rail}`} />

      <div className="tblock-time">
        <span className="tblock-hora">{bloque.hora_inicio}</span>
        <span className="tblock-sep">—</span>
        <span className="tblock-hora">{bloque.hora_fin}</span>
      </div>

      <div className="tblock-card">
        {/* Fila principal: actividad + acciones */}
        <div className="tblock-top">
          <div className="tblock-body">
            <div className="tblock-info">
              <span className="tblock-actividad">{bloque.actividad}</span>
              <span className="tblock-dur">{minutosAHoras(bloque.tiempo_asignado)}</span>
            </div>
          </div>

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
                className={`tblock-check ${completado ? 'tblock-check--done' : ''}`}
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

        {/* Timer inline */}
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
