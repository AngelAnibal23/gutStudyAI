import { useState, useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';
import './Reporte.css';

const DIAS      = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'];
const DIAS_LABEL = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie'];
const MESES      = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

const GRID_START = 7 * 60;   // 420 min
const GRID_END   = 21 * 60;  // 1260 min
const GRID_DUR   = GRID_END - GRID_START; // 840 min
const HOURS      = Array.from({ length: 15 }, (_, i) => 7 + i); // 7..21

const CURSO_PALETTE = [
  { bg: 'rgba(59,130,246,0.22)',  border: '#3B82F6', text: '#93C5FD' },
  { bg: 'rgba(245,158,11,0.22)', border: '#F59E0B', text: '#FCD34D' },
  { bg: 'rgba(239,68,68,0.22)',  border: '#EF4444', text: '#FCA5A5' },
  { bg: 'rgba(139,92,246,0.22)', border: '#8B5CF6', text: '#C4B5FD' },
  { bg: 'rgba(6,182,212,0.22)',  border: '#06B6D4', text: '#67E8F9' },
];

function taskColor(dif, done) {
  if (done)    return { bg: 'rgba(190,242,100,0.14)', border: 'rgba(190,242,100,0.55)', text: '#BEF264' };
  if (dif <= 2) return { bg: 'rgba(59,130,246,0.18)',  border: 'rgba(59,130,246,0.55)',  text: '#93C5FD' };
  if (dif === 3) return { bg: 'rgba(245,158,11,0.18)', border: 'rgba(245,158,11,0.55)', text: '#FCD34D' };
  return            { bg: 'rgba(239,68,68,0.18)',  border: 'rgba(239,68,68,0.55)',  text: '#FCA5A5' };
}

function toMin(t) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}
function topPct(min)  { return ((min - GRID_START) / GRID_DUR) * 100; }
function htPct(dur)   { return (dur / GRID_DUR) * 100; }

function dateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function getWeekMon(d) {
  const day = d.getDay();
  const mon = new Date(d);
  mon.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  mon.setHours(0, 0, 0, 0);
  return mon;
}

function getWeekDates(base) {
  const mon = getWeekMon(new Date(base));
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(mon);
    d.setDate(mon.getDate() + i);
    return d;
  });
}

function fmtDate(d) {
  return `${d.getDate()} ${MESES[d.getMonth()]}`;
}

function getDiaNombre(d) {
  const day = d.getDay();
  if (day === 0 || day === 6) return null;
  return DIAS[day - 1];
}

export default function Reporte() {
  const [vista,     setVista]     = useState('semanal');
  const [base,      setBase]      = useState(() => new Date());
  const [showDone,  setShowDone]  = useState(true);
  const [tareas,    setTareas]    = useState([]);
  const [cursos,    setCursos]    = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [exporting, setExporting] = useState(false);
  const gridRef = useRef(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/tareas').then(r => r.json()),
      fetch('/api/cursos').then(r => r.json()),
    ]).then(([t, c]) => {
      setTareas(Array.isArray(t) ? t : []);
      setCursos(Array.isArray(c) ? c : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const colorMap  = Object.fromEntries(
    cursos.map((c, i) => [c.id, CURSO_PALETTE[i % CURSO_PALETTE.length]])
  );
  const courseById = Object.fromEntries(cursos.map(c => [c.id, c]));

  const shared  = tareas.filter(t => t.compartida);
  const visible = showDone ? shared : shared.filter(t => t.estado !== 'completada');

  const weekDates = getWeekDates(base);
  const todayS    = dateStr(new Date());

  function nav(delta) {
    setBase(prev => {
      const d = new Date(prev);
      d.setDate(d.getDate() + (vista === 'semanal' ? delta * 7 : delta));
      return d;
    });
  }

  async function exportar() {
    if (!gridRef.current || exporting) return;
    setExporting(true);
    try {
      const canvas = await html2canvas(gridRef.current, {
        backgroundColor: '#0B0F12',
        scale: 2,
        logging: false,
        useCORS: true,
      });
      const a = document.createElement('a');
      a.download = `reporte-${vista}-${dateStr(base)}.png`;
      a.href = canvas.toDataURL('image/png');
      a.click();
    } finally {
      setExporting(false);
    }
  }

  function renderCol(date, diaNombre) {
    const dStr    = dateStr(date);
    const isToday = dStr === todayS;

    const dayCursos = diaNombre
      ? cursos.filter(c => c.curso_dias?.some(d => d.dia === diaNombre))
      : [];
    const dayTareas = visible.filter(t => t.fecha_entrega === dStr);

    let morningOffset = 0;
    const courseOffsets = {}; // curso_id → minutos acumulados dentro del bloque

    return (
      <div key={dStr} className={`rg-col${isToday ? ' rg-col--today' : ''}`}>
        {HOURS.map(h => (
          <div key={h} className="rg-hline" style={{ top: `${topPct(h * 60)}%` }} />
        ))}

        {dayTareas.map(t => {
          const linkedCurso     = t.curso_id != null ? courseById[t.curso_id] : null;
          const courseRunsToday = linkedCurso?.curso_dias?.some(d => d.dia === diaNombre);

          let top, ht, inCourse = false;

          if (linkedCurso && courseRunsToday) {
            // Posicionar dentro del bloque del curso
            const cStart = toMin(linkedCurso.hora_inicio);
            const cEnd   = toMin(linkedCurso.hora_fin);
            const cDur   = cEnd - cStart;
            const cOff   = courseOffsets[t.curso_id] || 0;
            top       = topPct(cStart + cOff);
            ht        = Math.max(htPct(Math.min(t.tiempo_estimado, cDur - cOff)), 1.2);
            courseOffsets[t.curso_id] = cOff + t.tiempo_estimado;
            inCourse  = true;
          } else {
            // Apilar desde la mañana
            top = topPct(GRID_START + morningOffset);
            ht  = Math.max(htPct(t.tiempo_estimado), 1.5);
            morningOffset += t.tiempo_estimado;
          }

          const col = taskColor(t.dificultad, t.estado === 'completada');
          return (
            <div
              key={`t${t.id}`}
              className={`rg-task${inCourse ? ' rg-task--in-course' : ''}`}
              style={{ top: `${top}%`, height: `${ht}%`, background: col.bg, borderColor: col.border, color: col.text }}
              title={t.nombre}
            >
              {t.estado === 'completada' && <span className="rg-check">✓ </span>}
              {inCourse && <span className="rg-deadline-tag">📌 Entrega</span>}
              <span className="rg-blk-name">{t.nombre}</span>
              <span className="rg-blk-meta">{t.tiempo_estimado}min · {t.cursos?.nombre ?? ''}</span>
            </div>
          );
        })}

        {dayCursos.map(c => {
          const startMin = toMin(c.hora_inicio);
          const dur      = toMin(c.hora_fin) - startMin;
          const col      = colorMap[c.id] || CURSO_PALETTE[0];
          return (
            <div
              key={`c${c.id}`}
              className="rg-curso"
              style={{ top: `${topPct(startMin)}%`, height: `${htPct(dur)}%`, background: col.bg, borderColor: col.border, color: col.text }}
              title={c.nombre}
            >
              <span className="rg-blk-name">{c.nombre}</span>
              <span className="rg-blk-meta">{c.hora_inicio}–{c.hora_fin}</span>
            </div>
          );
        })}
      </div>
    );
  }

  const days = vista === 'semanal'
    ? weekDates.map((d, i) => ({ date: d, dia: DIAS[i], label: DIAS_LABEL[i] }))
    : [{ date: base, dia: getDiaNombre(base), label: getDiaNombre(base) ? DIAS_LABEL[base.getDay() - 1] : '—' }];

  const navLabel = vista === 'semanal'
    ? `${fmtDate(weekDates[0])} – ${fmtDate(weekDates[4])}`
    : fmtDate(base);

  const sharedCount = shared.length;

  return (
    <div className="reporte-page">
      {/* ── Topbar ── */}
      <div className="rp-topbar">
        <div className="rp-left">
          <div>
            <h1 className="rp-title">Reporte</h1>
            <p className="rp-subtitle">
              {sharedCount === 0
                ? 'Sin tareas compartidas — marca tareas como "Compartida" en Mis Tareas'
                : `${sharedCount} tarea${sharedCount !== 1 ? 's' : ''} compartida${sharedCount !== 1 ? 's' : ''}`}
            </p>
          </div>
          <div className="vista-toggle">
            <button
              className={`vt-btn${vista === 'diario' ? ' vt-btn--on' : ''}`}
              onClick={() => setVista('diario')}
            >Diario</button>
            <button
              className={`vt-btn${vista === 'semanal' ? ' vt-btn--on' : ''}`}
              onClick={() => setVista('semanal')}
            >Semanal</button>
          </div>
        </div>

        <div className="rp-center">
          <button className="rp-arrow" onClick={() => nav(-1)}>‹</button>
          <span className="rp-nav-label">{navLabel}</span>
          <button className="rp-arrow" onClick={() => nav(1)}>›</button>
        </div>

        <div className="rp-right">
          <button
            className={`rp-filter${showDone ? ' rp-filter--on' : ''}`}
            onClick={() => setShowDone(v => !v)}
            title="Mostrar / ocultar completadas"
          >
            <span className="rp-filter-dot" />
            Completadas
          </button>
          <button className="rp-export" onClick={exportar} disabled={exporting}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            {exporting ? 'Exportando…' : 'Exportar PNG'}
          </button>
        </div>
      </div>

      {/* ── Leyenda ── */}
      {cursos.length > 0 && (
        <div className="rp-legend">
          {cursos.map((c, i) => {
            const col = CURSO_PALETTE[i % CURSO_PALETTE.length];
            return (
              <span key={c.id} className="rp-legend-item" style={{ borderColor: col.border, color: col.text }}>
                <span className="rp-legend-dot" style={{ background: col.border }} />
                {c.nombre}
              </span>
            );
          })}
          <span className="rp-legend-sep" />
          <span className="rp-legend-item rp-legend-task-easy">
            <span className="rp-legend-dot" style={{ background: '#3B82F6' }} />Fácil
          </span>
          <span className="rp-legend-item rp-legend-task-med">
            <span className="rp-legend-dot" style={{ background: '#F59E0B' }} />Normal
          </span>
          <span className="rp-legend-item rp-legend-task-hard">
            <span className="rp-legend-dot" style={{ background: '#EF4444' }} />Difícil
          </span>
        </div>
      )}

      {/* ── Grid ── */}
      {loading ? (
        <div className="rp-loading">Cargando…</div>
      ) : (
        <div className="rp-scroll">
          <div className="rg" ref={gridRef}>
            {/* Header */}
            <div className="rg-head">
              <div className="rg-corner" />
              {days.map(({ date, label }) => {
                const dStr = dateStr(date);
                return (
                  <div key={dStr} className={`rg-day-hdr${dStr === todayS ? ' rg-day-hdr--today' : ''}`}>
                    <span className="rg-day-name">{label}</span>
                    <span className="rg-day-num">{date.getDate()}</span>
                    <span className="rg-day-month">{MESES[date.getMonth()]}</span>
                  </div>
                );
              })}
            </div>

            {/* Body */}
            <div className="rg-body">
              <div className="rg-axis">
                {HOURS.map(h => (
                  <div key={h} className="rg-hlbl" style={{ top: `${topPct(h * 60)}%` }}>
                    {String(h).padStart(2, '0')}:00
                  </div>
                ))}
              </div>
              {days.map(({ date, dia }) => renderCol(date, dia))}
            </div>
          </div>
        </div>
      )}

      {/* ── Empty state ── */}
      {!loading && sharedCount === 0 && (
        <div className="rp-empty">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.3">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          <p>Ve a <strong>Mis Tareas</strong>, edita una tarea y activa <em>"Compartida"</em> para que aparezca aquí.</p>
        </div>
      )}
    </div>
  );
}
