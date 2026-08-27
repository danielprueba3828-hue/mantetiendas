import React from 'react';
import type { Case, User } from '../types';

interface PauseMaterialModalProps {
  show: boolean;
  selectedCase?: Case | null | undefined;
  currentUser: User | null;
  pauseReasonInput: string;
  setPauseReasonInput: (val: string) => void;
  onClose: () => void;
  onConfirm: (e?: any) => void;
}

export const PauseMaterialModal: React.FC<PauseMaterialModalProps> = ({
  show,
  selectedCase,
  currentUser,
  pauseReasonInput,
  setPauseReasonInput,
  onClose,
  onConfirm
}) => {
  if (!show || !selectedCase || !currentUser) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal-sheet" style={{ maxWidth: '480px', width: '100%' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.25rem' }}>⏸️</span>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>Pausar Trabajo por Material</h3>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>Caso #{selectedCase.id}</p>
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
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Indique el motivo o los materiales faltantes necesarios para reanudar la labor:
          </p>
          <textarea
            value={pauseReasonInput}
            onChange={e => setPauseReasonInput(e.target.value)}
            placeholder="Ej: Se requiere contactor de 24V y cable de fuerza calibre 12..."
            rows={3}
            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-panel)', color: 'var(--text-main)', fontSize: '0.85rem', resize: 'vertical', boxSizing: 'border-box' }}
          />
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
              className="btn btn-warning"
              style={{ fontWeight: 700 }}
              onClick={onConfirm}
            >
              ⏸️ Confirmar Pausa
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
