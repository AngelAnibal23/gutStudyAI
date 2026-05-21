const express = require('express');
const repo = require('../repositories/studyRepository');

const router = express.Router();

router.patch('/:id/completada', async (req, res) => {
  try {
    const { completada } = req.body;
    await repo.actualizarCompletada(req.params.id, !!completada);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
