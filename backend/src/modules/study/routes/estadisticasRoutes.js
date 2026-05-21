const express = require('express');
const router = express.Router();
const supabase = require('../../../core/db/supabase');

const DIAS_ES = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];

function toDateStr(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('programacion_tareas')
      .select('completada, tiempo_asignado, programaciones!inner(fecha)');

    if (error) throw error;

    // Aggregate by date
    const byDate = {};
    for (const row of (data || [])) {
      const fecha = row.programaciones.fecha;
      if (!byDate[fecha]) byDate[fecha] = { programadas: 0, completadas: 0, totalMinutos: 0 };
      byDate[fecha].programadas++;
      if (row.completada) {
        byDate[fecha].completadas++;
        byDate[fecha].totalMinutos += row.tiempo_asignado || 0;
      }
    }

    // Last 7 days (today included)
    const today = new Date();
    const porDia = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const fecha = toDateStr(d);
      porDia.push({
        fecha,
        dia: DIAS_ES[d.getDay()],
        ...(byDate[fecha] || { programadas: 0, completadas: 0, totalMinutos: 0 }),
      });
    }

    // Current streak: consecutive days with ≥1 completion, going backwards from today/yesterday
    let racha = 0;
    const checkDate = new Date(today);
    const todayStr = toDateStr(today);
    if (!byDate[todayStr] || byDate[todayStr].completadas === 0) {
      checkDate.setDate(checkDate.getDate() - 1);
    }
    for (let i = 0; i < 365; i++) {
      const dateStr = toDateStr(checkDate);
      if (byDate[dateStr] && byDate[dateStr].completadas > 0) {
        racha++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    // Best streak (across all history)
    const allDates = Object.keys(byDate)
      .filter(f => byDate[f].completadas > 0)
      .sort();

    let mejorRacha = 0;
    let tempStreak = 0;
    for (let i = 0; i < allDates.length; i++) {
      if (i === 0) {
        tempStreak = 1;
      } else {
        const prev = new Date(allDates[i - 1] + 'T12:00:00');
        const curr = new Date(allDates[i] + 'T12:00:00');
        const diff = Math.round((curr - prev) / 86400000);
        tempStreak = diff === 1 ? tempStreak + 1 : 1;
      }
      if (tempStreak > mejorRacha) mejorRacha = tempStreak;
    }

    const totalProgramadasSemana = porDia.reduce((s, d) => s + d.programadas, 0);
    const totalCompletadasSemana = porDia.reduce((s, d) => s + d.completadas, 0);
    const totalMinutosSemana = porDia.reduce((s, d) => s + d.totalMinutos, 0);

    res.json({
      racha,
      mejorRacha: Math.max(racha, mejorRacha),
      porDia,
      totalProgramadasSemana,
      totalCompletadasSemana,
      totalHoras: Math.round((totalMinutosSemana / 60) * 10) / 10,
      tasaCompletado: totalProgramadasSemana > 0
        ? Math.round((totalCompletadasSemana / totalProgramadasSemana) * 100)
        : 0,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
