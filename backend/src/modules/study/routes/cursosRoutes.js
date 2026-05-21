const express = require('express');
const repo = require('../repositories/studyRepository');

const router = express.Router();

function missingFields(body, fields) {
  return fields.filter(f => body[f] == null || body[f] === '');
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
  const missing = missingFields(req.body, ['nombre', 'hora_inicio', 'hora_fin']);
  if (missing.length) return res.status(400).json({ error: `Campos requeridos: ${missing.join(', ')}` });
  if (!Array.isArray(req.body.dias) || req.body.dias.length === 0) {
    return res.status(400).json({ error: 'Selecciona al menos un día' });
  }
  try {
    res.json(await repo.actualizarCurso(req.params.id, req.body));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await repo.eliminarCurso(req.params.id);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
