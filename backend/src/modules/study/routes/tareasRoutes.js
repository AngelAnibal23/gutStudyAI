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

router.delete('/:id', async (req, res) => {
  try {
    await repo.eliminarTarea(req.params.id);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.patch('/:id/estado', async (req, res) => {
  if (!req.body.estado || !ESTADOS_VALIDOS.includes(req.body.estado)) {
    return res.status(400).json({ error: `estado debe ser: ${ESTADOS_VALIDOS.join(', ')}` });
  }
  try {
    res.json(await repo.actualizarEstadoTarea(req.params.id, req.body.estado));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    res.json(await repo.actualizarTarea(req.params.id, req.body));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
