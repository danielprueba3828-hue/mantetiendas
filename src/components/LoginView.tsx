import React from 'react';

interface LoginViewProps {
  loginUser: string;
  setLoginUser: (val: string) => void;
  loginPass: string;
  setLoginPass: (val: string) => void;
  showLoginPassword: boolean;
  setShowLoginPassword: (val: boolean) => void;
  rememberMe: boolean;
  setRememberMe: (val: boolean) => void;
  loginError: string;
  handleLoginSubmit: (e: React.FormEvent) => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({
  loginUser,
  setLoginUser,
  loginPass,
  setLoginPass,
  showLoginPassword,
  setShowLoginPassword,
  rememberMe,
  setRememberMe,
  loginError,
  handleLoginSubmit,
  isDarkMode,
  toggleTheme
}) => {
  return (
    <div className="login-page">
      {/* Botón flotante para cambiar tema en Login */}
      <button 
        className="theme-toggle-login"
        onClick={toggleTheme}
        title={isDarkMode ? 'Cambiar a Tema Claro' : 'Cambiar a Tema Oscuro'}
        type="button"
      >
        {isDarkMode ? '☀️ Modo Claro' : '🌙 Modo Oscuro'}
      </button>

      <div className="login-card animate-fade">
        <div className="login-brand">
          <div className="login-logo-circle">
            <span style={{ fontSize: '2rem' }}>⚡</span>
          </div>
          <h1 className="login-title">MAINTTRAC</h1>
          <p className="login-subtitle">Sistema Integral de Mantenimiento y Operaciones</p>
        </div>

        <form onSubmit={handleLoginSubmit} autoComplete="on">
          {loginError && (
            <div className="login-error-alert animate-shake">
              ⚠️ {loginError}
            </div>
          )}

          <div className="login-field">
            <label className="login-label">Nombre de Usuario o Correo</label>
            <input 
              type="text" 
              className="login-input" 
              placeholder="Ej: admin, jperez o correo corporativo" 
              value={loginUser} 
              onChange={e => setLoginUser(e.target.value)} 
              required 
              autoFocus
              autoComplete="username"
            />
          </div>

          <div className="login-field">
            <label className="login-label">Contraseña</label>
            <div style={{ position: 'relative' }}>
              <input 
                type={showLoginPassword ? "text" : "password"} 
                className="login-input" 
                placeholder="••••••••" 
                value={loginPass} 
                onChange={e => setLoginPass(e.target.value)} 
                required 
                autoComplete="current-password"
                style={{ paddingRight: '40px' }}
              />
              <button
                type="button"
                className="btn-show-pass"
                onClick={() => setShowLoginPassword(!showLoginPassword)}
                tabIndex={-1}
              >
                {showLoginPassword ? '👁️' : '🙈'}
              </button>
            </div>
          </div>

          <div className="login-remember">
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem' }}>
              <input 
                type="checkbox" 
                checked={rememberMe} 
                onChange={e => setRememberMe(e.target.checked)} 
              />
              <span>Recordar mis credenciales</span>
            </label>
          </div>

          <button type="submit" className="login-submit-btn">
            Iniciar Sesión
          </button>
        </form>

        <div className="login-footer">
          <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            "Daniel Luna" Software, Web & App Designer | © 2026
          </div>
        </div>
      </div>
    </div>
  );
};
