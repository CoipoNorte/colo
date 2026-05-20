import { useState, useEffect, useMemo, useRef } from 'react';

export default function IconGrid({ selectedIcon, onSelectIcon, refreshKey }) {
  const [icons, setIcons] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [failedThumbs, setFailedThumbs] = useState(new Set());
  const lastRefreshKey = useRef(refreshKey);

  const loadIcons = async () => {
    setLoading(true);
    setFailedThumbs(new Set());
    try {
      const result = await window.electronAPI.scanIcons();
      setIcons(result || []);
    } catch {
      setIcons([]);
    }
    setLoading(false);
  };

  // Load on mount
  useEffect(() => {
    loadIcons();
  }, []);

  // Reload when refreshKey changes (from converter or settings)
  useEffect(() => {
    if (refreshKey !== lastRefreshKey.current) {
      lastRefreshKey.current = refreshKey;
      loadIcons();
    }
  }, [refreshKey]);

  const filtered = useMemo(() => {
    if (!search.trim()) return icons;
    const q = search.toLowerCase();
    return icons.filter((i) => i.name.toLowerCase().includes(q));
  }, [icons, search]);

  const handleBrowseIco = async () => {
    const ico = await window.electronAPI.selectIcoFile();
    if (ico) onSelectIcon(ico);
  };

  const handleImgError = (iconPath) => {
    setFailedThumbs((prev) => new Set([...prev, iconPath]));
  };

  return (
    <div className="icon-grid-container">
      <div className="card-title">🖼️ Iconos disponibles</div>

      <div className="icon-grid-toolbar">
        <input
          className="icon-search"
          type="text"
          placeholder="Buscar icono..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <span className="icon-count">{filtered.length} iconos</span>
        <button className="btn-browse" onClick={loadIcons} title="Reescanear">🔄</button>
        <button className="btn-browse" onClick={handleBrowseIco} title="Buscar .ico">📂 .ico</button>
      </div>

      {loading ? (
        <div className="loading-spinner">
          <div className="spinner"></div>
          Escaneando iconos...
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">📭</span>
          <span>No se encontraron archivos .ico</span>
          <span>Cambia la carpeta en Configuración</span>
        </div>
      ) : (
        <div className="icon-grid">
          {filtered.map((icon) => (
            <div
              key={icon.path}
              className={`icon-item ${selectedIcon?.path === icon.path ? 'selected' : ''}`}
              onClick={() => onSelectIcon(icon)}
              title={icon.name}
            >
              {icon.thumb && !failedThumbs.has(icon.path) ? (
                <img
                  src={icon.thumb}
                  alt={icon.name}
                  onError={() => handleImgError(icon.path)}
                  loading="lazy"
                  draggable={false}
                />
              ) : (
                <div className="icon-fallback">🔷</div>
              )}
              <span className="icon-label">{icon.name.replace('.ico', '')}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
