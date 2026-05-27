import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useTheme } from './contexts/ThemeContext';
import Sidebar from './components/layout/Sidebar';
import BottomNav from './components/layout/BottomNav';
import Home from './pages/Home';
import Tareas from './pages/Tareas';
import Configuracion from './pages/Configuracion';
import Estadisticas from './pages/Estadisticas';
import Historial from './pages/Historial';
import Reporte from './pages/Reporte';
import { ToastProvider } from './components/ui/Toast';
import './styles/globals.css';
import './App.css';

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function lsGet(key, fallback) {
  try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : fallback; }
  catch { return fallback; }
}

function lsSet(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

function lsDel(...keys) {
  try { keys.forEach(k => localStorage.removeItem(k)); } catch {}
}

export default function App() {
  const { theme, toggleTheme } = useTheme();
  const [programacion, setProgramacionRaw] = useState(() => {
    const p = lsGet('gutStudy_prog', null);
    return p?.fecha === todayStr() ? p : null;
  });

  const [checks, setChecks] = useState(() => lsGet('gutStudy_checks', {}));

  // Sync checks to localStorage on every change
  useEffect(() => { lsSet('gutStudy_checks', checks); }, [checks]);

  function setProgramacion(data) {
    setProgramacionRaw(data);
    if (data) lsSet('gutStudy_prog', data);
    else lsDel('gutStudy_prog', 'gutStudy_checks');
  }

  return (
    <BrowserRouter>
      <ToastProvider>
        <div className="app-layout">
          <Sidebar />
          <main className="app-main">
            <Routes>
              <Route path="/" element={
                <Home
                  programacion={programacion}
                  setProgramacion={setProgramacion}
                  checks={checks}
                  setChecks={setChecks}
                />
              } />
              <Route path="/tareas" element={<Tareas />} />
              <Route path="/estadisticas" element={<Estadisticas />} />
              <Route path="/historial" element={<Historial />} />
              <Route path="/configuracion" element={<Configuracion />} />
              <Route path="/reporte" element={<Reporte />} />
            </Routes>
          </main>
          <BottomNav />
          <button
            className="theme-fab"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
          >
            {theme === 'dark' ? (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5"/>
                <line x1="12" y1="1" x2="12" y2="3"/>
                <line x1="12" y1="21" x2="12" y2="23"/>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                <line x1="1" y1="12" x2="3" y2="12"/>
                <line x1="21" y1="12" x2="23" y2="12"/>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
              </svg>
            ) : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
            )}
          </button>
        </div>
      </ToastProvider>
    </BrowserRouter>
  );
}
