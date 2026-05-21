const express = require('express');
const { generarDia, ejecutarCrisisAction } = require('../services/studyService');

const router = express.Router();

router.get('/generar-dia', async (req, res) => {
  try {
    const programacion = await generarDia();
    res.json(programacion);
  } catch (error) {
    console.error('Error generando el día:', error.message);
    res.status(500).json({ error: error.message });
  }
});

router.post('/crisis-action', async (req, res) => {
  try {
    const { accion } = req.body;
    const resultado = await ejecutarCrisisAction(accion);
    res.json(resultado ?? { ok: true, noChange: true });
  } catch (error) {
    console.error('Error en crisis-action:', error.message);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
