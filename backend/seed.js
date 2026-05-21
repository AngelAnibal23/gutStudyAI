require('dotenv').config();
const supabase = require('./src/core/db/supabase');

async function seed() {
  console.log('Insertando cursos...');
  await supabase.from('cursos').upsert([
    { id: 1, nombre: 'Arquitectura de Computadores', hora_inicio: '14:30', hora_fin: '15:20' },
    { id: 2, nombre: 'Diseño de Sistemas',           hora_inicio: '16:10', hora_fin: '17:00' },
    { id: 3, nombre: 'Compiladores y Teoría del Lenguaje', hora_inicio: '15:20', hora_fin: '16:10' },
    { id: 4, nombre: 'Base de Datos I',              hora_inicio: '17:00', hora_fin: '17:50' },
    { id: 5, nombre: 'Investigación Operativa I',    hora_inicio: '15:20', hora_fin: '16:10' },
  ], { onConflict: 'id' });

  console.log('Insertando curso_dias...');
  await supabase.from('curso_dias').upsert([
    { id: 1,  curso_id: 1, dia: 'lunes'     },
    { id: 2,  curso_id: 1, dia: 'martes'    },
    { id: 3,  curso_id: 1, dia: 'miercoles' },
    { id: 4,  curso_id: 2, dia: 'lunes'     },
    { id: 5,  curso_id: 2, dia: 'martes'    },
    { id: 6,  curso_id: 3, dia: 'lunes'     },
    { id: 7,  curso_id: 3, dia: 'jueves'    },
    { id: 8,  curso_id: 3, dia: 'viernes'   },
    { id: 9,  curso_id: 4, dia: 'jueves'    },
    { id: 10, curso_id: 4, dia: 'viernes'   },
    { id: 11, curso_id: 5, dia: 'miercoles' },
    { id: 12, curso_id: 5, dia: 'jueves'    },
  ], { onConflict: 'id' });

  console.log('Insertando horario_bloqueado...');
  await supabase.from('horario_bloqueado').upsert([
    { id: 1, tipo: 'universidad', hora_inicio: '13:40', hora_fin: '20:20' },
    { id: 2, tipo: 'gym',         hora_inicio: '20:00', hora_fin: '22:00' },
    { id: 3, tipo: 'dormir',      hora_inicio: '00:00', hora_fin: '07:00' },
  ], { onConflict: 'id' });

  console.log('Insertando horario_bloqueado_dias...');
  await supabase.from('horario_bloqueado_dias').upsert([
    { id: 1,  horario_bloqueado_id: 1, dia: 'lunes'     },
    { id: 2,  horario_bloqueado_id: 1, dia: 'martes'    },
    { id: 3,  horario_bloqueado_id: 1, dia: 'miercoles' },
    { id: 4,  horario_bloqueado_id: 1, dia: 'jueves'    },
    { id: 5,  horario_bloqueado_id: 1, dia: 'viernes'   },
    { id: 6,  horario_bloqueado_id: 2, dia: 'lunes'     },
    { id: 7,  horario_bloqueado_id: 2, dia: 'martes'    },
    { id: 8,  horario_bloqueado_id: 2, dia: 'miercoles' },
    { id: 9,  horario_bloqueado_id: 2, dia: 'viernes'   },
    { id: 10, horario_bloqueado_id: 2, dia: 'sabado'    },
    { id: 11, horario_bloqueado_id: 3, dia: 'lunes'     },
    { id: 12, horario_bloqueado_id: 3, dia: 'martes'    },
    { id: 13, horario_bloqueado_id: 3, dia: 'miercoles' },
    { id: 14, horario_bloqueado_id: 3, dia: 'jueves'    },
    { id: 15, horario_bloqueado_id: 3, dia: 'viernes'   },
    { id: 16, horario_bloqueado_id: 3, dia: 'sabado'    },
    { id: 17, horario_bloqueado_id: 3, dia: 'domingo'   },
  ], { onConflict: 'id' });

  console.log('Insertando tareas...');
  await supabase.from('tareas').upsert([
    { id: 1,  curso_id: 1, nombre: 'Lab: pipeline MIPS en simulador',        tipo: 'tarea',      fecha_entrega: '2026-05-21', dificultad: 3, tiempo_estimado: 120, estado: 'pendiente', veces_postergada: 0 },
    { id: 2,  curso_id: 1, nombre: 'Exposición: memoria caché y políticas',   tipo: 'exposicion', fecha_entrega: '2026-05-19', dificultad: 4, tiempo_estimado: 90,  estado: 'pendiente', veces_postergada: 0 },
    { id: 3,  curso_id: 1, nombre: 'Proyecto: CPU básica en Logisim',         tipo: 'proyecto',   fecha_entrega: '2026-05-23', dificultad: 5, tiempo_estimado: 300, estado: 'pendiente', veces_postergada: 0 },
    { id: 4,  curso_id: 2, nombre: 'Diagrama UML: sistema de biblioteca',     tipo: 'tarea',      fecha_entrega: '2026-05-20', dificultad: 3, tiempo_estimado: 90,  estado: 'pendiente', veces_postergada: 0 },
    { id: 5,  curso_id: 2, nombre: 'Exposición: patrones de diseño GoF',      tipo: 'exposicion', fecha_entrega: '2026-05-19', dificultad: 4, tiempo_estimado: 60,  estado: 'pendiente', veces_postergada: 0 },
    { id: 6,  curso_id: 2, nombre: 'Proyecto: sistema gestión académica',     tipo: 'proyecto',   fecha_entrega: '2026-05-24', dificultad: 5, tiempo_estimado: 360, estado: 'pendiente', veces_postergada: 0 },
    { id: 7,  curso_id: 3, nombre: 'Práctica: analizador léxico en Python',   tipo: 'tarea',      fecha_entrega: '2026-05-22', dificultad: 4, tiempo_estimado: 150, estado: 'pendiente', veces_postergada: 0 },
    { id: 8,  curso_id: 3, nombre: 'Tarea: gramáticas libres de contexto',    tipo: 'tarea',      fecha_entrega: '2026-05-18', dificultad: 3, tiempo_estimado: 60,  estado: 'pendiente', veces_postergada: 0 },
    { id: 9,  curso_id: 3, nombre: 'Exposición: análisis sintáctico LL(1)',   tipo: 'exposicion', fecha_entrega: '2026-05-19', dificultad: 4, tiempo_estimado: 75,  estado: 'pendiente', veces_postergada: 0 },
    { id: 10, curso_id: 4, nombre: 'Práctica SQL: JOINs avanzados',           tipo: 'tarea',      fecha_entrega: '2026-05-20', dificultad: 3, tiempo_estimado: 90,  estado: 'pendiente', veces_postergada: 0 },
    { id: 11, curso_id: 4, nombre: 'Proyecto: BD para e-commerce',            tipo: 'proyecto',   fecha_entrega: '2026-05-23', dificultad: 5, tiempo_estimado: 240, estado: 'pendiente', veces_postergada: 0 },
    { id: 12, curso_id: 4, nombre: 'Estudio: normalización 3FN (examen)',     tipo: 'examen',     fecha_entrega: '2026-05-21', dificultad: 4, tiempo_estimado: 120, estado: 'pendiente', veces_postergada: 0 },
    { id: 13, curso_id: 5, nombre: 'Ejercicios: método simplex',              tipo: 'tarea',      fecha_entrega: '2026-05-19', dificultad: 3, tiempo_estimado: 90,  estado: 'pendiente', veces_postergada: 0 },
    { id: 14, curso_id: 5, nombre: 'Exposición: prog. lineal entera',         tipo: 'exposicion', fecha_entrega: '2026-05-19', dificultad: 4, tiempo_estimado: 60,  estado: 'pendiente', veces_postergada: 0 },
    { id: 15, curso_id: 5, nombre: 'Examen parcial: unidades 1-3',            tipo: 'examen',     fecha_entrega: '2026-05-22', dificultad: 5, tiempo_estimado: 180, estado: 'pendiente', veces_postergada: 0 },
  ], { onConflict: 'id' });

  console.log('✓ Seed completado. Todos los datos insertados.');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Error en seed:', err.message);
  process.exit(1);
});
