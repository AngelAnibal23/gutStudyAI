import './HeroEmpty.css';

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MESES = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];

export default function HeroEmpty({ onGenerar, loading }) {
  const ahora = new Date();
  const dia = DIAS[ahora.getDay()].toUpperCase();
  const fecha = `${ahora.getDate()} ${MESES[ahora.getMonth()]}`;

  return (
    <div className="hero-empty">
      <div className="hero-meta">
        <span className="hero-dot" />
        <span className="hero-datetime">{dia} · {fecha}</span>
      </div>

      <h1 className="hero-title">
        <span className="hero-title-line">Listo para</span>
        <span className="hero-title-line">
          <em className="hero-accent">organizar</em> tu día.
        </span>
      </h1>

      <p className="hero-sub">
        Apreta el botón y déjame armar una programación que respete
        tus clases, tus tareas y tu energía.
      </p>

      <div className="hero-cta">
        <button
          className={`btn-generar${loading ? ' btn-generar--loading' : ''}`}
          onClick={onGenerar}
          disabled={loading}
        >
          {loading ? (
            <>
              <span className="btn-dot-blink" />
              <span className="btn-mono">Pensando…</span>
            </>
          ) : (
            <>
              Generar mi día
              <span className="btn-arrow">→</span>
            </>
          )}
        </button>

        <p className="hero-powered">
          · Powered by Groq · ~2s
        </p>
      </div>
    </div>
  );
}
