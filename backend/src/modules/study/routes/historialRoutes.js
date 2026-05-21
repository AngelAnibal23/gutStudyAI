const express = require('express');
const router = express.Router();
const supabase = require('../../../core/db/supabase');

function toDateStr(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

router.get('/', async (req, res) => {
  try {
    const today = toDateStr(new Date());

    const { data: programaciones, error: progError } = await supabase
      .from('programaciones')
      .select('id, fecha, hubo_crisis')
      .lt('fecha', today)
      .order('fecha', { ascending: false })
      .limit(60);

    if (progError) throw progError;
    if (!programaciones || programaciones.length === 0) return res.json([]);

    const progIds = programaciones.map(p => p.id);

    const { data: tareas, error: tareasError } = await supabase
      .from('programacion_tareas')
      .select('programacion_id, completada, fue_postergada, tiempo_asignado, tareas(nombre, tipo, notas, cursos(nombre))')
      .in('programacion_id', progIds);

    if (tareasError) throw tareasError;

    const tareasByProg = {};
    for (const t of (tareas || [])) {
      if (!tareasByProg[t.programacion_id]) tareasByProg[t.programacion_id] = [];
      tareasByProg[t.programacion_id].push(t);
    }

    const result = programaciones.map(p => {
      const ts = tareasByProg[p.id] || [];
      const completadas = ts.filter(t => t.completada).length;
      return {
        id: p.id,
        fecha: p.fecha,
        hubo_crisis: p.hubo_crisis,
        total: ts.length,
        completadas,
        tareas: ts.map(t => ({
          nombre: t.tareas?.nombre ?? '—',
          tipo: t.tareas?.tipo ?? '',
          notas: t.tareas?.notas ?? null,
          curso: t.tareas?.cursos?.nombre ?? '—',
          tiempo_asignado: t.tiempo_asignado,
          completada: t.completada,
          fue_postergada: t.fue_postergada,
        })),
      };
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
