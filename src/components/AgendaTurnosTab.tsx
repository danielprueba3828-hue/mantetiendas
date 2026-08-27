import React from 'react';
import type { ShiftEntry } from '../types';

interface AgendaTurnosTabProps {
  shiftSchedule: ShiftEntry[];
  scheduleMonthFilter: string;
  setScheduleMonthFilter: (val: string) => void;
  scheduleSearchQuery: string;
  setScheduleSearchQuery: (val: string) => void;
  loadSheetJS: () => Promise<any>;
}

export const AgendaTurnosTab: React.FC<AgendaTurnosTabProps> = ({
  shiftSchedule,
  scheduleMonthFilter,
  setScheduleMonthFilter,
  scheduleSearchQuery,
  setScheduleSearchQuery,
  loadSheetJS
}) => {
  const filteredSchedule = shiftSchedule.filter(s => {
    if (scheduleMonthFilter !== 'todos' && s.mes !== scheduleMonthFilter) return false;
    if (scheduleSearchQuery.trim()) {
      const q = scheduleSearchQuery.toLowerCase();
      return (
        s.supervisor.toLowerCase().includes(q) ||
        s.tecnico.toLowerCase().includes(q) ||
        s.turno.toLowerCase().includes(q) ||
        s.zona.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const exportScheduleExcel = async () => {
    const XLSX = await loadSheetJS();
    const rows = filteredSchedule.map(s => ({
      'Mes': s.mes,
      'Semana': s.semana,
      'Fecha Inicio': s.fechaInicio,
      'Fecha Fin': s.fechaFin,
      'Supervisor': s.supervisor,
      'Técnico Asignado': s.tecnico,
      'Turno': s.turno,
      'Horario': s.horario,
      'Zona / Región': s.zona
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Turnos_Supervision');
    XLSX.writeFile(workbook, `Agenda_Turnos_Supervision_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="view-container animate-fade">
      <div className="view-header" style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>📅</span> Agenda y Cronograma de Turnos de Supervisores
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Planificación de guardias, turnos rotativos y asignaciones semanales
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <select
            value={scheduleMonthFilter}
            onChange={e => setScheduleMonthFilter(e.target.value)}
            className="custom-select"
            style={{ fontSize: '0.8rem', padding: '6px 10px' }}
          >
            <option value="todos">🗓️ Todos los Meses</option>
            <option value="Enero 2026">Enero 2026</option>
            <option value="Febrero 2026">Febrero 2026</option>
            <option value="Marzo 2026">Marzo 2026</option>
          </select>

          <input
            type="text"
            placeholder="🔍 Buscar supervisor/técnico..."
            value={scheduleSearchQuery}
            onChange={e => setScheduleSearchQuery(e.target.value)}
            style={{ padding: '6px 10px', fontSize: '0.8rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-panel)', color: 'var(--text-main)' }}
          />

          <button 
            type="button" 
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 700 }}
            onClick={exportScheduleExcel}
          >
            <span>📥</span> Exportar Excel
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="custom-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '12px 14px' }}>Mes</th>
                <th style={{ padding: '12px 14px' }}>Semana</th>
                <th style={{ padding: '12px 14px' }}>Fechas</th>
                <th style={{ padding: '12px 14px' }}>Supervisor</th>
                <th style={{ padding: '12px 14px' }}>Técnico</th>
                <th style={{ padding: '12px 14px' }}>Turno</th>
                <th style={{ padding: '12px 14px' }}>Zona</th>
              </tr>
            </thead>
            <tbody>
              {filteredSchedule.map(s => (
                <tr key={s.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '12px 14px', fontWeight: 700 }}>{s.mes}</td>
                  <td style={{ padding: '12px 14px' }}>{s.semana}</td>
                  <td style={{ padding: '12px 14px', color: 'var(--text-muted)' }}>{s.fechaInicio} al {s.fechaFin}</td>
                  <td style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--primary)' }}>{s.supervisor}</td>
                  <td style={{ padding: '12px 14px' }}>{s.tecnico}</td>
                  <td style={{ padding: '12px 14px' }}>
                    <span className="badge badge-secondary" style={{ fontSize: '0.72rem' }}>{s.turno}</span>
                  </td>
                  <td style={{ padding: '12px 14px' }}>{s.zona}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
