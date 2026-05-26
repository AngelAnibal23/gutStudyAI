const express = require('express');
const { generarDia, ejecutarCrisisAction } = require('../services/studyService');

const router = express.Router();

const INTENSIDADES_VALIDAS = ['intenso', 'normal', 'ligero'];

router.get('/generar-dia', async (req, res) => {
  try {
    const intensidad = INTENSIDADES_VALIDAS.includes(req.query.intensidad)
      ? req.query.intensidad
      : 'normal';
    const programacion = await generarDia(intensidad);
    res.json(programacion);
  } catch (error) {
    console.error('Error generando el día:', error.message);
    res.status(500).json({ error: error.message });
  }
});

router.post('/crisis-action', async (req, res) => {
  try {
    const { accion, intensidad } = req.body;
    const intensidadValida = INTENSIDADES_VALIDAS.includes(intensidad)
      ? intensidad
      : 'normal';
    const resultado = await ejecutarCrisisAction(accion, intensidadValida);
    res.json(resultado ?? { ok: true, noChange: true });
  } catch (error) {
    console.error('Error en crisis-action:', error.message);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
