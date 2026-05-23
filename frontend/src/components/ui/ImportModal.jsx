import { useState, useRef } from 'react';
import Papa from 'papaparse';
import './ImportModal.css';

const API = '/api';
const DIFICULTADES = ['baja', 'media', 'alta'];
const FECHA_RE = /^\d{4}-\d{2}-\d{2}$/;

function validateRow(row, cursoMap) {
  const errors = [];
  if (!row.nombre?.trim())         errors.push('nombre vacío');
  if (!row.tipo?.trim())           errors.push('tipo vacío');
  if (!row.fecha_entrega?.trim())  errors.push('fecha_entrega vacía');
  else if (!FECHA_RE.test(row.fecha_entrega.trim())) errors.push('fecha debe ser YYYY-MM-DD');
  if (!row.dificultad?.trim())     errors.push('dificultad vacía');
  else if (!DIFICULTADES.includes(row.dificultad.trim().toLowerCase())) errors.push('dificultad: baja, media o alta');
  if (!row.tiempo_estimado)        errors.push('tiempo_estimado vacío');
  else if (!Number.isInteger(Number(row.tiempo_estimado)) || Number(row.tiempo_estimado) <= 0)
    errors.push('tiempo debe ser entero positivo');

  const cursoNombre = row.curso?.trim();
  const curso_id = cursoNombre ? (cursoMap[cursoNombre.toLowerCase()] ?? null) : null;
  if (cursoNombre && !curso_id) errors.push(`curso "${cursoNombre}" no encontrado`);

  return { errors, curso_id };
}

export default function ImportModal({ open, onClose, cursos, onSuccess }) {
  const [rows, setRows]       = useState([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef();

  const cursoMap = {};
  (cursos || []).forEach(c => {
    const key = c.nombre.toLowerCase();
    if (!cursoMap[key]) cursoMap[key] = c.id;
  });

  function parseFile(file) {
    if (!file) return;
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: ({ data }) => {
        const parsed = data.map((row, i) => {
          const { errors, curso_id } = validateRow(row, cursoMap);
          return {
            idx: i + 2,
            nombre:          row.nombre?.trim()           || '',
            curso:           row.curso?.trim()            || '',
            tipo:            row.tipo?.trim()             || '',
            fecha_entrega:   row.fecha_entrega?.trim()    || '',
            dificultad:      row.dificultad?.trim().toLowerCase() || '',
            tiempo_estimado: row.tiempo_estimado?.trim()  || '',
            notas:           row.notas?.trim()            || '',
            curso_id,
            errors,
            valid: errors.length === 0,
          };
        });
        setRows(parsed);
        setResult(null);
      },
    });
  }

  function handleFile(file) {
    if (file?.name?.endsWith('.csv')) parseFile(file);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  }

  async function handleImport() {
    const validas = rows.filter(r => r.valid);
    if (!validas.length) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/tareas/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tareas: validas }),
      });
      const data = await res.json();
      setResult(data);
      if (data.insertadas > 0) onSuccess(data.insertadas);
    } catch {
      setResult({ error: 'Error de red al importar' });
    } finally {
      setLoading(false);
    }
  }

  function reset() { setRows([]); setResult(null); }

  function handleOverlayClick() { reset(); onClose(); }

  if (!open) return null;

  const validCount = rows.filter(r => r.valid).length;
  const errorCount = rows.filter(r => !r.valid).length;

  return (
    <div className="imodal-overlay" onClick={handleOverlayClick}>
      <div className="imodal" onClick={e => e.stopPropagation()}>

        <div className="imodal-header">
          <div>
            <span className="imodal-title">Importar tareas</span>
            <p className="imodal-sub">Carga múltiples tareas desde un archivo CSV</p>
          </div>
          <button className="imodal-close" onClick={handleOverlayClick} aria-label="Cerrar">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {!rows.length && !result && (
          <div
            className={`imodal-dropzone${dragging ? ' imodal-dropzone--over' : ''}`}
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current.click()}
          >
            <input
              ref={inputRef} type="file" accept=".csv"
              style={{ display: 'none' }}
              onChange={e => handleFile(e.target.files[0])}
            />
            <svg className="imodal-upload-icon" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="16 16 12 12 8 16"/>
              <line x1="12" y1="12" x2="12" y2="21"/>
              <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
            </svg>
            <p className="imodal-drop-text">Arrastra tu CSV aquí o <span>haz clic para seleccionar</span></p>
            <p className="imodal-drop-sub">Solo archivos .csv</p>
          </div>
        )}

        {rows.length > 0 && !result && (
          <>
            <div className="imodal-stats">
              <span className="imodal-stat imodal-stat--ok">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                {validCount} válida{validCount !== 1 ? 's' : ''}
              </span>
              {errorCount > 0 && (
                <span className="imodal-stat imodal-stat--err">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                  {errorCount} con error
                </span>
              )}
            </div>

            <div className="imodal-table-wrap">
              <table className="imodal-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Nombre</th>
                    <th>Curso</th>
                    <th>Tipo</th>
                    <th>Entrega</th>
                    <th>Dif.</th>
                    <th>Min.</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(r => (
                    <tr key={r.idx} className={r.valid ? '' : 'irow--err'}>
                      <td className="irow-idx">{r.idx}</td>
                      <td>{r.nombre || <span className="irow-empty">—</span>}</td>
                      <td className="irow-dim">{r.curso || <span className="irow-empty">—</span>}</td>
                      <td className="irow-dim">{r.tipo || <span className="irow-empty">—</span>}</td>
                      <td className="irow-mono">{r.fecha_entrega || <span className="irow-empty">—</span>}</td>
                      <td className="irow-mono">{r.dificultad || <span className="irow-empty">—</span>}</td>
                      <td className="irow-mono">{r.tiempo_estimado || <span className="irow-empty">—</span>}</td>
                      <td>
                        {!r.valid && (
                          <span className="irow-error-badge" title={r.errors.join(' · ')}>
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="12" cy="12" r="10"/>
                              <line x1="12" y1="8" x2="12" y2="12"/>
                              <line x1="12" y1="16" x2="12.01" y2="16"/>
                            </svg>
                            {r.errors[0]}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="imodal-footer">
              <button className="imodal-btn-ghost" onClick={reset}>Cambiar archivo</button>
              <button
                className="imodal-btn-primary"
                onClick={handleImport}
                disabled={loading || validCount === 0}
              >
                {loading ? 'Importando…' : `Importar ${validCount} tarea${validCount !== 1 ? 's' : ''}`}
              </button>
            </div>
          </>
        )}

        {result && (
          <div className="imodal-result">
            {result.error ? (
              <p className="imodal-result-err">{result.error}</p>
            ) : (
              <>
                <div className="imodal-result-ok">
                  <span className="imodal-result-icon">
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  </span>
                  <p className="imodal-result-count">
                    {result.insertadas} tarea{result.insertadas !== 1 ? 's' : ''} importada{result.insertadas !== 1 ? 's' : ''}
                  </p>
                </div>
                {result.errores?.length > 0 && (
                  <p className="imodal-result-warn">
                    {result.errores.length} fila{result.errores.length !== 1 ? 's' : ''} ignorada{result.errores.length !== 1 ? 's' : ''} por errores de validación
                  </p>
                )}
              </>
            )}
            <div className="imodal-footer">
              <button className="imodal-btn-ghost" onClick={reset}>Importar más</button>
              <button className="imodal-btn-primary" onClick={handleOverlayClick}>Listo</button>
            </div>
          </div>
        )}

        <a className="imodal-template-link" href="/template-tareas.csv" download>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Descargar template CSV
        </a>

      </div>
    </div>
  );
}
