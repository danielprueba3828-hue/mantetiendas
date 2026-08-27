import React from 'react';
import type { Case } from '../types';

interface SolveModalProps {
  show: boolean;
  selectedCase: Case | null;
  solveEvidenceFiles: string[];
  handleSolveEvidenceChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  setSolveEvidenceFiles: React.Dispatch<React.SetStateAction<string[]>>;
  onClose: () => void;
  onConfirm: () => void;
}

export const SolveModal: React.FC<SolveModalProps> = ({
  show,
  selectedCase,
  solveEvidenceFiles,
  handleSolveEvidenceChange,
  setSolveEvidenceFiles,
  onClose,
  onConfirm
}) => {
  if (!show || !selectedCase) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal-sheet">
        <div className="modal-header">
          <h3 style={{ margin: 0 }}>Resolver Caso #{selectedCase.id}</h3>
          <button 
            type="button" 
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--text-muted)' }}
          >
            ✕
          </button>
        </div>
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Para concluir este caso, es <strong>obligatorio</strong> adjuntar la foto del trabajo terminado como evidencia fotográfica de resolución.
          </p>

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
              📷 Seleccionar Fotos ({solveEvidenceFiles.length}/10)
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
              disabled={solveEvidenceFiles.length === 0}
              onClick={onConfirm}
            >
              ✅ Concluir Caso
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
