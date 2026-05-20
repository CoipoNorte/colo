import { useState, useEffect, useCallback } from 'react';
import Toast from '../components/Toast';

export default function ConverterView({ onConvertDone }) {
  const [pngFiles, setPngFiles] = useState([]);
  const [outputFolder, setOutputFolder] = useState('');
  const [permissions, setPermissions] = useState(null);
  const [converting, setConverting] = useState(false);
  const [results, setResults] = useState([]);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    loadOutputFolder();
  }, []);

  const loadOutputFolder = async () => {
    const folder = await window.electronAPI.getOutputFolder();
    setOutputFolder(folder);
    const perms = await window.electronAPI.checkPermissions(folder);
    setPermissions(perms);
  };

  const handleChangeOutputFolder = async () => {
    const folder = await window.electronAPI.selectOutputFolder();
    if (folder) {
      setOutputFolder(folder);
      const perms = await window.electronAPI.checkPermissions(folder);
      setPermissions(perms);
      setToast({ message: `Carpeta destino: ${folder}`, type: 'success' });
    }
  };

  const handleSelectPng = async () => {
    const files = await window.electronAPI.selectPng();
    if (files.length > 0) {
      setPngFiles((prev) => {
        const existing = new Set(prev.map((f) => f.path));
        const newFiles = files.filter((f) => !existing.has(f.path));
        return [...prev, ...newFiles];
      });
      setResults([]);
    }
  };

  const handleRemoveFile = (idx) => {
    setPngFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleClearAll = () => {
    setPngFiles([]);
    setResults([]);
  };

  const handleConvertAll = async () => {
    if (pngFiles.length === 0) return;
    setConverting(true);
    setResults([]);

    try {
      const res = await window.electronAPI.batchConvertPngToIco({
        pngPaths: pngFiles.map((f) => f.path),
        targetFolder: outputFolder,
      });

      setResults(res);

      const successCount = res.filter((r) => r.success).length;
      const failCount = res.filter((r) => !r.success).length;

      if (failCount === 0) {
        setToast({ message: `${successCount} archivo(s) convertido(s) ✅`, type: 'success' });
      } else if (successCount === 0) {
        setToast({ message: `Error en todos (${failCount}). ¿Permisos?`, type: 'error' });
      } else {
        setToast({ message: `${successCount} OK, ${failCount} con error`, type: 'error' });
      }

      if (successCount > 0 && onConvertDone) onConvertDone();
    } catch (e) {
      setToast({ message: 'Error: ' + e.message, type: 'error' });
    }

    setConverting(false);
  };

  const handleConvertSingle = async (file) => {
    setConverting(true);
    try {
      const result = await window.electronAPI.convertPngToIco({
        pngPath: file.path,
        targetFolder: outputFolder,
      });

      if (result.success) {
        setToast({ message: result.message, type: 'success' });
        setResults((prev) => [...prev, { success: true, name: result.fileName, path: result.filePath, sourceName: file.name }]);
        if (onConvertDone) onConvertDone();
      } else {
        setToast({ message: result.message, type: 'error' });
        setResults((prev) => [...prev, { success: false, name: file.name, error: result.message, sourceName: file.name }]);
      }
    } catch (e) {
      setToast({ message: 'Error: ' + e.message, type: 'error' });
    }
    setConverting(false);
  };

  const handleOpenFolder = () => {
    window.electronAPI.openFolder(outputFolder);
  };

  const getResultForFile = (file) => results.find((r) => r.sourceName === file.name);

  const handleCloseToast = useCallback(() => setToast(null), []);

  const hasResults = results.some((r) => r.success);

  return (
    <div>
      <div className="view-header">
        <h1>🔄 Convertir PNG → ICO</h1>
        <p>Convierte imágenes a formato .ico y guárdalas donde quieras</p>
      </div>

      {/* Output folder */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-title">📂 Carpeta destino</div>
        <div className="dest-section">
          <div className="dest-info">
            <div className="dest-path">
              <span className="dest-folder-icon">📁</span>
              <code>{outputFolder}</code>
            </div>
            <div className="dest-actions-row">
              {permissions && !permissions.needsAdmin ? (
                <span className="perm-badge perm-ok">✅ Permisos OK</span>
              ) : (
                <span className="perm-badge perm-admin">⚠️ Sin permisos</span>
              )}
            </div>
          </div>
          <div className="dest-buttons">
            <button className="btn btn-secondary btn-sm" onClick={handleChangeOutputFolder}>
              📁 Cambiar carpeta
            </button>
            {hasResults && (
              <button className="btn btn-secondary btn-sm" onClick={handleOpenFolder}>
                📂 Abrir en Explorer
              </button>
            )}
          </div>
          <div className="dest-hint">
            💡 Elige una carpeta donde tengas permisos (ej: Documentos, Escritorio)
          </div>
        </div>
      </div>

      {/* File selector */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-title">🖼️ Imágenes a convertir</div>

        <div className="converter-drop" onClick={handleSelectPng}>
          <div className="drop-icon">🖼️</div>
          <div className="drop-text">Seleccionar imágenes</div>
          <div className="drop-hint">PNG, JPG, WEBP, BMP • Selección múltiple</div>
        </div>

        {pngFiles.length > 0 && (
          <>
            <div className="file-list-header">
              <span>{pngFiles.length} archivo(s)</span>
              <button className="btn-link" onClick={handleClearAll}>Limpiar todo</button>
            </div>

            <div className="file-list">
              {pngFiles.map((file, idx) => {
                const result = getResultForFile(file);
                return (
                  <div key={file.path} className={`file-item ${result ? (result.success ? 'file-success' : 'file-error') : ''}`}>
                    {file.thumb ? (
                      <img className="file-thumb" src={file.thumb} alt="" draggable={false} />
                    ) : (
                      <div className="file-thumb-fallback">🖼️</div>
                    )}
                    <div className="file-details">
                      <span className="file-name">{file.name}</span>
                      {result && (
                        <span className={`file-status ${result.success ? 'status-ok' : 'status-err'}`}>
                          {result.success ? `→ ${result.name}` : result.error}
                        </span>
                      )}
                    </div>
                    <div className="file-actions">
                      {!converting && !result && (
                        <button className="btn btn-sm btn-secondary" onClick={() => handleConvertSingle(file)} title="Convertir">▶</button>
                      )}
                      {result?.success && <span className="check-ok">✅</span>}
                      {result && !result.success && <span className="check-err">❌</span>}
                      <button className="btn-icon-sm" onClick={() => handleRemoveFile(idx)} title="Quitar">✕</button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="convert-actions">
              <button className="btn btn-primary" onClick={handleConvertAll} disabled={converting || pngFiles.length === 0}>
                {converting ? (<><span className="spinner-sm"></span> Convirtiendo...</>) : (<>🔄 Convertir todos ({pngFiles.length})</>)}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Info */}
      <div className="card">
        <div className="card-title">💡 Información</div>
        <div className="info-list">
          <div className="info-item"><span>📐</span><span>Genera iconos multi-tamaño: 16, 32, 48, 64, 128, 256px</span></div>
          <div className="info-item"><span>📝</span><span>Nombres duplicados se renombran (_1, _2...)</span></div>
          <div className="info-item"><span>📂</span><span>Elige cualquier carpeta con permisos de escritura</span></div>
          <div className="info-item"><span>🎨</span><span>Transparencia preservada en la conversión</span></div>
        </div>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={handleCloseToast} />}
    </div>
  );
}
