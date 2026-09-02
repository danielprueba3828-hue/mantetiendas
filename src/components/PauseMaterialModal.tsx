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
      <div className="modal-sheet" style={{ maxWidth: '490px', width: '100%' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.25rem' }}>⏸️</span>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>Pausar Trabajo / Salida de Tienda</h3>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>Caso #{selectedCase.id} • {selectedCase.categoria}</p>
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
        <form onSubmit={onConfirm} style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '4px', color: 'var(--text-main)' }}>
              Motivo o Justificación de la Pausa *
            </label>
            <textarea
              value={pauseReasonInput}
              onChange={e => setPauseReasonInput(e.target.value)}
              required
              placeholder="Explique por qué no se puede terminar el trabajo en esta visita (ej: falta de repuestos, corte de energía, permiso de tienda, etc.)..."
              rows={3}
              style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-panel)', color: 'var(--text-main)', fontSize: '0.85rem', resize: 'vertical', boxSizing: 'border-box' }}
            />
          </div>

          {/* Aviso informativo de registro de salida */}
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#d97706', display: 'flex', alignItems: 'center', gap: '5px' }}>
              ⏱️ Salida Automática:
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
              Al guardar la pausa, se registrará la <strong>hora de salida</strong> del técnico. Cuando los materiales estén listos o se regrese a la tienda, se podrá marcar un nuevo ingreso.
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
            <button 
              type="button" 
              className="btn btn-secondary"
              onClick={onClose}
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              className="btn btn-warning"
              style={{ fontWeight: 800, background: '#d97706', color: '#ffffff' }}
              disabled={!pauseReasonInput.trim()}
            >
              ⏸️ Confirmar Pausa y Marcar Salida
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
