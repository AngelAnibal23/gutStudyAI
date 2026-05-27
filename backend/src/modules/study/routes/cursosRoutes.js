const express = require('express');
const repo = require('../repositories/studyRepository');

const router = express.Router();

const TIME_RE = /^\d{2}:\d{2}$/;

function missingFields(body, fields) {
  return fields.filter(f => body[f] == null || (typeof body[f] === 'string' && body[f].trim() === ''));
}

function validateHoras(hora_inicio, hora_fin) {
  if (!TIME_RE.test(hora_inicio) || !TIME_RE.test(hora_fin))
    return 'hora_inicio y hora_fin deben tener formato HH:MM';
  if (hora_fin <= hora_inicio)
    return 'hora_fin debe ser posterior a hora_inicio';
  return null;
}

router.get('/', async (req, res) => {
  try {
    res.json(await repo.getCursos());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/', async (req, res) => {
  const missing = missingFields(req.body, ['nombre', 'hora_inicio', 'hora_fin']);
  if (missing.length) return res.status(400).json({ error: `Campos requeridos: ${missing.join(', ')}` });
  const horaErr = validateHoras(req.body.hora_inicio, req.body.hora_fin);
  if (horaErr) return res.status(400).json({ error: horaErr });
  if (!Array.isArray(req.body.dias) || req.body.dias.length === 0) {
    return res.status(400).json({ error: 'Selecciona al menos un día' });
  }
  try {
    res.status(201).json(await repo.crearCurso(req.body));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.patch('/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });
  const missing = missingFields(req.body, ['nombre', 'hora_inicio', 'hora_fin']);
  if (missing.length) return res.status(400).json({ error: `Campos requeridos: ${missing.join(', ')}` });
  const horaErr = validateHoras(req.body.hora_inicio, req.body.hora_fin);
  if (horaErr) return res.status(400).json({ error: horaErr });
  if (!Array.isArray(req.body.dias) || req.body.dias.length === 0) {
    return res.status(400).json({ error: 'Selecciona al menos un día' });
  }
  try {
    res.json(await repo.actualizarCurso(id, req.body));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });
  try {
    await repo.eliminarCurso(id);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
