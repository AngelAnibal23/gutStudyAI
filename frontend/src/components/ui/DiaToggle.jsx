import './DiaToggle.css';

const DIAS = ['lunes','martes','miercoles','jueves','viernes','sabado','domingo'];
const DIAS_LABEL = ['L','M','X','J','V','S','D'];

export default function DiaToggle({ dias, onChange }) {
  function toggle(dia) {
    onChange(dias.includes(dia) ? dias.filter(d => d !== dia) : [...dias, dia]);
  }
  return (
    <div className="dia-toggles">
      {DIAS.map((dia, i) => (
        <button
          key={dia}
          type="button"
          className={`dia-chip ${dias.includes(dia) ? 'dia-chip--active' : ''}`}
          onClick={() => toggle(dia)}
        >
          {DIAS_LABEL[i]}
        </button>
      ))}
    </div>
  );
}
