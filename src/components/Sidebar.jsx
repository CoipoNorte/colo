export default function Sidebar({ view, setView, theme, toggleTheme, logo }) {
  const items = [
    { id: 'home', icon: '🎯', label: 'Cambiar Icono' },
    { id: 'converter', icon: '🔄', label: 'PNG → ICO' },
    { id: 'settings', icon: '⚙️', label: 'Configuración' },
  ];

  return (
    <nav className="sidebar">
      {/* Logo expandido */}
      <div className="sidebar-brand">
        {logo ? (
          <img src={logo} alt="Colo" className="sidebar-logo" />
        ) : (
          <span className="sidebar-logo-emoji">🐾</span>
        )}
      </div>

      <div className="sidebar-divider" />

      {items.map((item) => (
        <div
          key={item.id}
          className={`sidebar-item ${view === item.id ? 'active' : ''}`}
          onClick={() => setView(item.id)}
        >
          <span className="s-icon">{item.icon}</span>
          {item.label}
        </div>
      ))}

      <div style={{ flex: 1 }} />

      {/* Theme toggle */}
      <div className="sidebar-item" onClick={toggleTheme}>
        <span className="s-icon">{theme === 'dark' ? '☀️' : '🌙'}</span>
        {theme === 'dark' ? 'Modo Claro' : 'Modo Oscuro'}
      </div>

      <div className="sidebar-divider" />

      <div className="sidebar-footer">
        <span className="sidebar-version">v2.2</span>
      </div>
    </nav>
  );
}
