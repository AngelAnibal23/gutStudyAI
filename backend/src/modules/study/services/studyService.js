const repo = require('../repositories/studyRepository');
const { generarProgramacion } = require('../../../core/ai/AIService');

const UMBRAL_ALERTA_ROJA = 3;

function fechaLocal(offsetDias = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDias);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function hoy() { return fechaLocal(0); }
function manana() { return fechaLocal(1); }

function diaSemana(offset = 0) {
  const dias = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return dias[d.getDay()];
}

function minutosEntre(horaInicio, horaFin) {
  const [h1, m1] = horaInicio.split(':').map(Number);
  const [h2, m2] = horaFin.split(':').map(Number);
  return (h2 * 60 + m2) - (h1 * 60 + m1);
}

function calcularHorasLibres(cursos, bloqueados, dia) {
  const INICIO_DIA = 7 * 60;   // 07:00 en minutos
  const FIN_DIA = 24 * 60;     // 00:00 del día siguiente

  const minutosDisponibles = FIN_DIA - INICIO_DIA; // 1020 min = 17h

  const bloqueadosDelDia = bloqueados.filter((b) =>
    b.horario_bloqueado_dias.some((d) => d.dia.toLowerCase() === dia) &&
    b.tipo !== 'dormir'
  );

  const minutosBloqueados = bloqueadosDelDia.reduce((acc, b) => {
    const mins = minutosEntre(b.hora_inicio, b.hora_fin);
    return acc + (mins > 0 ? mins : 0);
  }, 0);

  const horasLibres = Math.round((minutosDisponibles - minutosBloqueados) / 60 * 10) / 10;
  return Math.max(horasLibres, 0);
}

function construirPrompt({ cursos, tareas, bloqueados, fecha, dia, fechaManana, diaManana, horasLibresManana, postergadas }) {
  const cursosHoy = cursos.filter((c) =>
    c.curso_dias.some((cd) => cd.dia.toLowerCase() === dia)
  );

  const bloqueadosHoy = bloqueados.filter((b) =>
    b.horario_bloqueado_dias.some((d) => d.dia.toLowerCase() === dia)
  );

  const cursosManana = cursos.filter((c) =>
    c.curso_dias.some((cd) => cd.dia.toLowerCase() === diaManana)
  );

  const bloqueadosManana = bloqueados.filter((b) =>
    b.horario_bloqueado_dias.some((d) => d.dia.toLowerCase() === diaManana) &&
    b.tipo !== 'dormir'
  );

  const seccionPostergadas = postergadas.length
    ? postergadas.map((t) => {
        const alerta = t.veces_postergada >= UMBRAL_ALERTA_ROJA ? ' ⚠️ ALERTA ROJA' : '';
        return `- ID:${t.id} [${t.cursos?.nombre || 'Sin curso'}] ${t.nombre} | postergada ${t.veces_postergada} veces${alerta}`;
      }).join('\n')
    : '- Ninguna';

  return `Eres un asistente de planificación académica. Hoy es ${fecha} (${dia}).

CURSOS QUE TENGO HOY:
${cursosHoy.length ? cursosHoy.map((c) => `- ${c.nombre} de ${c.hora_inicio} a ${c.hora_fin}`).join('\n') : '- Ninguno'}

HORARIOS BLOQUEADOS HOY:
${bloqueadosHoy.length ? bloqueadosHoy.map((b) => `- ${b.tipo} de ${b.hora_inicio} a ${b.hora_fin}`).join('\n') : '- Ninguno'}

TAREAS PENDIENTES (ordenadas por fecha de entrega):
${tareas.length ? tareas.map((t) =>
  `- ID:${t.id} [${t.cursos?.nombre || 'Sin curso'}] ${t.nombre} | tipo: ${t.tipo} | entrega: ${t.fecha_entrega} | dificultad: ${t.dificultad} | tiempo estimado: ${t.tiempo_estimado} min | postergada: ${t.veces_postergada} veces`
).join('\n') : '- Sin tareas pendientes'}

TAREAS NO COMPLETADAS AYER:
${seccionPostergadas}

CONTEXTO DE MAÑANA (${fechaManana}, ${diaManana}):
- Cursos: ${cursosManana.length ? cursosManana.map((c) => `${c.nombre} ${c.hora_inicio}-${c.hora_fin}`).join(', ') : 'Ninguno'}
- Bloqueados: ${bloqueadosManana.length ? bloqueadosManana.map((b) => `${b.tipo} ${b.hora_inicio}-${b.hora_fin}`).join(', ') : 'Ninguno'}
- Horas libres estimadas mañana: ${horasLibresManana}h

REGLAS ESTRICTAS:
1. Los HORARIOS BLOQUEADOS deben aparecer como bloques en el JSON con sus horas exactas y tarea_id: null. No los omitas.
2. El campo "tiempo_asignado" de cada tarea debe ser exactamente su "tiempo estimado". No lo reduzcas.
3. En "tarea_id" usa el ID numérico exacto de la lista (prefijo ID:). Si no es una tarea, usa null.
4. El día termina con el bloque "dormir". No agregues actividades después.
5. Llena todo el día desde las 07:00 sin dejar huecos.
6. Usa el CONTEXTO DE MAÑANA para razonar: si hoy tienes más horas libres que mañana, prioriza hacer más tareas hoy. Si mañana hay espacio suficiente, puedes diferir tareas no urgentes.
7. Para TAREAS NO COMPLETADAS AYER: decide si incluirlas hoy o diferirlas según el tiempo disponible. ALERTA ROJA solo aplica si la tarea tiene el marcador "⚠️ ALERTA ROJA" en la lista de no completadas. Una tarea con 1 o 2 postergaciones NO es alerta roja. Cuando sí aplique, inclúyela HOY obligatoriamente y escribe en "alertas": "ALERTA ROJA: [nombre tarea] lleva N días sin completarse".
8. Explica en "alertas" cualquier decisión de diferir una tarea a mañana indicando el motivo concreto. Si no hay nada especial que reportar, deja "alertas" como array vacío.

Responde ÚNICAMENTE con JSON válido:
{
  "resumen": "Una frase motivacional breve",
  "bloques": [
    {
      "hora_inicio": "HH:MM",
      "hora_fin": "HH:MM",
      "actividad": "nombre",
      "tarea_id": <id numérico o null>,
      "tiempo_asignado": <minutos>
    }
  ],
  "alertas": ["string por cada decisión o alerta roja"]
}`;
}

async function generarDia() {
  const fecha = hoy();
  const dia = diaSemana(0);
  const fechaManana = manana();
  const diaManana = diaSemana(1);

  const [cursos, tareas, bloqueados, postergadasAyer] = await Promise.all([
    repo.getCursos(),
    repo.getTareasPendientes(),
    repo.getHorariosBloqueados(),
    repo.getTareasNoCompletadasAyer(),
  ]);

  // Solo incrementa en la primera generación del día; re-generar no penaliza
  const yaGeneradaHoy = await repo.existeProgramacion(fecha);
  if (!yaGeneradaHoy) {
    await Promise.all(postergadasAyer.map((t) => repo.incrementarPostergadaDirecto(t.id)));
  }

  // Recarga tareas con contadores actualizados (solo si se incrementó)
  const tareasActualizadas = (!yaGeneradaHoy && postergadasAyer.length > 0)
    ? await repo.getTareasPendientes()
    : tareas;

  // Postergadas con contadores actualizados para el prompt
  const postergadasActualizadas = postergadasAyer.length > 0
    ? tareasActualizadas.filter((t) => postergadasAyer.some((p) => p.id === t.id))
    : [];

  const horasLibresManana = calcularHorasLibres(cursos, bloqueados, diaManana);

  const prompt = construirPrompt({
    cursos,
    tareas: tareasActualizadas,
    bloqueados,
    fecha,
    dia,
    fechaManana,
    diaManana,
    horasLibresManana,
    postergadas: postergadasActualizadas,
  });

  const respuestaIA = await generarProgramacion(prompt);

  const match = respuestaIA.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('La IA no devolvió JSON válido');
  const programacion = JSON.parse(match[0]);

  // Forzar tiempo_asignado y actividad con los valores reales de la tarea
  const tiempoMap = new Map(tareasActualizadas.map(t => [t.id, t.tiempo_estimado]));
  const nombreMap = new Map(tareasActualizadas.map(t => [t.id, t.nombre]));
  programacion.bloques = programacion.bloques.map(b => {
    if (!b.tarea_id) return b;
    const id = Number(b.tarea_id);
    const esperado = tiempoMap.get(id);
    const nombre   = nombreMap.get(id);
    return {
      ...b,
      ...(esperado != null ? { tiempo_asignado: esperado } : {}),
      ...(nombre    != null ? { actividad: nombre }        : {}),
    };
  });

  const tareaIds = new Set(tareasActualizadas.map((t) => t.id));
  const tareasConTiempo = programacion.bloques
    .filter((b) => b.tarea_id !== null && tareaIds.has(Number(b.tarea_id)))
    .map((b) => ({ tarea_id: Number(b.tarea_id), tiempo_asignado: b.tiempo_asignado }));

  if (tareasConTiempo.length > 0) {
    await repo.guardarProgramacion(fecha, tareasConTiempo);
    const ptRows = await repo.getProgramacionTareasHoy(fecha);
    const ptMap = new Map(ptRows.map((r) => [r.tarea_id, r]));
    programacion.bloques = programacion.bloques.map((b) => {
      const pt = b.tarea_id ? (ptMap.get(Number(b.tarea_id)) ?? null) : null;
      return {
        ...b,
        programacion_tarea_id: pt?.id ?? null,
        completada: pt?.completada ?? false,
      };
    });
  }

  return { fecha, dia, ...programacion };
}

async function ejecutarCrisisAction(accion) {
  if (accion === 'reconocer') return null;

  const fecha     = hoy();
  const dia       = diaSemana(0);
  const fechaManana = manana();
  const diaManana   = diaSemana(1);

  const [cursos, tareas, bloqueados] = await Promise.all([
    repo.getCursos(),
    repo.getTareasPendientes(),
    repo.getHorariosBloqueados(),
  ]);

  const horasLibresManana = calcularHorasLibres(cursos, bloqueados, diaManana);
  const tareasCrisis = tareas.filter(t => t.veces_postergada >= UMBRAL_ALERTA_ROJA);

  let instruccionEspecial = '';

  switch (accion) {
    case 'priorizar_hoy':
      instruccionEspecial = `\n\nINSTRUCCIÓN ESPECIAL — PRIORIZAR HOY: Incluye OBLIGATORIAMENTE las siguientes tareas hoy. Deben ser los primeros bloques de estudio disponibles, sin excepción:\n${tareasCrisis.map(t => `- ID:${t.id} "${t.nombre}" (${t.tiempo_estimado} min)`).join('\n')}`;
      break;

    case 'dividir_bloques':
      instruccionEspecial = `\n\nINSTRUCCIÓN ESPECIAL — DIVIDIR EN BLOQUES: Las siguientes tareas deben aparecer divididas en 2-3 sesiones cortas de 45-60 min intercaladas con descansos de 10-15 min. No las pongas en un solo bloque largo:\n${tareasCrisis.map(t => `- ID:${t.id} "${t.nombre}" (tiempo total: ${t.tiempo_estimado} min)`).join('\n')}`;
      break;

    case 'diferir_manana':
      instruccionEspecial = `\n\nINSTRUCCIÓN ESPECIAL — DIFERIR A MAÑANA: NO incluyas las siguientes tareas en el horario de HOY. Excluirlas completamente del timeline. En "alertas" escribe para cada una: "Diferida a mañana: [nombre]":\n${tareasCrisis.map(t => `- ID:${t.id} "${t.nombre}"`).join('\n')}`;
      break;

    case 'buscar_dia_optimo': {
      const recomendaciones = tareasCrisis.map(t => {
        const deadline = t.fecha_entrega ? new Date(t.fecha_entrega + 'T12:00:00') : null;
        let mejorDia = null;
        let maxHoras = -1;

        for (let i = 1; i <= 14; i++) {
          const diaNombre   = diaSemana(i);
          const fechaOffset = fechaLocal(i);
          if (deadline) {
            const d = new Date(fechaOffset + 'T12:00:00');
            if (d > deadline) break;
          }
          const horas = calcularHorasLibres(cursos, bloqueados, diaNombre);
          if (horas > maxHoras) {
            maxHoras = horas;
            mejorDia = { dia: diaNombre, fecha: fechaOffset, horas };
          }
        }
        return { tarea: t, mejorDia };
      });

      const detalle = recomendaciones.map(r =>
        r.mejorDia
          ? `- ID:${r.tarea.id} "${r.tarea.nombre}" → ${r.mejorDia.dia} ${r.mejorDia.fecha} (${r.mejorDia.horas}h libres)`
          : `- ID:${r.tarea.id} "${r.tarea.nombre}" → sin día disponible antes del deadline`
      ).join('\n');

      instruccionEspecial = `\n\nINSTRUCCIÓN ESPECIAL — REAGENDAR AL DÍA ÓPTIMO: El sistema analizó los próximos 14 días y encontró el día con más horas libres antes del deadline para cada tarea en crisis. NO incluyas estas tareas en el horario de HOY. En "alertas" escribe EXACTAMENTE para cada una: "Reagendado: [nombre] → [dia fecha] ([horas]h libres)":\n${detalle}`;
      break;
    }
  }

  const prompt = construirPrompt({
    cursos, tareas, bloqueados, fecha, dia,
    fechaManana, diaManana, horasLibresManana,
    postergadas: tareasCrisis,
  }) + instruccionEspecial;

  const respuestaIA = await generarProgramacion(prompt);
  const match = respuestaIA.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('La IA no devolvió JSON válido');
  const programacion = JSON.parse(match[0]);

  // Forzar tiempo_asignado y actividad con los valores reales de la tarea
  const tiempoMapCrisis = new Map(tareas.map(t => [t.id, t.tiempo_estimado]));
  const nombreMapCrisis = new Map(tareas.map(t => [t.id, t.nombre]));
  programacion.bloques = programacion.bloques.map(b => {
    if (!b.tarea_id) return b;
    const id = Number(b.tarea_id);
    const esperado = tiempoMapCrisis.get(id);
    const nombre   = nombreMapCrisis.get(id);
    return {
      ...b,
      ...(esperado != null ? { tiempo_asignado: esperado } : {}),
      ...(nombre    != null ? { actividad: nombre }        : {}),
    };
  });

  const tareaIdsSet = new Set(tareas.map(t => t.id));
  const tareasConTiempo = programacion.bloques
    .filter(b => b.tarea_id !== null && tareaIdsSet.has(Number(b.tarea_id)))
    .map(b => ({ tarea_id: Number(b.tarea_id), tiempo_asignado: b.tiempo_asignado }));

  if (tareasConTiempo.length > 0) {
    await repo.guardarProgramacion(fecha, tareasConTiempo);
    const ptRows = await repo.getProgramacionTareasHoy(fecha);
    const ptMap = new Map(ptRows.map(r => [r.tarea_id, r]));
    programacion.bloques = programacion.bloques.map(b => {
      const pt = b.tarea_id ? (ptMap.get(Number(b.tarea_id)) ?? null) : null;
      return {
        ...b,
        programacion_tarea_id: pt?.id ?? null,
        completada: pt?.completada ?? false,
      };
    });
  }

  return { fecha, dia, ...programacion };
}

module.exports = { generarDia, ejecutarCrisisAction };
