const supabase = require('../../../core/db/supabase');

async function getCursos() {
  const { data, error } = await supabase
    .from('cursos')
    .select('*, curso_dias(dia)');
  if (error) throw error;
  return data;
}

async function getTareasPendientes() {
  const { data, error } = await supabase
    .from('tareas')
    .select('*, cursos(nombre)')
    .eq('estado', 'pendiente')
    .order('fecha_entrega', { ascending: true });
  if (error) throw error;
  return data;
}

async function getHorariosBloqueados() {
  const { data, error } = await supabase
    .from('horario_bloqueado')
    .select('*, horario_bloqueado_dias(dia)');
  if (error) throw error;
  return data;
}

async function guardarProgramacion(fecha, tareasConTiempo) {
  const { data: prog, error: progError } = await supabase
    .from('programaciones')
    .upsert({ fecha, hubo_crisis: false }, { onConflict: 'fecha' })
    .select()
    .single();
  if (progError) throw progError;

  // Preservar completada de tareas que ya estaban antes de regenerar
  const { data: existentes } = await supabase
    .from('programacion_tareas')
    .select('tarea_id, completada')
    .eq('programacion_id', prog.id);
  const completadaMap = new Map((existentes || []).map(e => [e.tarea_id, e.completada]));

  await supabase.from('programacion_tareas').delete().eq('programacion_id', prog.id);

  const filas = tareasConTiempo.map((t) => ({
    programacion_id: prog.id,
    tarea_id: t.tarea_id,
    tiempo_asignado: t.tiempo_asignado,
    completada: completadaMap.get(t.tarea_id) ?? false,
    fue_postergada: t.fue_postergada || false,
  }));

  const { error: tareasError } = await supabase
    .from('programacion_tareas')
    .insert(filas);
  if (tareasError) throw tareasError;

  return prog;
}

async function existeProgramacion(fecha) {
  const { data } = await supabase
    .from('programaciones')
    .select('id')
    .eq('fecha', fecha)
    .maybeSingle();
  return !!data;
}

async function getTareasNoCompletadasAyer() {
  const ayer = new Date();
  ayer.setDate(ayer.getDate() - 1);
  const fechaAyer = `${ayer.getFullYear()}-${String(ayer.getMonth() + 1).padStart(2, '0')}-${String(ayer.getDate()).padStart(2, '0')}`;

  const { data: prog } = await supabase
    .from('programaciones')
    .select('id')
    .eq('fecha', fechaAyer)
    .maybeSingle();

  if (!prog) return [];

  const { data, error } = await supabase
    .from('programacion_tareas')
    .select('tarea_id, tareas(id, nombre, tipo, fecha_entrega, dificultad, tiempo_estimado, veces_postergada, cursos(nombre))')
    .eq('programacion_id', prog.id)
    .eq('completada', false);

  if (error) throw error;
  return data.map((r) => r.tareas).filter(Boolean);
}

async function incrementarPostergadaDirecto(tarea_id) {
  const { data: tarea } = await supabase
    .from('tareas')
    .select('veces_postergada')
    .eq('id', tarea_id)
    .maybeSingle();

  if (!tarea) return;

  await supabase
    .from('tareas')
    .update({ veces_postergada: tarea.veces_postergada + 1 })
    .eq('id', tarea_id);
}

async function getProgramacionTareasHoy(fecha) {
  const { data: prog } = await supabase
    .from('programaciones')
    .select('id')
    .eq('fecha', fecha)
    .maybeSingle();
  if (!prog) return [];
  const { data, error } = await supabase
    .from('programacion_tareas')
    .select('id, tarea_id, completada')
    .eq('programacion_id', prog.id);
  if (error) throw error;
  return data;
}

async function actualizarCompletada(id, completada) {
  const { error } = await supabase
    .from('programacion_tareas')
    .update({ completada })
    .eq('id', id);
  if (error) throw error;
}

// ── TAREAS CRUD ──────────────────────────────────────────────────────────────

async function getTareas() {
  const { data, error } = await supabase
    .from('tareas')
    .select('*, cursos(nombre)')
    .order('fecha_entrega', { ascending: true });
  if (error) throw error;
  return data;
}

async function crearTarea({ nombre, curso_id, tipo, fecha_entrega, dificultad, tiempo_estimado, notas }) {
  const { data, error } = await supabase
    .from('tareas')
    .insert({ nombre, curso_id, tipo, fecha_entrega, dificultad, tiempo_estimado, notas: notas || null, estado: 'pendiente', veces_postergada: 0 })
    .select('*, cursos(nombre)')
    .single();
  if (error) throw error;
  return data;
}

async function eliminarTarea(id) {
  await supabase.from('programacion_tareas').delete().eq('tarea_id', id);
  const { error } = await supabase.from('tareas').delete().eq('id', id);
  if (error) throw error;
}

async function actualizarTarea(id, { nombre, curso_id, tipo, fecha_entrega, dificultad, tiempo_estimado, notas }) {
  const { data, error } = await supabase
    .from('tareas')
    .update({ nombre, curso_id, tipo, fecha_entrega, dificultad, tiempo_estimado, notas: notas || null })
    .eq('id', id)
    .select('*, cursos(nombre)')
    .single();
  if (error) throw error;
  return data;
}

async function insertarTareasBulk(tareas) {
  const { data, error } = await supabase
    .from('tareas')
    .insert(tareas.map(t => ({
      nombre: t.nombre,
      curso_id: t.curso_id || null,
      tipo: t.tipo,
      fecha_entrega: t.fecha_entrega,
      dificultad: t.dificultad,
      tiempo_estimado: t.tiempo_estimado,
      notas: t.notas || null,
      estado: 'pendiente',
      veces_postergada: 0,
    })))
    .select('*, cursos(nombre)');
  if (error) throw error;
  return data;
}

async function actualizarEstadoTarea(id, estado) {
  const campos = { estado };
  if (estado === 'completada') campos.veces_postergada = 0;
  const { data, error } = await supabase
    .from('tareas')
    .update(campos)
    .eq('id', id)
    .select('*, cursos(nombre)')
    .single();
  if (error) throw error;
  return data;
}

// ── CURSOS CRUD ───────────────────────────────────────────────────────────────

async function crearCurso({ nombre, hora_inicio, hora_fin, dias }) {
  const { data: curso, error } = await supabase
    .from('cursos')
    .insert({ nombre, hora_inicio, hora_fin })
    .select()
    .single();
  if (error) throw error;

  if (dias && dias.length > 0) {
    const { error: diasError } = await supabase
      .from('curso_dias')
      .insert(dias.map(dia => ({ curso_id: curso.id, dia })));
    if (diasError) throw diasError;
  }

  return { ...curso, curso_dias: (dias || []).map(dia => ({ dia })) };
}

async function actualizarCurso(id, { nombre, hora_inicio, hora_fin, dias }) {
  const { data: curso, error } = await supabase
    .from('cursos')
    .update({ nombre, hora_inicio, hora_fin })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;

  await supabase.from('curso_dias').delete().eq('curso_id', id);
  if (dias && dias.length > 0) {
    const { error: diasError } = await supabase
      .from('curso_dias')
      .insert(dias.map(dia => ({ curso_id: id, dia })));
    if (diasError) throw diasError;
  }

  return { ...curso, curso_dias: (dias || []).map(dia => ({ dia })) };
}

async function eliminarCurso(id) {
  await supabase.from('curso_dias').delete().eq('curso_id', id);
  const { error } = await supabase.from('cursos').delete().eq('id', id);
  if (error) throw error;
}

// ── HORARIOS CRUD ─────────────────────────────────────────────────────────────

async function crearHorario({ tipo, hora_inicio, hora_fin, dias }) {
  const { data: horario, error } = await supabase
    .from('horario_bloqueado')
    .insert({ tipo, hora_inicio, hora_fin })
    .select()
    .single();
  if (error) throw error;

  if (dias && dias.length > 0) {
    const { error: diasError } = await supabase
      .from('horario_bloqueado_dias')
      .insert(dias.map(dia => ({ horario_bloqueado_id: horario.id, dia })));
    if (diasError) throw diasError;
  }

  return { ...horario, horario_bloqueado_dias: dias.map(dia => ({ dia })) };
}

async function actualizarHorario(id, { tipo, hora_inicio, hora_fin, dias }) {
  const { data: horario, error } = await supabase
    .from('horario_bloqueado')
    .update({ tipo, hora_inicio, hora_fin })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;

  await supabase.from('horario_bloqueado_dias').delete().eq('horario_bloqueado_id', id);
  if (dias && dias.length > 0) {
    const { error: diasError } = await supabase
      .from('horario_bloqueado_dias')
      .insert(dias.map(dia => ({ horario_bloqueado_id: id, dia })));
    if (diasError) throw diasError;
  }

  return { ...horario, horario_bloqueado_dias: (dias || []).map(dia => ({ dia })) };
}

async function eliminarHorario(id) {
  await supabase.from('horario_bloqueado_dias').delete().eq('horario_bloqueado_id', id);
  const { error } = await supabase.from('horario_bloqueado').delete().eq('id', id);
  if (error) throw error;
}

module.exports = {
  getCursos,
  getTareasPendientes,
  getHorariosBloqueados,
  guardarProgramacion,
  existeProgramacion,
  getTareasNoCompletadasAyer,
  incrementarPostergadaDirecto,
  getProgramacionTareasHoy,
  actualizarCompletada,
  getTareas,
  crearTarea,
  insertarTareasBulk,
  eliminarTarea,
  actualizarTarea,
  actualizarEstadoTarea,
  crearCurso,
  actualizarCurso,
  eliminarCurso,
  crearHorario,
  actualizarHorario,
  eliminarHorario,
};
