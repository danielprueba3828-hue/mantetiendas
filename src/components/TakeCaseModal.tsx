import React from 'react';
import type { Case, User } from '../types';

interface TakeCaseModalProps {
  show: boolean;
  selectedCase?: Case | null | undefined;
  currentUser: User | null;
  takeCaseMode: 'solo' | 'equipo';
  setTakeCaseMode: (val: 'solo' | 'equipo') => void;
  takeCaseSupportTech: string;
  setTakeCaseSupportTech: (val: string) => void;
  onClose: () => void;
  onConfirm: (e?: any) => void;
}

export const TakeCaseModal: React.FC<TakeCaseModalProps> = ({
  show,
  selectedCase,
  currentUser,
  takeCaseMode,
  setTakeCaseMode,
  takeCaseSupportTech,
  setTakeCaseSupportTech,
  onClose,
  onConfirm
}) => {
  if (!show || !selectedCase || !currentUser) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal-sheet" style={{ maxWidth: '480px', width: '100%' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.25rem' }}>⚡</span>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>Tomar Caso #{selectedCase.id}</h3>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>Configuración de asignación presencial</p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--text-muted)' }}
          >
            ✕
          </button>
        </div>
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-main)' }}>
              Modalidad de Trabajo:
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className={`btn ${takeCaseMode === 'solo' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1, padding: '8px', fontSize: '0.82rem', fontWeight: 600 }}
                onClick={() => setTakeCaseMode('solo')}
              >
                👤 Solo ({currentUser.nombre})
              </button>
              <button
                type="button"
                className={`btn ${takeCaseMode === 'equipo' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1, padding: '8px', fontSize: '0.82rem', fontWeight: 600 }}
                onClick={() => setTakeCaseMode('equipo')}
              >
                👥 En Equipo (Con Apoyo)
              </button>
            </div>
          </div>

          {takeCaseMode === 'equipo' && (
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-main)' }}>
                Técnico de Apoyo / Acompañante *
              </label>

              {/* Acceso Rápido a los Técnicos Oficiales */}
              <div style={{ display: 'flex', gap: '6px', marginBottom: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => setTakeCaseSupportTech('Francisco S (Técnico)')}
                  style={{
                    padding: '5px 10px',
                    borderRadius: '6px',
                    border: takeCaseSupportTech === 'Francisco S (Técnico)' ? '1.5px solid var(--primary)' : '1px solid var(--border-color)',
                    background: takeCaseSupportTech === 'Francisco S (Técnico)' ? 'rgba(30, 58, 138, 0.12)' : 'var(--bg-surface)',
                    color: takeCaseSupportTech === 'Francisco S (Técnico)' ? 'var(--primary)' : 'var(--text-main)',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  👷 Francisco S (Técnico)
                </button>
                <button
                  type="button"
                  onClick={() => setTakeCaseSupportTech('Efrén U (Técnico)')}
                  style={{
                    padding: '5px 10px',
                    borderRadius: '6px',
                    border: takeCaseSupportTech === 'Efrén U (Técnico)' ? '1.5px solid var(--primary)' : '1px solid var(--border-color)',
                    background: takeCaseSupportTech === 'Efrén U (Técnico)' ? 'rgba(30, 58, 138, 0.12)' : 'var(--bg-surface)',
                    color: takeCaseSupportTech === 'Efrén U (Técnico)' ? 'var(--primary)' : 'var(--text-main)',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  👷 Efrén U (Técnico)
                </button>
              </div>

              <input
                type="text"
                value={takeCaseSupportTech}
                onChange={e => setTakeCaseSupportTech(e.target.value)}
                placeholder="Selecciona arriba o escribe nombre (ej: Francisco S o Proveedor Externo)..."
                style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-panel)', color: 'var(--text-main)', fontSize: '0.85rem', boxSizing: 'border-box' }}
              />
            </div>
          )}

          <div style={{ padding: '10px', background: 'rgba(59, 130, 246, 0.08)', borderRadius: '6px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            ℹ️ Al confirmar, el caso pasará a estado <strong>En Proceso</strong> y registrará su hora de entrada presencial.
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
            <button 
              type="button" 
              className="btn btn-secondary"
              onClick={onClose}
            >
              Cancelar
            </button>
            <button 
              type="button" 
              className="btn btn-primary"
              style={{ fontWeight: 700 }}
              disabled={takeCaseMode === 'equipo' && !takeCaseSupportTech.trim()}
              onClick={onConfirm}
            >
              ⚡ Confirmar y Comenzar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
