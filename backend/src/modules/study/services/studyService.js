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

function toMins(hora) {
  const [h, m] = hora.split(':').map(Number);
  return h * 60 + m;
}

function toHora(mins) {
  return `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
}

function generarHorarioFallback({ cursos, tareas, bloqueados, dia }) {
  const cursosHoy = cursos.filter(c => c.curso_dias.some(cd => cd.dia.toLowerCase() === dia));
  const bloqueadosHoy = bloqueados.filter(b =>
    b.horario_bloqueado_dias.some(d => d.dia.toLowerCase() === dia) && b.tipo !== 'dormir'
  );

  const eventosFixed = [
    ...cursosHoy.map(c => ({ inicio: toMins(c.hora_inicio), fin: toMins(c.hora_fin), actividad: `Clase: ${c.nombre}`, tarea_id: null })),
    ...bloqueadosHoy.map(b => ({ inicio: toMins(b.hora_inicio), fin: toMins(b.hora_fin), actividad: b.tipo, tarea_id: null })),
  ].sort((a, b) => a.inicio - b.inicio);

  const PESO_DIFICULTAD = { alta: 0, media: 1, baja: 2 };
  const tareaQueue = [...tareas].sort((a, b) => {
    const aCrisis = a.veces_postergada >= UMBRAL_ALERTA_ROJA ? 0 : 1;
    const bCrisis = b.veces_postergada >= UMBRAL_ALERTA_ROJA ? 0 : 1;
    if (aCrisis !== bCrisis) return aCrisis - bCrisis;
    const fechaDiff = new Date(a.fecha_entrega) - new Date(b.fecha_entrega);
    if (fechaDiff !== 0) return fechaDiff;
    return (PESO_DIFICULTAD[a.dificultad] ?? 1) - (PESO_DIFICULTAD[b.dificultad] ?? 1);
  });

  const INICIO_DIA = 7 * 60;
  const FIN_DIA = 23 * 60;
  const bloques = [];
  let cursor = INICIO_DIA;
  let qIdx = 0;

  function llenarConTareas(hasta) {
    while (cursor < hasta && qIdx < tareaQueue.length) {
      const t = tareaQueue[qIdx];
      if (t.tiempo_estimado <= hasta - cursor) {
        bloques.push({ hora_inicio: toHora(cursor), hora_fin: toHora(cursor + t.tiempo_estimado), actividad: t.nombre, tarea_id: t.id, tiempo_asignado: t.tiempo_estimado });
        cursor += t.tiempo_estimado;
        qIdx++;
      } else {
        break;
      }
    }
    if (cursor < hasta) {
      bloques.push({ hora_inicio: toHora(cursor), hora_fin: toHora(hasta), actividad: 'Tiempo libre', tarea_id: null, tiempo_asignado: hasta - cursor });
      cursor = hasta;
    }
  }

  for (const ev of eventosFixed) {
    if (ev.inicio > cursor) llenarConTareas(ev.inicio);
    const inicio = Math.max(cursor, ev.inicio);
    if (ev.fin > inicio) {
      bloques.push({ hora_inicio: toHora(inicio), hora_fin: toHora(ev.fin), actividad: ev.actividad, tarea_id: null, tiempo_asignado: ev.fin - inicio });
      cursor = ev.fin;
    }
  }

  llenarConTareas(FIN_DIA);
  bloques.push({ hora_inicio: '23:00', hora_fin: '07:00', actividad: 'dormir', tarea_id: null, tiempo_asignado: 480 });

  const alertas = tareas
    .filter(t => t.veces_postergada >= UMBRAL_ALERTA_ROJA)
    .map(t => `ALERTA ROJA: ${t.nombre} lleva ${t.veces_postergada} días sin completarse`);

  return { resumen: 'Plan generado automáticamente. Revisa y ajusta según tu criterio.', bloques, alertas };
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

function construirPrompt({ cursos, tareas, bloqueados, fecha, dia, fechaManana, diaManana, horasLibresHoy, horasLibresManana, postergadas, intensidad }) {
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

  return `Eres un planificador académico. Hoy es ${fecha} (${dia}).
Intensidad del día: ${intensidad.toUpperCase()}.

════════════════════════════════
DATOS DEL DÍA
════════════════════════════════

CLASES HOY:
${cursosHoy.length ? cursosHoy.map((c) => `- ${c.nombre} de ${c.hora_inicio} a ${c.hora_fin}`).join('\n') : '- Sin clases'}

BLOQUES BLOQUEADOS HOY:
${bloqueadosHoy.length ? bloqueadosHoy.map((b) => `- ${b.tipo} de ${b.hora_inicio} a ${b.hora_fin}`).join('\n') : '- Ninguno'}

Horas libres estimadas hoy: ${horasLibresHoy}h
Horas libres estimadas mañana (${fechaManana}, ${diaManana}): ${horasLibresManana}h

CONTEXTO DE MAÑANA:
- Cursos: ${cursosManana.length ? cursosManana.map((c) => `${c.nombre} ${c.hora_inicio}-${c.hora_fin}`).join(', ') : 'Ninguno'}
- Bloqueados: ${bloqueadosManana.length ? bloqueadosManana.map((b) => `${b.tipo} ${b.hora_inicio}-${b.hora_fin}`).join(', ') : 'Ninguno'}

════════════════════════════════
TAREAS PENDIENTES (por deadline)
════════════════════════════════

TIPOS — qué significan:
- examen / exposicion: el evento ocurre EN la fecha_entrega. Debes planificar preparación los días PREVIOS.
  Si la fecha_entrega es HOY: no agregues "preparación" (ya es tarde). Solo repaso rápido (≤20 min) si la intensidad es NORMAL o INTENSO y hay tiempo antes del horario del examen.
- proyecto / informe / quiz: entregables. Se puede avanzar hasta el día de entrega.

${tareas.length ? tareas.map((t) =>
  `- ID:${t.id} [${t.cursos?.nombre || 'Sin curso'}] "${t.nombre}"` +
  ` | tipo: ${t.tipo} | entrega: ${t.fecha_entrega}` +
  ` | dificultad: ${t.dificultad} | tiempo: ${t.tiempo_estimado} min` +
  ` | postergada: ${t.veces_postergada} veces` +
  (t.notas ? ` | notas: "${t.notas}"` : '')
).join('\n') : '- Sin tareas pendientes'}

TAREAS NO COMPLETADAS AYER:
${seccionPostergadas}

════════════════════════════════
CÓMO RAZONAR ANTES DE PLANIFICAR
════════════════════════════════

PASO 1 — Analiza cada curso de la lista de tareas:
  → ¿Qué tiene pendiente próximamente?
  → Criterio de prioridad (principio, no fórmula):
    Una tarea difícil con deadline en 3 días > una tarea fácil con deadline en 2 días,
    porque la dificultad exige más tiempo de preparación.

PASO 2 — Aplica la distinción por tipo:
  → examen/exposicion con fecha HOY: solo repaso rápido si la intensidad lo permite.
  → examen/exposicion con fecha MAÑANA o PASADO: priorizar preparación HOY.
  → proyecto/informe/quiz: avanzar según urgencia y tiempo disponible.

PASO 3 — Distribuye progresivamente si hay múltiples deadlines esta semana:
  No acumules todo en el último día. Hoy el más urgente/difícil, mañana y siguientes el resto en orden.
  Usa la comparación horasLibresHoy vs horasLibresManana para decidir cuánto hacer cada día.

PASO 4 — Cursos sin entregable inminente:
  Si hay tiempo libre, puedes sugerir avanzar tareas futuras de ese curso.
  Márcalo como "(opcional)" en el nombre del bloque. No lo impongas.

PASO 5 — Aplica la intensidad:
  - INTENSO: maximiza bloques de estudio. Pausas solo si el bloque > 90 min. Incluye opcionales.
  - NORMAL: distribuye sosteniblemente. Pausa de 10-15 min entre bloques > 60 min. Opcionales solo si hay tiempo cómodo.
  - LIGERO: solo lo urgente (deadline ≤ 2 días) o en alerta roja. Deja "Tiempo libre" si no hay urgencia.

ALERTA ROJA:
  Las tareas marcadas ⚠️ ALERTA ROJA en "no completadas ayer" deben incluirse HOY como primeros bloques de estudio, sin excepción ni importar la intensidad. NO añadas nada en "alertas" para ellas; el sistema lo gestiona automáticamente.

════════════════════════════════
REGLAS DE FORMATO (no negociables)
════════════════════════════════

1. Los BLOQUES BLOQUEADOS HOY aparecen con sus horas exactas y tarea_id: null. No los omitas.
2. tiempo_asignado = exactamente tiempo_estimado de la tarea en minutos. No reducirlo.
   Si dividís la tarea en varios bloques, cada bloque lleva el tiempo parcial correspondiente.
3. tarea_id = ID numérico exacto del prefijo ID:. Si no es tarea real, null.
4. El día cierra con el bloque "dormir". Nada después.
5. Cubre desde las 07:00 sin huecos. Pausas entre bloques usan tarea_id: null.
6. Cualquier decisión de diferir una tarea → justificar en "alertas". Nunca escribas mensajes que empiecen con "ALERTA ROJA" en alertas; eso lo maneja el sistema. Si no hay nada especial, [].
7. En "alertas" usa SIEMPRE el nombre de la tarea, nunca el ID numérico (jamás escribas "ID:34" ni similares).

Responde ÚNICAMENTE con JSON válido:
{
  "resumen": "Frase motivacional breve (máx 20 palabras)",
  "bloques": [
    {
      "hora_inicio": "HH:MM",
      "hora_fin": "HH:MM",
      "actividad": "nombre descriptivo",
      "tarea_id": <número o null>,
      "tiempo_asignado": <minutos>
    }
  ],
  "alertas": ["string"]
}`;
}

async function generarDia(intensidad = 'normal') {
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
  const horasLibresHoy    = calcularHorasLibres(cursos, bloqueados, dia);

  const prompt = construirPrompt({
    cursos,
    tareas: tareasActualizadas,
    bloqueados,
    fecha,
    dia,
    fechaManana,
    diaManana,
    horasLibresHoy,
    horasLibresManana,
    postergadas: postergadasActualizadas,
    intensidad,
  });

  let programacion;
  try {
    const respuestaIA = await generarProgramacion(prompt);
    const match = respuestaIA.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('sin JSON');
    programacion = JSON.parse(match[0]);
  } catch {
    programacion = generarHorarioFallback({ cursos, tareas: tareasActualizadas, bloqueados, dia });
  }

  // Autoridad del servidor: las alertas ALERTA ROJA las genera el backend
  programacion.alertas = (programacion.alertas || []).filter(a => !a.startsWith('ALERTA ROJA'));
  const tareasEnCrisis = tareasActualizadas.filter(t => t.veces_postergada >= UMBRAL_ALERTA_ROJA);
  programacion.alertas.push(...tareasEnCrisis.map(t => `ALERTA ROJA: ${t.nombre} lleva ${t.veces_postergada} días sin completarse`));

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

async function ejecutarCrisisAction(accion, intensidad = 'normal') {
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

  const horasLibresHoy = calcularHorasLibres(cursos, bloqueados, dia);

  const prompt = construirPrompt({
    cursos, tareas, bloqueados, fecha, dia,
    fechaManana, diaManana,
    horasLibresHoy, horasLibresManana,
    postergadas: tareasCrisis, intensidad,
  }) + instruccionEspecial;

  let programacion;
  try {
    const respuestaIA = await generarProgramacion(prompt);
    const match = respuestaIA.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('sin JSON');
    programacion = JSON.parse(match[0]);
  } catch {
    programacion = generarHorarioFallback({ cursos, tareas, bloqueados, dia });
  }

  // Autoridad del servidor: las alertas ALERTA ROJA las genera el backend
  programacion.alertas = (programacion.alertas || []).filter(a => !a.startsWith('ALERTA ROJA'));
  programacion.alertas.push(...tareasCrisis.map(t => `ALERTA ROJA: ${t.nombre} lleva ${t.veces_postergada} días sin completarse`));

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
