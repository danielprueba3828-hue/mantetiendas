import React from 'react';
import type { User } from '../types';

interface ChangePasswordModalProps {
  show: boolean;
  currentUser: User | null;
  isFirstLoginChange: boolean;
  currentPassInput: string;
  setCurrentPassInput: (val: string) => void;
  newPassInput: string;
  setNewPassInput: (val: string) => void;
  confirmPassInput: string;
  setConfirmPassInput: (val: string) => void;
  showCurrentPass: boolean;
  setShowCurrentPass: (val: boolean) => void;
  showNewPass: boolean;
  setShowNewPass: (val: boolean) => void;
  showConfirmPass: boolean;
  setShowConfirmPass: (val: boolean) => void;
  changePassError: string;
  changePassSuccess: string;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  show,
  currentUser,
  isFirstLoginChange,
  currentPassInput,
  setCurrentPassInput,
  newPassInput,
  setNewPassInput,
  confirmPassInput,
  setConfirmPassInput,
  showCurrentPass,
  setShowCurrentPass,
  showNewPass,
  setShowNewPass,
  showConfirmPass,
  setShowConfirmPass,
  changePassError,
  changePassSuccess,
  onClose,
  onSubmit
}) => {
  if (!show || !currentUser || (currentUser.rol !== 'supervisor' && currentUser.rol !== 'administrador')) {
    return null;
  }

  return (
    <div className="modal-backdrop">
      <div className="modal-sheet" style={{ maxWidth: '440px', width: '100%' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.25rem' }}>🔐</span>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>
                {isFirstLoginChange ? 'Actualizar Contraseña Inicial' : 'Cambiar Contraseña'}
              </h3>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {currentUser.nombre} ({currentUser.rol.toUpperCase()})
              </p>
            </div>
          </div>
          {!isFirstLoginChange && (
            <button 
              type="button" 
              onClick={onClose}
              style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--text-muted)' }}
            >
              ✕
            </button>
          )}
        </div>

        {isFirstLoginChange && (
          <div style={{ padding: '10px 14px', background: 'rgba(234, 179, 8, 0.12)', borderLeft: '4px solid #EAB308', borderRadius: '4px', margin: '12px 16px 0', fontSize: '0.8rem', color: 'var(--text-main)' }}>
            ⚠️ <strong>Cambio Obligatorio:</strong> Por seguridad de su cuenta, debe actualizar la clave temporal antes de continuar.
          </div>
        )}

        <form onSubmit={onSubmit} style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {changePassError && (
            <div style={{ padding: '8px 12px', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid var(--danger)', borderRadius: '6px', color: 'var(--danger)', fontSize: '0.82rem', fontWeight: 600 }}>
              ⚠️ {changePassError}
            </div>
          )}
          {changePassSuccess && (
            <div style={{ padding: '8px 12px', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid var(--success)', borderRadius: '6px', color: 'var(--success)', fontSize: '0.82rem', fontWeight: 600 }}>
              ✅ {changePassSuccess}
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px', color: 'var(--text-main)' }}>
              Contraseña Actual *
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showCurrentPass ? 'text' : 'password'}
                required
                value={currentPassInput}
                onChange={e => setCurrentPassInput(e.target.value)}
                placeholder="Ingrese contraseña actual"
                style={{ width: '100%', padding: '9px 36px 9px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-panel)', color: 'var(--text-main)', fontSize: '0.85rem', boxSizing: 'border-box' }}
              />
              <button
                type="button"
                onClick={() => setShowCurrentPass(!showCurrentPass)}
                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--text-muted)' }}
                tabIndex={-1}
              >
                {showCurrentPass ? '👁️' : '🙈'}
              </button>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px', color: 'var(--text-main)' }}>
              Nueva Contraseña *
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showNewPass ? 'text' : 'password'}
                required
                minLength={6}
                value={newPassInput}
                onChange={e => setNewPassInput(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                style={{ width: '100%', padding: '9px 36px 9px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-panel)', color: 'var(--text-main)', fontSize: '0.85rem', boxSizing: 'border-box' }}
              />
              <button
                type="button"
                onClick={() => setShowNewPass(!showNewPass)}
                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--text-muted)' }}
                tabIndex={-1}
              >
                {showNewPass ? '👁️' : '🙈'}
              </button>
            </div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginTop: '2px' }}>
              Recomendado: letras, números o símbolos (mín. 6 caracteres).
            </span>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px', color: 'var(--text-main)' }}>
              Confirmar Nueva Contraseña *
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showConfirmPass ? 'text' : 'password'}
                required
                minLength={6}
                value={confirmPassInput}
                onChange={e => setConfirmPassInput(e.target.value)}
                placeholder="Repita la nueva contraseña"
                style={{ width: '100%', padding: '9px 36px 9px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-panel)', color: 'var(--text-main)', fontSize: '0.85rem', boxSizing: 'border-box' }}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPass(!showConfirmPass)}
                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--text-muted)' }}
                tabIndex={-1}
              >
                {showConfirmPass ? '👁️' : '🙈'}
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
            {!isFirstLoginChange && (
              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={onClose}
                style={{ padding: '8px 16px', fontSize: '0.85rem' }}
              >
                Cancelar
              </button>
            )}
            <button 
              type="submit" 
              className="btn btn-primary"
              style={{ padding: '8px 20px', fontSize: '0.85rem', fontWeight: 700 }}
            >
              Guardar Contraseña
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
