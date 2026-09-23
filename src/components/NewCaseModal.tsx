import React from 'react';
import type { Store, User } from '../types';
import { SearchableStoreSelect } from './SearchableStoreSelect';
import { EditableCategorySelect } from './EditableCategorySelect';

interface NewCaseModalProps {
  show: boolean;
  currentUser: User | null;
  stores: Store[];
  categories: { id: number; nombre: string; prioridadSugerida: number; }[];
  users: User[];
  newCaseStoreId?: number;
  setNewCaseStoreId?: (val: number) => void;
  newCategoryText: string;
  handleCategoryChange: (catName: string) => void;
  newPriority: number;
  setNewPriority: (val: number) => void;
  newDesc: string;
  setNewDesc: (val: string) => void;
  newCaseDamagePhotos: string[];
  setNewCaseDamagePhotos: React.Dispatch<React.SetStateAction<string[]>>;
  handleNewCasePhotoChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  newIsScheduled: boolean;
  setNewIsScheduled: (val: boolean) => void;
  newScheduleDate: string;
  setNewScheduleDate: (val: string) => void;
  newScheduleShift: string;
  setNewScheduleShift: (val: string) => void;
  newScheduleHours: number;
  setNewScheduleHours: (val: number) => void;
  newScheduleAssignedTechId: number | '';
  setNewScheduleAssignedTechId: (val: number | '') => void;
  newRequestPreMaterial: boolean;
  setNewRequestPreMaterial: (val: boolean) => void;
  newPreMaterialName?: string;
  setNewPreMaterialName?: (val: string) => void;
  newPreMaterialQty?: number;
  setNewPreMaterialQty?: (val: number) => void;
  newPreMaterialItems?: { id: number | string; nombre: string; cantidad: number }[];
  onAddPreMaterialItem?: () => void;
  onRemovePreMaterialItem?: (id: number | string) => void;
  onUpdatePreMaterialItem?: (id: number | string, field: 'nombre' | 'cantidad', val: string | number) => void;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const NewCaseModal: React.FC<NewCaseModalProps> = ({
  show,
  currentUser,
  stores,
  categories,
  users,
  newCaseStoreId,
  setNewCaseStoreId,
  newCategoryText,
  handleCategoryChange,
  newPriority,
  setNewPriority,
  newDesc,
  setNewDesc,
  newCaseDamagePhotos,
  setNewCaseDamagePhotos,
  handleNewCasePhotoChange,
  newIsScheduled,
  setNewIsScheduled,
  newScheduleDate,
  setNewScheduleDate,
  newScheduleShift,
  setNewScheduleShift,
  newScheduleHours,
  setNewScheduleHours,
  newScheduleAssignedTechId,
  setNewScheduleAssignedTechId,
  newRequestPreMaterial,
  setNewRequestPreMaterial,
  newPreMaterialName: _newPreMaterialName,
  setNewPreMaterialName,
  newPreMaterialQty: _newPreMaterialQty,
  setNewPreMaterialQty,
  newPreMaterialItems = [{ id: 1, nombre: '', cantidad: 1 }],
  onAddPreMaterialItem,
  onRemovePreMaterialItem,
  onUpdatePreMaterialItem,
  onClose,
  onSubmit
}) => {
  if (!show) return null;

  const isStoreUser = currentUser?.rol === 'jefe_tienda' || currentUser?.rol === 'subjefe';
  const currentStore = stores.find(s => s.id === (isStoreUser ? currentUser?.tiendaId : (newCaseStoreId || currentUser?.tiendaId)));

  return (
    <div className="modal-backdrop">
      <div className="modal-sheet" style={{ maxWidth: '580px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.3rem' }}>🆕</span>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>Crear Nuevo Caso de Mantenimiento</h3>
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
          {/* Tienda Asignada */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>Tienda Asignada *</label>
            {isStoreUser ? (
              <input 
                type="text" 
                disabled 
                value={currentStore ? currentStore.nombre : 'Mi Tienda'} 
                style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-surface)', color: 'var(--text-muted)', fontSize: '0.85rem', boxSizing: 'border-box' }}
              />
            ) : (
              <SearchableStoreSelect
                stores={stores}
                value={newCaseStoreId || (stores[0]?.id || 1)}
                onChange={val => setNewCaseStoreId && setNewCaseStoreId(Number(val))}
                currentUser={currentUser}
                placeholder="Buscar tienda del caso..."
                allOptionLabel="-- Seleccionar Tienda --"
                allOptionValue="1"
              />
            )}
          </div>

          {/* Categoría y Prioridad */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>Categoría *</label>
              <EditableCategorySelect
                value={newCategoryText}
                onChange={handleCategoryChange}
                categories={categories}
                placeholder="Escribe o selecciona..."
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>Nivel de Prioridad *</label>
              <select
                value={newPriority}
                onChange={e => setNewPriority(Number(e.target.value))}
                className="custom-select"
                style={{ width: '100%', padding: '8px 10px', fontSize: '0.85rem' }}
              >
                <option value={1}>🔴 Crítica (SLA 4 Horas)</option>
                <option value={2}>🟠 Alta (SLA 8 Horas)</option>
                <option value={3}>🟡 Media (SLA 24 Horas)</option>
                <option value={4}>🟢 Baja (SLA 48 Horas)</option>
              </select>
            </div>
          </div>

          {/* Descripción */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>Descripción del Problema o Avería *</label>
            <textarea
              value={newDesc}
              onChange={e => setNewDesc(e.target.value)}
              placeholder="Explica detalladamente qué sucede en la tienda para que el técnico lleve los materiales adecuados..."
              required
              rows={3}
              style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-panel)', color: 'var(--text-main)', fontSize: '0.85rem', resize: 'vertical', boxSizing: 'border-box' }}
            />
          </div>

          {/* Evidencias de Daño Inicial */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>
              📷 Fotos de Evidencia del Daño Inicial (Opcional - Máx 5)
            </label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              {newCaseDamagePhotos.map((photo, i) => (
                <div key={i} style={{ position: 'relative', width: '56px', height: '56px', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                  <img src={photo} alt="Evidencia inicial" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button
                    type="button"
                    onClick={() => setNewCaseDamagePhotos(prev => prev.filter((_, idx) => idx !== i))}
                    style={{ position: 'absolute', top: '2px', right: '2px', background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: '50%', width: '18px', height: '18px', fontSize: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    ✕
                  </button>
                </div>
              ))}
              {newCaseDamagePhotos.length < 5 && (
                <label 
                  className="btn btn-secondary btn-sm" 
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer', padding: '6px 12px', fontSize: '0.78rem' }}
                >
                  📸 Adjuntar Fotos ({newCaseDamagePhotos.length}/5)
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    style={{ display: 'none' }}
                    onChange={handleNewCasePhotoChange}
                  />
                </label>
              )}
            </div>
          </div>

          {/* Opciones Avanzadas: Programación y Materiales */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: 'var(--bg-surface)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={newIsScheduled}
                onChange={e => setNewIsScheduled(e.target.checked)}
              />
              <span>📅 Agendar visita técnica con fecha y hora</span>
            </label>

            {newIsScheduled && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', padding: '10px', background: 'var(--bg-panel)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '2px' }}>Fecha de Visita</label>
                  <input
                    type="date"
                    value={newScheduleDate}
                    onChange={e => setNewScheduleDate(e.target.value)}
                    style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-surface)', color: 'var(--text-main)', fontSize: '0.8rem', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '2px' }}>Turno Preferido</label>
                  <select
                    value={newScheduleShift}
                    onChange={e => setNewScheduleShift(e.target.value)}
                    className="custom-select"
                    style={{ width: '100%', fontSize: '0.78rem', padding: '6px' }}
                  >
                    <option value="mañana">Mañana (08:00 - 13:00)</option>
                    <option value="tarde">Tarde (13:00 - 18:00)</option>
                    <option value="noche">Noche (18:00 - 22:00)</option>
                    <option value="madrugada">Madrugada (Tienda Cerrada)</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '2px' }}>Horas Estimadas</label>
                  <input
                    type="number"
                    min={1}
                    max={24}
                    value={newScheduleHours}
                    onChange={e => setNewScheduleHours(Number(e.target.value))}
                    style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-panel)', color: 'var(--text-main)', fontSize: '0.8rem', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '2px' }}>Técnico Asignado</label>
                  <select
                    value={newScheduleAssignedTechId}
                    onChange={e => setNewScheduleAssignedTechId(e.target.value ? Number(e.target.value) : '')}
                    className="custom-select"
                    style={{ width: '100%', fontSize: '0.78rem', padding: '6px' }}
                  >
                    <option value="">-- Sin asignar --</option>
                    {users.filter(u => u.rol === 'tecnico' && u.estado).map(u => (
                      <option key={u.id} value={u.id}>{u.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={newRequestPreMaterial}
                onChange={e => setNewRequestPreMaterial(e.target.checked)}
              />
              <span>📦 Solicitar material o repuesto por adelantado</span>
            </label>

            {newRequestPreMaterial && (
              <div style={{
                padding: '12px',
                background: 'var(--bg-panel)',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    📦 Materiales y Repuestos Solicitados
                  </span>
                  <span style={{ fontSize: '0.72rem', background: 'rgba(99, 102, 241, 0.15)', color: 'var(--primary)', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>
                    {newPreMaterialItems.length} {newPreMaterialItems.length === 1 ? 'ítem' : 'ítems'}
                  </span>
                </div>

                {/* Lista dinámica de materiales */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {newPreMaterialItems.map((item, index) => (
                    <div 
                      key={item.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: 'var(--bg-surface)',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-color)'
                      }}
                    >
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', minWidth: '22px' }}>
                        #{index + 1}
                      </span>

                      <div style={{ flex: 1 }}>
                        <input
                          type="text"
                          data-testid={`material-name-input-${index}`}
                          placeholder="Ej: Lámparas herméticas, balasto 2x36W, tubos LED..."
                          value={item.nombre}
                          onChange={e => {
                            if (onUpdatePreMaterialItem) {
                              onUpdatePreMaterialItem(item.id, 'nombre', e.target.value);
                            } else if (setNewPreMaterialName && index === 0) {
                              setNewPreMaterialName(e.target.value);
                            }
                          }}
                          style={{
                            width: '100%',
                            padding: '7px 9px',
                            borderRadius: '4px',
                            border: '1px solid var(--border-color)',
                            background: 'var(--bg-panel)',
                            color: 'var(--text-main)',
                            fontSize: '0.82rem',
                            boxSizing: 'border-box'
                          }}
                        />
                      </div>

                      <div style={{ width: '85px', display: 'flex', alignItems: 'center' }}>
                        <input
                          type="number"
                          data-testid={`material-qty-input-${index}`}
                          min={1}
                          placeholder="Cant."
                          value={item.cantidad}
                          onChange={e => {
                            const val = Math.max(1, Number(e.target.value));
                            if (onUpdatePreMaterialItem) {
                              onUpdatePreMaterialItem(item.id, 'cantidad', val);
                            } else if (setNewPreMaterialQty && index === 0) {
                              setNewPreMaterialQty(val);
                            }
                          }}
                          style={{
                            width: '100%',
                            padding: '7px 8px',
                            borderRadius: '4px',
                            border: '1px solid var(--border-color)',
                            background: 'var(--bg-panel)',
                            color: 'var(--text-main)',
                            fontSize: '0.82rem',
                            textAlign: 'center',
                            boxSizing: 'border-box'
                          }}
                        />
                      </div>

                      {newPreMaterialItems.length > 1 && (
                        <button
                          type="button"
                          data-testid={`material-remove-btn-${index}`}
                          title="Eliminar este material"
                          onClick={() => onRemovePreMaterialItem && onRemovePreMaterialItem(item.id)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#ef4444',
                            cursor: 'pointer',
                            fontSize: '1.1rem',
                            padding: '4px 6px',
                            borderRadius: '4px',
                            lineHeight: 1
                          }}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Botón para añadir más materiales */}
                <button
                  type="button"
                  data-testid="btn-add-material-item"
                  onClick={onAddPreMaterialItem}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '8px 12px',
                    border: '1px dashed var(--primary)',
                    color: 'var(--primary)',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    background: 'rgba(99, 102, 241, 0.05)',
                    width: '100%'
                  }}
                >
                  ➕ Agregar otro material / repuesto
                </button>
              </div>
            )}
          </div>

          {/* Botones de Acción */}
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
              style={{ fontWeight: 700, padding: '8px 20px' }}
            >
              🚀 Crear Caso
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
