import React, { useState, useEffect } from 'react';
import type { Case, User } from '../types';
import { GpsCameraCapture } from './GpsCameraCapture';

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
  onConfirm: (e?: any, customFiles?: string[], gpsLoc?: { latitude: number; longitude: number; accuracy?: number }) => void;
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
  const [solveGpsPhoto, setSolveGpsPhoto] = useState<string | null>(null);
  const [solveGpsLoc, setSolveGpsLoc] = useState<{ latitude: number; longitude: number; accuracy?: number } | null>(null);

  useEffect(() => {
    if (show) {
      setSolveGpsPhoto(null);
      setSolveGpsLoc(null);
    }
  }, [show]);

  if (!show || !selectedCase) return null;

  const isTech = currentUser?.rol === 'tecnico';

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isTech && !solveGpsPhoto && solveEvidenceFiles.length === 0) {
      alert("Como técnico es obligatorio capturar una fotografía con coordenadas GPS al concluir el caso.");
      return;
    }
    const combined = solveGpsPhoto ? [solveGpsPhoto, ...solveEvidenceFiles] : solveEvidenceFiles;
    onConfirm(e, combined, solveGpsLoc || undefined);
  };

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
        <form onSubmit={handleFormSubmit} style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            {isTech ? (
              <>Toma la foto del trabajo finalizado para registrar la conclusión de este caso.</>
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

          {/* Fotografía con GPS obligatoria para técnicos */}
          {isTech && (
            <div style={{ marginTop: '2px' }}>
              <GpsCameraCapture
                photoUrl={solveGpsPhoto}
                onPhotoCaptured={(url, loc) => {
                  setSolveGpsPhoto(url);
                  setSolveGpsLoc(loc);
                }}
                onPhotoRemoved={() => {
                  setSolveGpsPhoto(null);
                  setSolveGpsLoc(null);
                }}
                techName={currentUser?.nombre || 'Técnico'}
                actionTitle={`Conclusión Caso #${selectedCase.id}`}
                required={true}
                label="Foto de trabajo terminado"
              />
            </div>
          )}

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
              📷 {isTech ? 'Adjuntar Fotos Adicionales' : 'Adjuntar Fotos (Opcional)'} ({solveEvidenceFiles.length}/10)
            </label>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '6px', marginBottom: 0 }}>
              Formato JPG, PNG o WebP. Máximo 10 fotografías adicionales.
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

          {isTech && !solveGpsPhoto && solveEvidenceFiles.length === 0 && (
            <div style={{ background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.25)', padding: '10px 14px', borderRadius: '10px', fontSize: '0.82rem', color: 'var(--text-main)', fontWeight: 500 }}>
              📸 Por favor toma una foto del trabajo terminado para concluir el caso.
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
              type="submit" 
              className="btn btn-success"
              style={{ fontWeight: 700 }}
              disabled={isTech && !solveGpsPhoto && solveEvidenceFiles.length === 0}
            >
              ✅ Concluir Trabajo
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
