import React, { useState } from 'react';
import type { Case, Store } from '../types';

interface DeleteCaseModalProps {
  show: boolean;
  caseData: Case | null;
  stores: Store[];
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export const DeleteCaseModal: React.FC<DeleteCaseModalProps> = ({
  show,
  caseData,
  stores,
  onClose,
  onConfirm
}) => {
  const [isDeleting, setIsDeleting] = useState(false);

  if (!show || !caseData) return null;

  const storeName = stores.find(s => s.id === caseData.tiendaId)?.nombre || `Tienda #${caseData.tiendaId}`;
  const caseDisplayCode = String(caseData.id).padStart(4, '0');

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      console.error("Error al eliminar el caso:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-sheet" style={{ maxWidth: '480px', borderTop: '4px solid #ef4444' }}>
        <div className="modal-header" style={{ paddingBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', color: '#dc2626' }}>
              🗑️
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#dc2626' }}>
                ¿Eliminar Caso #{caseDisplayCode}?
              </h3>
              <p style={{ margin: 0, fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                Esta acción eliminará permanentemente el caso de la base de datos
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            disabled={isDeleting}
            style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--text-muted)' }}
          >
            ✕
          </button>
        </div>

        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '12px 14px', color: '#991b1b', fontSize: '0.82rem', lineHeight: 1.5 }}>
            <strong>⚠️ Atención:</strong> Esta operación no se puede revertir. Se borrarán permanentemente el reporte, su bitácora de intervenciones, asistencias y evidencias vinculadas.
          </div>

          {/* Resumen del caso a borrar */}
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px', fontSize: '0.82rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
              <span>Sucursal:</span>
              <strong style={{ color: 'var(--text-main)' }}>{storeName}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
              <span>Categoría:</span>
              <strong style={{ color: 'var(--text-main)' }}>{caseData.categoria}</strong>
            </div>
            <div style={{ marginTop: '4px', borderTop: '1px dashed var(--border-color)', paddingTop: '6px' }}>
              <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '2px', fontSize: '0.75rem' }}>Descripción:</span>
              <p style={{ margin: 0, color: 'var(--text-main)', fontStyle: 'italic', maxHeight: '60px', overflowY: 'auto' }}>
                "{caseData.descripcion}"
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px', paddingTop: '12px', borderTop: '1px solid var(--border-color)' }}>
            <button 
              type="button" 
              className="btn btn-secondary"
              onClick={onClose}
              disabled={isDeleting}
            >
              Cancelar
            </button>
            <button 
              type="button" 
              className="btn btn-danger"
              disabled={isDeleting}
              onClick={handleConfirm}
              style={{ fontWeight: 700, minWidth: '150px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', background: '#dc2626', borderColor: '#dc2626' }}
            >
              {isDeleting ? 'Eliminando...' : '🗑️ Sí, Eliminar Caso'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
