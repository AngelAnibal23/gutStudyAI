import { useState, useEffect, useRef } from 'react';
import HeroEmpty from '../components/home/HeroEmpty';
import TimelineBlock from '../components/home/TimelineBlock';
import MetricCard from '../components/home/MetricCard';
import CrisisBanner from '../components/home/CrisisBanner';
import CrisisModal from '../components/home/CrisisModal';
import './Home.css';

const API = '/api';
const MESES = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];

function minutosAHoras(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export default function Home({ programacion, setProgramacion, checks, setChecks }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [crisisOpen, setCrisisOpen] = useState(false);
  const [intensidad, setIntensidad] = useState('normal');
  // false by default — optimistic; set to true if risk detected after fetch
  const [hayRiesgo, setHayRiesgo] = useState(false);
  const [timer, setTimer] = useState(null);
  const checksRef    = useRef({});
  const timerDoneRef = useRef(false);

  // On mount: fetch live task state to (a) detect risk tasks and (b) clean up stale
  // ALERTA ROJA entries in the stored programacion when those tasks are now completed.
  useEffect(() => {
    if (!programacion) return;
    const el = document.querySelector('.tblock--active');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [programacion]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetch(`${API}/tareas`)
      .then(r => r.json())
      .then(tareas => {
        if (!Array.isArray(tareas)) return;
        const hoy = new Date();

        const hayCrisis = tareas.some(t => t.veces_postergada >= 3 && t.estado !== 'completada');
        const riesgo = tareas.some(t => {
          if (t.estado === 'completada') return false;
          const dias = Math.ceil((new Date(t.fecha_entrega + 'T12:00:00') - hoy) / 86400000);
          return dias >= 0 && dias <= 2;
        });

        setHayRiesgo(riesgo);

        const alertasActuales = programacion?.alertas || [];
        const tieneRojaGuardada = alertasActuales.some(a => a.startsWith('ALERTA ROJA'));

        if (!hayCrisis && tieneRojaGuardada) {
          // Crisis tasks resolved → remove stale ALERTA ROJA from stored programacion
          setProgramacion({ ...programacion, alertas: alertasActuales.filter(a => !a.startsWith('ALERTA ROJA')) });
        } else if (hayCrisis && !tieneRojaGuardada) {
          // Crisis exists but stored programacion has no alert (day was generated before tasks hit veces_postergada >= 3)
          const crisisTasks = tareas.filter(t => t.veces_postergada >= 3 && t.estado !== 'completada');
          const nuevasAlertas = crisisTasks.map(t => `ALERTA ROJA: ${t.nombre} lleva ${t.veces_postergada} días sin completarse`);
          setProgramacion({ ...programacion, alertas: [...alertasActuales, ...nuevasAlertas] });
        }
      })
      .catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { checksRef.current = checks; }, [checks]);

  useEffect(() => {
    if (!timer?.running) return;
    const id = setInterval(() => {
      setTimer(prev => {
        if (!prev) return null;
        if (prev.remaining <= 1) {
          timerDoneRef.current = true;
          return { ...prev, remaining: 0, running: false };
        }
        return { ...prev, remaining: prev.remaining - 1 };
      });
    }, 1000);
    return () => clearInterval(id);
  }, [timer?.running]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (timer?.running !== false || !timerDoneRef.current) return;
    timerDoneRef.current = false;
    playTimerDone();
    notifyTimerDone(timer.bloque?.actividad);
    if (!checksRef.current[timer.key]) toggleCheck(timer.bloqueIdx, timer.bloque);
    setTimer(null);
  }, [timer?.running]); // eslint-disable-line react-hooks/exhaustive-deps

  function playTimerDone() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      [0, 0.22, 0.44].forEach(offset => {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.value = 880;
        gain.gain.setValueAtTime(0.28, ctx.currentTime + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + offset + 0.18);
        osc.start(ctx.currentTime + offset);
        osc.stop(ctx.currentTime + offset + 0.18);
      });
    } catch {}
  }

  function notifyTimerDone(actividad) {
    if (Notification.permission !== 'granted') return;
    new Notification('gutStudy — ¡Tiempo!', {
      body: actividad ? `Completaste: ${actividad}` : 'Bloque de estudio finalizado',
      icon: '/logo/gutStudyLOGO.jpg',
    });
  }

  function startTimer(key, mins, bloqueIdx, bloque) {
    if (!mins || mins <= 0) return;
    if (Notification.permission === 'default') Notification.requestPermission();
    setTimer({ key, remaining: mins * 60, total: mins * 60, running: true, bloqueIdx, bloque });
  }
  function pauseTimer()  { setTimer(p => p ? { ...p, running: false } : null); }
  function resumeTimer() { setTimer(p => p ? { ...p, running: true  } : null); }
  function stopTimer()   { timerDoneRef.current = false; setTimer(null); }

  async function toggleCheck(idx, bloque) {
    const key = bloque.programacion_tarea_id ?? idx;
    const nuevoEstado = !checks[key];
    setChecks(prev => ({ ...prev, [key]: nuevoEstado }));
    if (bloque?.programacion_tarea_id) {
      try {
        await fetch(`${API}/programacion-tareas/${bloque.programacion_tarea_id}/completada`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ completada: nuevoEstado }),
        });
      } catch {
        // optimistic — local state already updated
      }
    }
  }

  async function handleCrisisConfirm(accion) {
    const res = await fetch(`${API}/study/crisis-action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accion, intensidad }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    setProgramacion(data);
    setChecks({});
    stopTimer();
    setCrisisOpen(false);
  }

  async function generarDia() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/study/generar-dia?intensidad=${intensidad}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setProgramacion(data);
      setChecks({});
      stopTimer();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  if (!programacion) {
    return (
      <>
        <HeroEmpty onGenerar={generarDia} loading={loading} intensidad={intensidad} onSetIntensidad={setIntensidad} />
        {error && <div className="error-toast">{error}</div>}
      </>
    );
  }

  const bloques = programacion.bloques;
  const tareas = bloques.filter(b => b.tarea_id !== null);
  const completadas = Object.values(checks).filter(Boolean).length;
  const pendientes = tareas.length - completadas;
  const minsTotales = tareas.reduce((acc, b) => acc + b.tiempo_asignado, 0);

  const ahora = new Date();
  const fechaMono = `${ahora.getDate()} ${MESES[ahora.getMonth()]} ${ahora.getFullYear()}`;

  const alertasInfo = (programacion.alertas || []).filter(a => !a.startsWith('ALERTA ROJA'));
  const hasCrisisEnAlertas = (programacion.alertas || []).some(a => a.startsWith('ALERTA ROJA'));
  const proximaTarea = bloques.find(b => b.tarea_id !== null && !checks[b.programacion_tarea_id ?? bloques.indexOf(b)]);

  const todoEnOrden = !hayRiesgo && !hasCrisisEnAlertas;

  return (
    <>
    <div className="home-schedule">
      <div className="schedule-col">
        <div className="schedule-header">
          <span className="schedule-eyebrow">PROGRAMACIÓN DEL DÍA</span>
          <span className="schedule-fecha">{fechaMono}</span>
        </div>

        {/* CrisisBanner is always rendered — it self-hides when no ALERTA ROJA in alertas */}
        <CrisisBanner
          alertas={programacion.alertas || []}
          onVerOpciones={() => setCrisisOpen(true)}
        />

        {/* Risk banner — live check, shows when tasks have deadline ≤ 2 days */}
        {hayRiesgo && (
          <div className="riesgo-banner">
            <span className="riesgo-icon">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </span>
            <div className="riesgo-content">
              <span className="riesgo-label">Entregas próximas</span>
              <p className="riesgo-text">Tienes tareas con entrega en 2 días o menos</p>
            </div>
          </div>
        )}

        {/* Fresh cards — only when fetch is done AND no crisis AND no risk */}
        {todoEnOrden && (
          <div className="status-fresh">
            <div className="status-fresh-card status-fresh-card--ok">
              <span className="status-fresh-icon">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5"/>
                </svg>
              </span>
              <div>
                <span className="status-fresh-label">Sin crisis</span>
                <p className="status-fresh-text">Ninguna tarea acumulada</p>
              </div>
            </div>
            <div className="status-fresh-card status-fresh-card--calm">
              <span className="status-fresh-icon">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
              </span>
              <div>
                <span className="status-fresh-label">Sin riesgo</span>
                <p className="status-fresh-text">Deadlines bajo control</p>
              </div>
            </div>
          </div>
        )}

        {alertasInfo.length > 0 && (
          <div className="info-banner">
            <span className="info-icon">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </span>
            <p className="info-text">{alertasInfo[0]}</p>
          </div>
        )}

        <div className="timeline">
          {bloques.map((bloque, idx) => {
            const checkKey = bloque.programacion_tarea_id ?? idx;
            return (
              <TimelineBlock
                key={idx}
                bloque={bloque}
                completado={!!checks[checkKey]}
                onToggle={() => toggleCheck(idx, bloque)}
                timerKey={checkKey}
                timer={timer}
                onStartTimer={(key, mins) => startTimer(key, mins, idx, bloque)}
                onPauseTimer={pauseTimer}
                onResumeTimer={resumeTimer}
                onStopTimer={stopTimer}
              />
            );
          })}
        </div>
      </div>

      <div className="stats-col">
        <div className="resumen-card">
          <p className="resumen-text">{programacion.resumen}</p>
        </div>

        <div className="metrics-stack">
          <MetricCard
            label="Tiempo de estudio"
            value={minutosAHoras(minsTotales)}
            sub="bloques con tarea asignada"
          />
          <MetricCard
            label="Tareas del día"
            value={`${completadas}/${tareas.length}`}
            sub={`${pendientes} pendiente${pendientes !== 1 ? 's' : ''}`}
          />
          <MetricCard
            label="Bloques totales"
            value={bloques.length}
            sub="incluyendo descansos"
          />
        </div>

        {proximaTarea && (
          <div className="next-task">
            <span className="next-task-label">Próxima tarea</span>
            <p className="next-task-name">{proximaTarea.actividad}</p>
            <span className="next-task-hora">{proximaTarea.hora_inicio} → {proximaTarea.hora_fin}</span>
          </div>
        )}

        <div className="intensity-selector">
          {['ligero', 'normal', 'intenso'].map(op => (
            <button
              key={op}
              className={`intensity-btn${intensidad === op ? ' intensity-btn--active' : ''}`}
              onClick={() => setIntensidad(op)}
              disabled={loading}
            >
              {op.charAt(0).toUpperCase() + op.slice(1)}
            </button>
          ))}
        </div>

        <button className="btn-regenerar" onClick={generarDia} disabled={loading}>
          {loading ? 'Regenerando…' : 'Regenerar día'}
        </button>
      </div>
    </div>

    <CrisisModal
      open={crisisOpen}
      onClose={() => setCrisisOpen(false)}
      onConfirm={handleCrisisConfirm}
      alertas={programacion.alertas || []}
    />
    </>
  );
}
