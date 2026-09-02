import React from 'react';
import type { Case, User } from '../types';

interface SolveModalProps {
  show: boolean;
  selectedCase?: Case | null | undefined;
  currentUser?: User | null;
  solutionDesc?: string;
  setSolutionDesc?: (val: string) => void;
  solveEvidenceFiles: string[];
  handleSolveEvidenceChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  setSolveEvidenceFiles: React.Dispatch<React.SetStateAction<string[]>>;
  onClose: () => void;
  onConfirm: (e?: any) => void;
}

export const SolveModal: React.FC<SolveModalProps> = ({
  show,
  selectedCase,
  currentUser,
  solutionDesc = '',
  setSolutionDesc = () => {},
  solveEvidenceFiles,
  handleSolveEvidenceChange,
  setSolveEvidenceFiles,
  onClose,
  onConfirm
}) => {
  if (!show || !selectedCase) return null;

  const isTech = currentUser?.rol === 'tecnico';

  return (
    <div className="modal-backdrop">
      <div className="modal-sheet" style={{ maxWidth: '480px', width: '100%' }}>
        <div className="modal-header">
          <h3 style={{ margin: 0 }}>
            {isTech ? 'Concluir Trabajo Técnico' : 'Concluir Trabajo en Tienda'} #{selectedCase.id}
          </h3>
          <button 
            type="button" 
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--text-muted)' }}
          >
            ✕
          </button>
        </div>
        <form onSubmit={onConfirm} style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            {isTech ? (
              <>Para concluir este caso, como técnico es <strong>obligatorio</strong> adjuntar la fotografía del trabajo terminado como evidencia de resolución.</>
            ) : (
              <>Marcar la conclusión del trabajo técnico realizado en la tienda.</>
            )}
          </p>

          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '4px', color: 'var(--text-main)' }}>
              📝 Detalle del trabajo realizado (Opcional):
            </label>
            <textarea
              className="input-box"
              value={solutionDesc}
              onChange={e => setSolutionDesc(e.target.value)}
              placeholder="Ej: Se realizó el mantenimiento correctivo y se probó operatividad..."
              rows={2}
              style={{ width: '100%', fontSize: '0.85rem', resize: 'vertical' }}
            />
          </div>

          <div style={{ border: '2px dashed var(--border-color)', borderRadius: '8px', padding: '16px', textAlign: 'center' }}>
            <input 
              type="file" 
              accept="image/*" 
              multiple 
              onChange={handleSolveEvidenceChange} 
              id="solve-file-input" 
              style={{ display: 'none' }} 
            />
            <label htmlFor="solve-file-input" className="btn btn-secondary" style={{ cursor: 'pointer', display: 'inline-block' }}>
              📷 {isTech ? 'Seleccionar Fotos de Evidencia' : 'Adjuntar Fotos (Opcional)'} ({solveEvidenceFiles.length}/10)
            </label>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '6px', marginBottom: 0 }}>
              Formato JPG, PNG o WebP. Máximo 10 fotografías.
            </p>
          </div>

          {solveEvidenceFiles.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
              {solveEvidenceFiles.map((file, idx) => (
                <div key={idx} style={{ position: 'relative', width: '100%', paddingTop: '100%', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                  <img src={file} alt="Preview" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button 
                    type="button" 
                    onClick={() => setSolveEvidenceFiles(prev => prev.filter((_, i) => i !== idx))}
                    style={{ position: 'absolute', top: '2px', right: '2px', background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: '50%', width: '18px', height: '18px', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          {isTech && solveEvidenceFiles.length === 0 && (
            <div style={{ background: '#fffbeb', border: '1px solid #fef3c7', padding: '8px 12px', borderRadius: '6px', fontSize: '0.78rem', color: '#b45309', fontWeight: 600 }}>
              ⚠️ Como técnico, adjunta al menos 1 fotografía de evidencia para habilitar la conclusión.
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button 
              type="button" 
              className="btn btn-secondary"
              onClick={onClose}
            >
              Cancelar
            </button>
            <button 
              type="button" 
              className="btn btn-success"
              style={{ fontWeight: 700 }}
              disabled={isTech && solveEvidenceFiles.length === 0}
              onClick={(e) => onConfirm(e)}
            >
              ✅ Concluir Trabajo
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
