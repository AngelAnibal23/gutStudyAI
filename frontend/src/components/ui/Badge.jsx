import './Badge.css';

const VARIANTS = {
  pendiente:  { label: 'Pendiente',  cls: 'badge--muted'  },
  en_progreso:{ label: 'En progreso',cls: 'badge--blue'   },
  completada: { label: 'Completada', cls: 'badge--lime'   },
  en_riesgo:  { label: 'En riesgo',  cls: 'badge--amber'  },
  crisis:     { label: 'Crisis',     cls: 'badge--red'    },
};

export default function Badge({ variant, custom }) {
  const v = VARIANTS[variant] || { label: variant, cls: 'badge--muted' };
  return (
    <span className={`badge ${v.cls}`}>{custom || v.label}</span>
  );
}
