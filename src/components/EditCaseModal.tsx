import React, { useState, useEffect } from 'react';
import type { Case, Store, User } from '../types';
import { SearchableStoreSelect } from './SearchableStoreSelect';
import { EditableCategorySelect } from './EditableCategorySelect';

interface EditCaseModalProps {
  show: boolean;
  caseData: Case | null;
  stores: Store[];
  categories: { id: number; nombre: string; prioridadSugerida: number; }[];
  currentUser: User | null;
  onClose: () => void;
  onSave: (updated: {
    categoria: string;
    descripcion: string;
    prioridad: number;
    tiendaId: number;
  }) => Promise<void>;
}

export const EditCaseModal: React.FC<EditCaseModalProps> = ({
  show,
  caseData,
  stores,
  categories,
  currentUser,
  onClose,
  onSave
}) => {
  const [categoria, setCategoria] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [prioridad, setPrioridad] = useState(3);
  const [tiendaId, setTiendaId] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (caseData) {
      setCategoria(caseData.categoria || '');
      setDescripcion(caseData.descripcion || '');
      setPrioridad(caseData.prioridad || 3);
      setTiendaId(caseData.tiendaId || 0);
    }
  }, [caseData]);

  if (!show || !caseData) return null;

  const canChangeStore = currentUser?.rol === 'administrador' || currentUser?.rol === 'supervisor' || currentUser?.rol === 'tecnico';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoria.trim()) return;
    if (!descripcion.trim()) return;

    setIsSaving(true);
    try {
      await onSave({
        categoria: categoria.trim(),
        descripcion: descripcion.trim(),
        prioridad,
        tiendaId: tiendaId || caseData.tiendaId
      });
      onClose();
    } catch (err) {
      console.error("Error al guardar edición de caso:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const caseDisplayCode = String(caseData.id).padStart(4, '0');

  return (
    <div className="modal-backdrop">
      <div className="modal-sheet" style={{ maxWidth: '540px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.2rem' }}>✏️</span>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>Editar Caso #{caseDisplayCode}</h3>
              <p style={{ margin: 0, fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                Modifica los datos del reporte creado
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            disabled={isSaving}
            style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--text-muted)' }}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Tienda */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>
              🏪 Tienda / Sucursal
            </label>
            {canChangeStore ? (
              <SearchableStoreSelect
                stores={stores}
                value={tiendaId}
                onChange={val => setTiendaId(Number(val))}
                currentUser={currentUser}
                placeholder="Seleccionar o cambiar tienda..."
                allOptionLabel="-- Seleccionar Tienda --"
                allOptionValue="0"
              />
            ) : (
              <input 
                type="text" 
                readOnly 
                disabled 
                value={stores.find(s => s.id === caseData.tiendaId)?.nombre || `Tienda #${caseData.tiendaId}`}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-surface)', color: 'var(--text-muted)', fontSize: '0.85rem' }}
              />
            )}
          </div>

          {/* Categoría */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>
              🏷️ Categoría de Problema *
            </label>
            <EditableCategorySelect
              value={categoria}
              onChange={setCategoria}
              categories={categories}
              placeholder="Escribe o selecciona categoría..."
              required
            />
          </div>

          {/* Prioridad */}
          {!caseData.es_caso_tecnico && (
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>
                ⚡ Nivel de Prioridad
              </label>
              <select
                value={prioridad}
                onChange={e => setPrioridad(Number(e.target.value))}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-panel)', color: 'var(--text-main)', fontSize: '0.85rem' }}
              >
                <option value={1}>🚨 Nivel 1 - Urgente / Crítico</option>
                <option value={2}>🟠 Nivel 2 - Alta</option>
                <option value={3}>🟡 Nivel 3 - Media (Estándar)</option>
                <option value={4}>🟢 Nivel 4 - Baja</option>
              </select>
            </div>
          )}

          {/* Descripción */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>
              📝 Descripción Detallada del Problema *
            </label>
            <textarea
              value={descripcion}
              onChange={e => setDescripcion(e.target.value)}
              required
              rows={4}
              placeholder="Describa con precisión la novedad o corrección a realizar..."
              style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-panel)', color: 'var(--text-main)', fontSize: '0.85rem', resize: 'vertical', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--border-color)' }}>
            <button 
              type="button" 
              className="btn btn-secondary"
              onClick={onClose}
              disabled={isSaving}
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={isSaving || !categoria.trim() || !descripcion.trim()}
              style={{ fontWeight: 700, minWidth: '130px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
            >
              {isSaving ? 'Guardando...' : '💾 Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
