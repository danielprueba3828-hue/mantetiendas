import React from 'react';
import type { User, Case } from '../types';

interface ScheduleModalProps {
  show: boolean;
  scheduleCaseId: number | null;
  cases: Case[];
  users: User[];
  scheduleDate: string;
  setScheduleDate: (val: string) => void;
  scheduleShift: string;
  setScheduleShift: (val: string) => void;
  scheduleHours: number;
  setScheduleHours: (val: number) => void;
  scheduleAssignedTechId: number | '';
  setScheduleAssignedTechId: (val: number | '') => void;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const ScheduleModal: React.FC<ScheduleModalProps> = ({
  show,
  scheduleCaseId,
  cases,
  users,
  scheduleDate,
  setScheduleDate,
  scheduleShift,
  setScheduleShift,
  scheduleHours,
  setScheduleHours,
  scheduleAssignedTechId,
  setScheduleAssignedTechId,
  onClose,
  onSubmit
}) => {
  if (!show || !scheduleCaseId) return null;

  const currentCase = cases.find(c => c.id === scheduleCaseId);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()} style={{ maxWidth: '460px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.25rem' }}>📅</span>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>Agendar Visita Técnica</h3>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>Caso #{scheduleCaseId}</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
        </div>

        <form onSubmit={onSubmit} style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>Fecha de Visita *</label>
            <input
              type="date"
              required
              value={scheduleDate}
              onChange={e => setScheduleDate(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-panel)', color: 'var(--text-main)', fontSize: '0.85rem', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>Franja Horaria / Turno *</label>
            <select
              value={scheduleShift}
              onChange={e => setScheduleShift(e.target.value)}
              className="custom-select"
              style={{ width: '100%' }}
            >
              <option value="Mañana (08:00 AM - 12:00 PM)">🌅 Mañana (08:00 AM - 12:00 PM)</option>
              <option value="Tarde (13:00 PM - 17:00 PM)">☀️ Tarde (13:00 PM - 17:00 PM)</option>
              <option value="Noche (18:00 PM - 22:00 PM)">🌙 Noche (18:00 PM - 22:00 PM)</option>
              <option value="Todo el día">⏱️ Jornada Completa (Todo el día)</option>
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>Horas Estimadas</label>
              <input
                type="number"
                min={1}
                max={24}
                value={scheduleHours}
                onChange={e => setScheduleHours(Number(e.target.value))}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-panel)', color: 'var(--text-main)', fontSize: '0.85rem', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>Técnico Asignado</label>
              <select
                value={scheduleAssignedTechId}
                onChange={e => setScheduleAssignedTechId(e.target.value ? Number(e.target.value) : '')}
                className="custom-select"
                style={{ width: '100%' }}
              >
                <option value="">-- Sin asignar --</option>
                {users.filter(u => u.rol === 'tecnico' && u.estado).map(u => (
                  <option key={u.id} value={u.id}>{u.nombre}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" style={{ fontWeight: 700 }}>📅 Guardar Agendamiento</button>
          </div>
        </form>
      </div>
    </div>
  );
};
