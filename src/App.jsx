import { useState, useCallback, useEffect } from 'react';
import TitleBar from './components/TitleBar';
import Sidebar from './components/Sidebar';
import HomeView from './views/HomeView';
import ConverterView from './views/ConverterView';
import SettingsView from './views/SettingsView';

export default function App() {
  const [view, setView] = useState('home');
  const [theme, setTheme] = useState('dark');
  const [target, setTarget] = useState(null);
  const [selectedIcon, setSelectedIcon] = useState(null);
  const [iconRefreshKey, setIconRefreshKey] = useState(0);
  const [logo, setLogo] = useState(null);

  // Load theme + logo on mount
  useEffect(() => {
    window.electronAPI?.getTheme().then((t) => {
      setTheme(t || 'dark');
    });
    window.electronAPI?.getLogo().then((l) => {
      if (l) setLogo(l);
    });
  }, []);

  // Apply theme to DOM
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    window.electronAPI?.setTheme(next);
  }, [theme]);

  const triggerIconRefresh = useCallback(() => {
    setIconRefreshKey((k) => k + 1);
  }, []);

  return (
    <div className="app">
      <TitleBar logo={logo} />
      <div className="app-body">
        <Sidebar view={view} setView={setView} theme={theme} toggleTheme={toggleTheme} logo={logo} />
        <main className="main-content">
          {view === 'home' && (
            <HomeView
              target={target}
              setTarget={setTarget}
              selectedIcon={selectedIcon}
              setSelectedIcon={setSelectedIcon}
              iconRefreshKey={iconRefreshKey}
            />
          )}
          {view === 'converter' && (
            <ConverterView onConvertDone={triggerIconRefresh} />
          )}
          {view === 'settings' && (
            <SettingsView
              onFolderChange={triggerIconRefresh}
              theme={theme}
              toggleTheme={toggleTheme}
            />
          )}
        </main>
      </div>
    </div>
  );
}
