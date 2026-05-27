const express = require('express');
const repo = require('../repositories/studyRepository');

const router = express.Router();

const ESTADOS_VALIDOS = ['pendiente', 'completada'];

function missingFields(body, fields) {
  return fields.filter(f => body[f] == null || body[f] === '');
}

router.get('/', async (req, res) => {
  try {
    res.json(await repo.getTareas());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/', async (req, res) => {
  const missing = missingFields(req.body, ['nombre', 'tipo', 'fecha_entrega', 'dificultad', 'tiempo_estimado']);
  if (missing.length) return res.status(400).json({ error: `Campos requeridos: ${missing.join(', ')}` });
  try {
    res.status(201).json(await repo.crearTarea(req.body));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/bulk', async (req, res) => {
  const { tareas } = req.body;
  if (!Array.isArray(tareas) || tareas.length === 0) {
    return res.status(400).json({ error: 'Se requiere un array de tareas no vacío' });
  }

  const CAMPOS = ['nombre', 'tipo', 'fecha_entrega', 'dificultad', 'tiempo_estimado'];
  const DIFICULTADES = ['baja', 'media', 'alta'];
  const FECHA_RE = /^\d{4}-\d{2}-\d{2}$/;

  const errores = [];
  const validas = [];

  tareas.forEach((t, i) => {
    const fila = i + 2; // +2 porque fila 1 es el header del CSV
    const missing = CAMPOS.filter(f => !t[f] && t[f] !== 0);
    if (missing.length) { errores.push({ fila, error: `Faltan campos: ${missing.join(', ')}` }); return; }
    if (!DIFICULTADES.includes(t.dificultad)) { errores.push({ fila, error: `dificultad inválida: "${t.dificultad}". Debe ser baja, media o alta` }); return; }
    if (!FECHA_RE.test(t.fecha_entrega)) { errores.push({ fila, error: `fecha_entrega inválida: "${t.fecha_entrega}". Formato esperado: YYYY-MM-DD` }); return; }
    const mins = Number(t.tiempo_estimado);
    if (!Number.isInteger(mins) || mins <= 0) { errores.push({ fila, error: `tiempo_estimado debe ser un número entero positivo` }); return; }
    validas.push({ ...t, tiempo_estimado: mins });
  });

  if (validas.length === 0) {
    return res.status(400).json({ insertadas: 0, errores });
  }

  try {
    const insertadas = await repo.insertarTareasBulk(validas);
    res.status(201).json({ insertadas: insertadas.length, errores });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });
  try {
    await repo.eliminarTarea(id);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.patch('/:id/estado', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });
  if (!req.body.estado || !ESTADOS_VALIDOS.includes(req.body.estado)) {
    return res.status(400).json({ error: `estado debe ser: ${ESTADOS_VALIDOS.join(', ')}` });
  }
  try {
    res.json(await repo.actualizarEstadoTarea(id, req.body.estado));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.patch('/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });
  try {
    res.json(await repo.actualizarTarea(id, req.body));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
