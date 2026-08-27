import React from 'react';
import type { Store, User } from '../types';

interface NewCaseModalProps {
  show: boolean;
  currentUser: User | null;
  stores: Store[];
  categories: { id: number; nombre: string; prioridadSugerida: number; }[];
  users: User[];
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
  newPreMaterialName: string;
  setNewPreMaterialName: (val: string) => void;
  newPreMaterialQty: number;
  setNewPreMaterialQty: (val: number) => void;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const NewCaseModal: React.FC<NewCaseModalProps> = ({
  show,
  currentUser,
  stores,
  categories,
  users,
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
  newPreMaterialName,
  setNewPreMaterialName,
  newPreMaterialQty,
  setNewPreMaterialQty,
  onClose,
  onSubmit
}) => {
  if (!show) return null;

  const currentStore = stores.find(s => s.id === currentUser?.tiendaId);

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
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>Tienda Asignada</label>
            <input 
              type="text" 
              disabled 
              value={currentStore ? currentStore.nombre : 'Tienda Principal'} 
              style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-surface)', color: 'var(--text-muted)', fontSize: '0.85rem', boxSizing: 'border-box' }}
            />
          </div>

          {/* Categoría y Prioridad */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>Categoría *</label>
              <select
                value={newCategoryText}
                onChange={e => handleCategoryChange(e.target.value)}
                required
                className="custom-select"
                style={{ width: '100%' }}
              >
                <option value="">-- Seleccionar --</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.nombre}>{cat.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>Nivel de Prioridad *</label>
              <select
                value={newPriority}
                onChange={e => setNewPriority(Number(e.target.value))}
                className="custom-select"
                style={{ width: '100%' }}
              >
                <option value={1}>🚨 Crítica (SLA 4 Horas)</option>
                <option value={2}>🟠 Alta (SLA 12 Horas)</option>
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
              required
              rows={3}
              placeholder="Explique detalladamente la falla observada..."
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-panel)', color: 'var(--text-main)', fontSize: '0.85rem', resize: 'vertical', boxSizing: 'border-box' }}
            />
          </div>

          {/* Fotos de Daño Inicial */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>
              📷 Fotos de Evidencia del Daño Inicial (Opcional - Máx 5)
            </label>
            <div style={{ border: '1px dashed var(--border-color)', borderRadius: '6px', padding: '10px', textAlign: 'center', background: 'var(--bg-surface)' }}>
              <input 
                type="file" 
                accept="image/*" 
                multiple 
                onChange={handleNewCasePhotoChange} 
                id="newcase-photo-input" 
                style={{ display: 'none' }} 
              />
              <label htmlFor="newcase-photo-input" className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', display: 'inline-block' }}>
                📸 Adjuntar Fotos ({newCaseDamagePhotos.length}/5)
              </label>
            </div>
            {newCaseDamagePhotos.length > 0 && (
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                {newCaseDamagePhotos.map((src, i) => (
                  <div key={i} style={{ position: 'relative', width: '60px', height: '60px', borderRadius: '6px', overflow: 'hidden', flexShrink: 0, border: '1px solid var(--border-color)' }}>
                    <img src={src} alt="Previa" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button
                      type="button"
                      onClick={() => setNewCaseDamagePhotos(prev => prev.filter((_, idx) => idx !== i))}
                      style={{ position: 'absolute', top: 0, right: 0, background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', width: '16px', height: '16px', fontSize: '9px', cursor: 'pointer' }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Opciones de Programación y Materiales */}
          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={newIsScheduled}
                onChange={e => setNewIsScheduled(e.target.checked)}
              />
              <span>📅 Agendar visita técnica con fecha y hora</span>
            </label>

            {newIsScheduled && (
              <div style={{ padding: '10px', background: 'var(--bg-surface)', borderRadius: '6px', border: '1px solid var(--border-color)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '2px' }}>Fecha Programada</label>
                  <input
                    type="date"
                    value={newScheduleDate}
                    onChange={e => setNewScheduleDate(e.target.value)}
                    style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-panel)', color: 'var(--text-main)', fontSize: '0.8rem', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '2px' }}>Turno</label>
                  <select
                    value={newScheduleShift}
                    onChange={e => setNewScheduleShift(e.target.value)}
                    className="custom-select"
                    style={{ width: '100%', fontSize: '0.78rem', padding: '6px' }}
                  >
                    <option value="Mañana (08:00 AM - 12:00 PM)">🌅 Mañana (08:00 - 12:00)</option>
                    <option value="Tarde (13:00 PM - 17:00 PM)">☀️ Tarde (13:00 - 17:00)</option>
                    <option value="Noche (18:00 PM - 22:00 PM)">🌙 Noche (18:00 - 22:00)</option>
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
              <div style={{ padding: '10px', background: 'var(--bg-surface)', borderRadius: '6px', border: '1px solid var(--border-color)', display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '2px' }}>Material / Repuesto</label>
                  <input
                    type="text"
                    placeholder="Ej: Balasto electrónico 2x36W..."
                    value={newPreMaterialName}
                    onChange={e => setNewPreMaterialName(e.target.value)}
                    style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-panel)', color: 'var(--text-main)', fontSize: '0.8rem', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '2px' }}>Cantidad</label>
                  <input
                    type="number"
                    min={1}
                    value={newPreMaterialQty}
                    onChange={e => setNewPreMaterialQty(Number(e.target.value))}
                    style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-panel)', color: 'var(--text-main)', fontSize: '0.8rem', boxSizing: 'border-box' }}
                  />
                </div>
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
