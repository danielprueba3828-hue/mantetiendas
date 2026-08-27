import React from 'react';
import type { Store, User } from '../types';
import { SearchableStoreSelect } from './SearchableStoreSelect';

interface NewTechCaseModalProps {
  show: boolean;
  currentUser: User | null;
  stores: Store[];
  categories: string[];
  techCaseStoreId: number;
  setTechCaseStoreId: (val: number) => void;
  techCaseCategory: string;
  setTechCaseCategory: (val: string) => void;
  techCaseDesc: string;
  setTechCaseDesc: (val: string) => void;
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
  onClose,
  onSubmit
}) => {
  if (!show) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal-sheet">
        <div className="modal-header">
          <h3 style={{ margin: 0 }}>Crear Caso de Soporte (Técnico)</h3>
          <button 
            type="button" 
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--text-muted)' }}
          >
            ✕
          </button>
        </div>
        <form onSubmit={onSubmit} style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>Tienda *</label>
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
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>Categoría *</label>
            <select
              value={techCaseCategory}
              onChange={e => setTechCaseCategory(e.target.value)}
              required
              className="custom-select"
              style={{ width: '100%' }}
            >
              <option value="">-- Seleccionar Categoría --</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>Descripción del Caso *</label>
            <textarea
              value={techCaseDesc}
              onChange={e => setTechCaseDesc(e.target.value)}
              required
              rows={4}
              placeholder="Describa el trabajo a realizar o el hallazgo en tienda..."
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-panel)', color: 'var(--text-main)', fontSize: '0.85rem', resize: 'vertical', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
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
              style={{ fontWeight: 700 }}
            >
              Crear y Tomar Caso
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
