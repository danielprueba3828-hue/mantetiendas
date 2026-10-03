import React, { useEffect } from 'react';
import type { Store, User } from '../types';
import { SearchableStoreSelect } from './SearchableStoreSelect';
import { EditableCategorySelect } from './EditableCategorySelect';
import { GpsCameraCapture } from './GpsCameraCapture';
import { appStatePersistence } from '../services/appStatePersistence';
import type { GpsLocation } from '../services/geoPhotoService';

interface NewTechCaseModalProps {
  show: boolean;
  currentUser: User | null;
  stores: Store[];
  categories: { id: number; nombre: string; prioridadSugerida: number; }[];
  techCaseStoreId: number;
  setTechCaseStoreId: (val: number) => void;
  techCaseCategory: string;
  setTechCaseCategory: (val: string) => void;
  techCaseDesc: string;
  setTechCaseDesc: (val: string) => void;
  techCaseGpsPhoto: string | null;
  setTechCaseGpsPhoto: (val: string | null) => void;
  techCaseGpsLocation: GpsLocation | null;
  setTechCaseGpsLocation: (val: GpsLocation | null) => void;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const NewTechCaseModal: React.FC<NewTechCaseModalProps> = ({
  show,
  currentUser,
  stores,
  categories,
  techCaseStoreId,
  setTechCaseStoreId,
  techCaseCategory,
  setTechCaseCategory,
  techCaseDesc,
  setTechCaseDesc,
  techCaseGpsPhoto,
  setTechCaseGpsPhoto,
  techCaseGpsLocation: _techCaseGpsLocation,
  setTechCaseGpsLocation,
  onClose,
  onSubmit
}) => {
  // Restaurar borrador previo si el usuario cambió de app
  useEffect(() => {
    if (show) {
      const draft = appStatePersistence.getTechCaseDraft();
      if (draft) {
        if (!techCaseStoreId && draft.storeId) setTechCaseStoreId(draft.storeId);
        if (!techCaseCategory && draft.category) setTechCaseCategory(draft.category);
        if (!techCaseDesc && draft.description) setTechCaseDesc(draft.description);
        if (!techCaseGpsPhoto && draft.gpsPhotoUrl) setTechCaseGpsPhoto(draft.gpsPhotoUrl);
      }
    }
  }, [show]);

  // Auto-guardado en borrador local cada vez que cambie para no perder nada si cambia de app
  useEffect(() => {
    if (show) {
      appStatePersistence.saveTechCaseDraft({
        storeId: techCaseStoreId,
        category: techCaseCategory,
        description: techCaseDesc,
        status: 'Trabajando en tienda',
        gpsPhotoUrl: techCaseGpsPhoto
      });
    }
  }, [show, techCaseStoreId, techCaseCategory, techCaseDesc, techCaseGpsPhoto]);

  if (!show) return null;

  const currentStore = stores.find(s => s.id === techCaseStoreId);
  const storeLabel = currentStore ? `${currentStore.nombre} (${currentStore.ciudad})` : '';

  const isSubmitDisabled = !techCaseStoreId || !techCaseCategory.trim() || !techCaseDesc.trim() || !techCaseGpsPhoto;

  return (
    <div className="modal-backdrop">
      <div className="modal-sheet" style={{ maxWidth: '540px', width: '100%', maxHeight: '92vh', overflowY: 'auto' }}>
        <div className="modal-header">
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>Crear Caso de Soporte (Técnico)</h3>
            <span style={{ fontSize: '0.72rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
              💾 Borrador persistente activo (no perderás tus datos al cambiar de app)
            </span>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--text-muted)' }}
          >
            ✕
          </button>
        </div>
        <form onSubmit={onSubmit} style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '4px' }}>Tienda Asignada *</label>
            <SearchableStoreSelect
              stores={stores}
              value={techCaseStoreId}
              onChange={val => setTechCaseStoreId(Number(val))}
              currentUser={currentUser}
              placeholder="Buscar tienda asignada..."
              allOptionLabel="-- Seleccionar Tienda --"
              allOptionValue="0"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '4px' }}>Categoría de Trabajo *</label>
            <EditableCategorySelect
              value={techCaseCategory}
              onChange={setTechCaseCategory}
              categories={categories}
              placeholder="Escribe o selecciona categoría..."
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '4px' }}>Descripción del Caso *</label>
            <textarea
              value={techCaseDesc}
              onChange={e => setTechCaseDesc(e.target.value)}
              required
              rows={3}
              placeholder="Describa el trabajo a realizar o el hallazgo en tienda..."
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-panel)', color: 'var(--text-main)', fontSize: '0.85rem', resize: 'vertical', boxSizing: 'border-box' }}
            />
          </div>

          {/* FOTO CON COORDENADAS GPS OBLIGATORIA */}
          <div>
            <GpsCameraCapture
              photoUrl={techCaseGpsPhoto}
              onPhotoCaptured={(watermarked, loc) => {
                setTechCaseGpsPhoto(watermarked);
                setTechCaseGpsLocation(loc);
              }}
              onPhotoRemoved={() => {
                setTechCaseGpsPhoto(null);
                setTechCaseGpsLocation(null);
              }}
              techName={currentUser?.nombre || 'Técnico'}
              storeName={storeLabel}
              actionTitle="Creación de Caso en Sitio"
              required={true}
              label="Foto del trabajo en tienda"
            />
            {!techCaseGpsPhoto && (
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                Toma una foto en tienda para poder registrar el caso.
              </span>
            )}
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
              type="submit" 
              className="btn btn-primary"
              style={{ fontWeight: 800 }}
              disabled={isSubmitDisabled}
            >
              🚀 Crear y Tomar Caso
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
