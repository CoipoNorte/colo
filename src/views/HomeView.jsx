import { useState, useCallback } from 'react';
import IconGrid from '../components/IconGrid';
import Toast from '../components/Toast';

export default function HomeView({ target, setTarget, selectedIcon, setSelectedIcon, iconRefreshKey }) {
  const [applying, setApplying] = useState(false);
  const [toast, setToast] = useState(null);
  const [lastApplied, setLastApplied] = useState(null);

  const handleSelectFolder = async () => {
    const result = await window.electronAPI.selectFolder();
    if (result) setTarget(result);
  };

  const handleSelectFile = async () => {
    const result = await window.electronAPI.selectFile();
    if (result) setTarget(result);
  };

  const handleApply = async () => {
    if (!target || !selectedIcon || applying) return;
    setApplying(true);

    try {
      let result;

      if (target.isDirectory) {
        result = await window.electronAPI.applyToFolder({
          targetPath: target.path,
          iconPath: selectedIcon.path,
        });
      } else if (target.isLnk) {
        result = await window.electronAPI.applyToShortcut({
          targetPath: target.path,
          iconPath: selectedIcon.path,
        });
      } else if (target.isExe) {
        result = await window.electronAPI.applyToExe({
          targetPath: target.path,
          iconPath: selectedIcon.path,
        });
      } else {
        // Other files — create shortcut
        const shortcutDir = await window.electronAPI.selectShortcutDir();
        if (!shortcutDir) {
          setApplying(false);
          return;
        }
        result = await window.electronAPI.createShortcut({
          targetPath: target.path,
          iconPath: selectedIcon.path,
          shortcutDir,
        });
      }

      if (result.success) {
        setToast({ message: result.message, type: 'success' });
        setLastApplied({ targetName: target.name, iconName: selectedIcon.name, timestamp: Date.now() });
      } else {
        setToast({ message: result.message, type: 'error' });
      }
    } catch (e) {
      setToast({ message: 'Error: ' + e.message, type: 'error' });
    }

    setApplying(false);
  };

  const handleRefreshNow = async () => {
    await window.electronAPI.refreshCache(target?.path || null);
    setToast({ message: 'Cache refrescado', type: 'success' });
  };

  const handleRestartExplorer = async () => {
    setToast({ message: 'Reiniciando Explorer...', type: 'success' });
    await window.electronAPI.restartExplorer();
  };

  const handleCloseToast = useCallback(() => setToast(null), []);
  const getThumbSrc = (icon) => icon?.thumb || null;

  const getTargetIcon = () => {
    if (!target) return '📂';
    if (target.isDirectory) return '📁';
    if (target.isLnk) return '🔗';
    if (target.isExe) return '⚙️';
    return '📄';
  };

  const getApplyAction = () => {
    if (!target) return '';
    if (target.isDirectory) return 'Cambiar icono de carpeta';
    if (target.isLnk) return 'Cambiar icono del acceso directo';
    if (target.isExe) return 'Cambiar icono del .exe';
    return 'Crear acceso directo con icono';
  };

  const getApplyButtonText = () => {
    if (!target) return 'Aplicar';
    if (target.isDirectory) return '✨ Aplicar a carpeta';
    if (target.isLnk) return '✨ Aplicar a acceso directo';
    if (target.isExe) return '⚙️ Cambiar icono del .exe';
    return '🔗 Crear acceso directo';
  };

  const getTargetHint = () => {
    if (!target) return null;
    if (target.isDirectory) return { type: 'ok', text: 'Se modificará el icono de la carpeta directamente' };
    if (target.isLnk) return { type: 'ok', text: 'Se modificará el icono del acceso directo' };
    if (target.isExe) return { type: 'exe', text: 'Se modificará el icono incrustado en el .exe. El archivo no debe estar en ejecución.' };
    return { type: 'warn', text: 'Se creará un acceso directo con el icono seleccionado' };
  };

  const hint = getTargetHint();

  return (
    <div>
      <div className="view-header">
        <h1>🎯 Cambiar Icono</h1>
        <p>Selecciona una carpeta, .exe, acceso directo o archivo</p>
      </div>

      <div className="layout-two">
        {/* LEFT */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Target */}
          <div className="card">
            <div className="card-title">📁 Objetivo</div>
            <div className="target-selector">
              {!target ? (
                <div className="target-pick-area">
                  <div className="target-pick-btn" onClick={handleSelectFolder}>
                    <span className="pick-icon">📁</span>
                    <span className="pick-label">Carpeta</span>
                    <span className="pick-hint">Cambiar icono directo</span>
                  </div>
                  <div className="target-pick-btn" onClick={handleSelectFile}>
                    <span className="pick-icon">📄</span>
                    <span className="pick-label">Archivo</span>
                    <span className="pick-hint">.exe, .lnk, cualquiera</span>
                  </div>
                </div>
              ) : (
                <>
                  <div className="target-info">
                    <span className="t-icon">{getTargetIcon()}</span>
                    <div className="t-details">
                      <div className="t-name">{target.name}</div>
                      <div className="t-path">{target.path}</div>
                      <div className="t-type">
                        {target.isDirectory && <span className="type-badge type-folder">Carpeta</span>}
                        {target.isLnk && <span className="type-badge type-lnk">Acceso directo</span>}
                        {target.isExe && <span className="type-badge type-exe">.EXE</span>}
                        {!target.isDirectory && !target.isLnk && !target.isExe && (
                          <span className="type-badge type-file">{target.extension || 'Archivo'}</span>
                        )}
                      </div>
                    </div>
                    <button className="t-clear" onClick={() => setTarget(null)}>✕</button>
                  </div>

                  {hint && (
                    <div className={`target-hint hint-${hint.type}`}>
                      {hint.type === 'ok' && '✅ '}
                      {hint.type === 'exe' && '⚙️ '}
                      {hint.type === 'warn' && '🔗 '}
                      {hint.text}
                    </div>
                  )}

                  <div className="target-change-btns">
                    <button className="btn btn-secondary btn-sm" onClick={handleSelectFolder}>
                      📁 Otra carpeta
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={handleSelectFile}>
                      📄 Otro archivo
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Action */}
          {target && selectedIcon && (
            <div className="card">
              <div className="card-title">✨ {getApplyAction()}</div>
              <div className="action-bar">
                <div className="action-preview">
                  {getThumbSrc(selectedIcon) ? (
                    <img src={getThumbSrc(selectedIcon)} alt="" className="action-thumb" />
                  ) : (
                    <div className="action-thumb-fallback">🔷</div>
                  )}
                  <div className="ap-text">
                    <strong>{selectedIcon.name}</strong>
                    <span>→ {target.name}</span>
                  </div>
                </div>
                <button className="btn btn-primary" onClick={handleApply} disabled={applying}>
                  {applying ? (<><span className="spinner-sm"></span> Aplicando...</>) : getApplyButtonText()}
                </button>
              </div>

              {lastApplied && (
                <div className="last-applied">
                  ✅ Último: <strong>{lastApplied.iconName}</strong> → {lastApplied.targetName}
                </div>
              )}
            </div>
          )}

          {/* Tip */}
          {target && !selectedIcon && (
            <div className="card tip-card">
              <div className="tip-text">👉 Ahora selecciona un icono de la derecha</div>
            </div>
          )}

          {/* Refresh tools */}
          {lastApplied && (
            <div className="card">
              <div className="card-title">⚡ ¿No ves el cambio?</div>
              <div className="refresh-help">
                <p>Windows cachea los iconos. Prueba estas opciones:</p>
                <div className="refresh-buttons">
                  <button className="btn btn-secondary btn-sm" onClick={handleRefreshNow}>
                    🔄 Refrescar cache
                  </button>
                  <button className="btn btn-secondary btn-sm btn-warn" onClick={handleRestartExplorer}>
                    ⚠️ Reiniciar Explorer
                  </button>
                </div>
                <p className="refresh-hint">
                  💡 También puedes presionar <kbd>F5</kbd> en el explorador
                </p>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: Icon Grid */}
        <div className="card">
          <IconGrid
            selectedIcon={selectedIcon}
            onSelectIcon={setSelectedIcon}
            refreshKey={iconRefreshKey}
          />
        </div>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={handleCloseToast} />}
    </div>
  );
}
