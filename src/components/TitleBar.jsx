import { useState } from 'react';

export default function TitleBar({ logo }) {
  const [isMax, setIsMax] = useState(false);

  const minimize = () => window.electronAPI?.minimize();
  const maximize = async () => {
    const maximized = await window.electronAPI?.maximize();
    setIsMax(maximized);
  };
  const close = () => window.electronAPI?.close();

  return (
    <div className="titlebar">
      <div className="titlebar-title">
        {logo ? (
          <img src={logo} alt="Colo" className="titlebar-logo" />
        ) : (
          <span className="icon">🐾</span>
        )}
        COLO
      </div>
      <div className="titlebar-controls">
        <button className="tb-btn tb-minimize" onClick={minimize} title="Minimizar">
          <svg width="10" height="1" viewBox="0 0 10 1">
            <rect width="10" height="1" fill="currentColor"/>
          </svg>
        </button>
        <button className="tb-btn tb-maximize" onClick={maximize} title={isMax ? 'Restaurar' : 'Maximizar'}>
          {isMax ? (
            <svg width="10" height="10" viewBox="0 0 10 10">
              <path d="M2 0h8v8H8V1H2V0zM0 2h8v8H0V2zm1 1v6h6V3H1z" fill="currentColor"/>
            </svg>
          ) : (
            <svg width="10" height="10" viewBox="0 0 10 10">
              <rect x="0.5" y="0.5" width="9" height="9" rx="0.5" stroke="currentColor" strokeWidth="1" fill="none"/>
            </svg>
          )}
        </button>
        <button className="tb-btn tb-close" onClick={close} title="Cerrar">
          <svg width="10" height="10" viewBox="0 0 10 10">
            <path d="M1 1l8 8M9 1l-8 8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
