import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    const stored = localStorage.getItem('gutStudy_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', stored);
    return stored;
  });

  const [collapsed, setCollapsed] = useState(() => {
    const stored = localStorage.getItem('gutStudy_sidebar') === 'collapsed';
    document.documentElement.setAttribute('data-sidebar', stored ? 'collapsed' : 'expanded');
    return stored;
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('gutStudy_theme', theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute('data-sidebar', collapsed ? 'collapsed' : 'expanded');
    localStorage.setItem('gutStudy_sidebar', collapsed ? 'collapsed' : 'expanded');
  }, [collapsed]);

  function toggleTheme() {
    setTheme(t => (t === 'dark' ? 'light' : 'dark'));
  }

  function toggleSidebar() {
    setCollapsed(c => !c);
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, collapsed, toggleSidebar }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
