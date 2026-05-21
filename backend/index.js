require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
}));
app.use(express.json());

const studyRoutes              = require('./src/modules/study/routes/studyRoutes');
const tareasRoutes             = require('./src/modules/study/routes/tareasRoutes');
const cursosRoutes             = require('./src/modules/study/routes/cursosRoutes');
const horariosRoutes           = require('./src/modules/study/routes/horariosRoutes');
const programacionTareasRoutes = require('./src/modules/study/routes/programacionTareasRoutes');
const estadisticasRoutes       = require('./src/modules/study/routes/estadisticasRoutes');
const historialRoutes          = require('./src/modules/study/routes/historialRoutes');

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'gutStudy backend corriendo' });
});

app.use('/study',                studyRoutes);
app.use('/tareas',               tareasRoutes);
app.use('/cursos',               cursosRoutes);
app.use('/horarios',             horariosRoutes);
app.use('/programacion-tareas',  programacionTareasRoutes);
app.use('/estadisticas',         estadisticasRoutes);
app.use('/historial',            historialRoutes);

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});