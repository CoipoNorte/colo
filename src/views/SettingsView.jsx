import { useState, useEffect } from 'react';
import Toast from '../components/Toast';

export default function SettingsView({ onFolderChange, theme, toggleTheme }) {
  const [iconFolder, setIconFolder] = useState('');
  const [outputFolder, setOutputFolder] = useState('');
  const [toast, setToast] = useState(null);

  useEffect(() => {
    window.electronAPI.getIconFolder().then(setIconFolder);
    window.electronAPI.getOutputFolder().then(setOutputFolder);
  }, []);

  const handleChangeIconFolder = async () => {
    const folder = await window.electronAPI.selectIconFolder();
    if (folder) {
      setIconFolder(folder);
      setToast({ message: 'Carpeta de iconos actualizada', type: 'success' });
      if (onFolderChange) onFolderChange();
    }
  };

  const handleChangeOutputFolder = async () => {
    const folder = await window.electronAPI.selectOutputFolder();
    if (folder) {
      setOutputFolder(folder);
      setToast({ message: 'Carpeta destino actualizada', type: 'success' });
    }
  };

  const handleRefreshCache = async () => {
    await window.electronAPI.refreshCache();
    setToast({ message: 'Cache refrescado', type: 'success' });
  };

  const handleRestartExplorer = async () => {
    setToast({ message: 'Reiniciando Explorer...', type: 'success' });
    await window.electronAPI.restartExplorer();
  };

  return (
    <div>
      <div className="view-header">
        <h1>⚙️ Configuración</h1>
        <p>Ajusta carpetas, tema y herramientas</p>
      </div>

      <div className="settings-grid">
        {/* Theme */}
        <div className="card">
          <div className="card-title">🎨 Apariencia</div>
          <div className="settings-section">
            <div className="setting-label">Tema</div>
            <div className="theme-toggle-row">
              <button className={`theme-btn ${theme === 'dark' ? 'active' : ''}`} onClick={() => theme !== 'dark' && toggleTheme()}>
                🌙 Oscuro
              </button>
              <button className={`theme-btn ${theme === 'light' ? 'active' : ''}`} onClick={() => theme !== 'light' && toggleTheme()}>
                ☀️ Claro
              </button>
            </div>
          </div>
        </div>

        {/* Icon source folder */}
        <div className="card">
          <div className="card-title">🔍 Carpeta de iconos (origen)</div>
          <div className="settings-section">
            <div className="setting-desc">Carpeta donde se buscan los .ico para mostrar en la grilla</div>
            <div className="setting-row">
              <input className="setting-path" value={iconFolder} readOnly />
              <button className="btn btn-secondary btn-sm" onClick={handleChangeIconFolder}>Cambiar</button>
            </div>
          </div>
        </div>

        {/* Output folder */}
        <div className="card">
          <div className="card-title">💾 Carpeta destino (conversión)</div>
          <div className="settings-section">
            <div className="setting-desc">Donde se guardan los .ico convertidos desde PNG</div>
            <div className="setting-row">
              <input className="setting-path" value={outputFolder} readOnly />
              <button className="btn btn-secondary btn-sm" onClick={handleChangeOutputFolder}>Cambiar</button>
            </div>
          </div>
        </div>

        {/* Cache tools */}
        <div className="card">
          <div className="card-title">⚡ Herramientas de cache</div>
          <div className="settings-section">
            <div className="setting-desc">
              Windows cachea los iconos. Si un cambio no se refleja usa estas herramientas.
            </div>
            <div className="cache-buttons">
              <button className="btn btn-secondary btn-sm" onClick={handleRefreshCache}>
                🔄 Refrescar cache
              </button>
              <button className="btn btn-secondary btn-sm btn-warn" onClick={handleRestartExplorer}>
                ⚠️ Reiniciar Explorer
              </button>
            </div>
            <div className="setting-desc" style={{ marginTop: 10 }}>
              💡 <kbd>F5</kbd> en el explorador también ayuda
            </div>
          </div>
        </div>

        {/* About */}
        <div className="card" style={{ gridColumn: '1 / -1' }}>
          <div className="card-title">🐾 Acerca de COLO</div>
          <div className="settings-section">
            <div className="setting-desc">
              <strong>COLO v2.1</strong> — Icon Changer<br /><br />
              • Cambia iconos de carpetas (desktop.ini)<br />
              • Cambia iconos de accesos directos (.lnk)<br />
              • Convierte PNG/JPG/WEBP → ICO multi-tamaño<br />
              • Los .ico deben permanecer donde están (no moverlos después)<br /><br />
              🐾 Nombrado en honor al Colocolo, felino silvestre de Chile
            </div>
          </div>
        </div>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
