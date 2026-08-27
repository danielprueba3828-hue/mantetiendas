import React from 'react';
import type { Store, User, Case } from '../types';

interface HistorialAsistenciasTabProps {
  cases: Case[];
  stores: Store[];
  users: User[];
  loadSheetJS: () => Promise<any>;
}

export const HistorialAsistenciasTab: React.FC<HistorialAsistenciasTabProps> = ({
  cases,
  stores,
  users,
  loadSheetJS
}) => {
  const closedCasesWithTech = cases.filter(c => 
    (c.estado === 'concluido' || c.estado === 'cerrado') &&
    (c.tecnicoAsignadoId || c.tecnico_presencial_nombre)
  );

  const exportAsistenciasExcel = async () => {
    const XLSX = await loadSheetJS();
    const rows = closedCasesWithTech.map(c => {
      const store = stores.find(s => s.id === c.tiendaId);
      const tech = users.find(u => u.id === c.tecnicoAsignadoId);
      const techName = tech ? tech.nombre : (c.tecnico_presencial_nombre || 'No especificado');
      const inDate = c.hora_entrada ? new Date(c.hora_entrada) : null;
      const outDate = c.hora_salida ? new Date(c.hora_salida) : null;
      
      let durationStr = 'N/A';
      if (inDate && outDate) {
        const diffMs = outDate.getTime() - inDate.getTime();
        const mins = Math.floor(diffMs / 60000);
        const hours = Math.floor(mins / 60);
        const remMins = mins % 60;
        durationStr = `${hours}h ${remMins}m`;
      }

      return {
        'ID Caso': c.id,
        'Técnico': techName,
        'Tienda': store ? store.nombre : `Tienda #${c.tiendaId}`,
        'Categoría': c.categoria,
        'Fecha Entrada': inDate ? inDate.toLocaleDateString() : 'N/A',
        'Hora Entrada': inDate ? inDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A',
        'Fecha Salida': outDate ? outDate.toLocaleDateString() : 'N/A',
        'Hora Salida': outDate ? outDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A',
        'Tiempo en Tienda': durationStr,
        'Estado': c.estado.toUpperCase()
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Asistencias');
    XLSX.writeFile(workbook, `Historial_Asistencias_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="view-container animate-fade">
      <div className="view-header" style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🕒</span> Historial de Asistencias y Horas en Tienda
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Registro auditable de horas de entrada, permanencia y salida por cada intervención técnica
          </p>
        </div>

        <button 
          type="button" 
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', fontWeight: 700 }}
          onClick={exportAsistenciasExcel}
        >
          <span>📥</span> Exportar a Excel (.xlsx)
        </button>
      </div>

      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="custom-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '12px 14px' }}>Caso</th>
                <th style={{ padding: '12px 14px' }}>Técnico</th>
                <th style={{ padding: '12px 14px' }}>Tienda</th>
                <th style={{ padding: '12px 14px' }}>Hora Entrada</th>
                <th style={{ padding: '12px 14px' }}>Hora Salida</th>
                <th style={{ padding: '12px 14px' }}>Permanencia</th>
                <th style={{ padding: '12px 14px' }}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {closedCasesWithTech.map(c => {
                const store = stores.find(s => s.id === c.tiendaId);
                const tech = users.find(u => u.id === c.tecnicoAsignadoId);
                const inDate = c.hora_entrada ? new Date(c.hora_entrada) : null;
                const outDate = c.hora_salida ? new Date(c.hora_salida) : null;
                
                let durationStr = 'N/A';
                if (inDate && outDate) {
                  const diffMs = outDate.getTime() - inDate.getTime();
                  const mins = Math.floor(diffMs / 60000);
                  const hours = Math.floor(mins / 60);
                  const remMins = mins % 60;
                  durationStr = `${hours}h ${remMins}m`;
                }

                return (
                  <tr key={c.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--primary)' }}>#{c.id}</td>
                    <td style={{ padding: '12px 14px', fontWeight: 600 }}>{tech ? tech.nombre : (c.tecnico_presencial_nombre || 'Técnico')}</td>
                    <td style={{ padding: '12px 14px' }}>{store ? store.nombre : `Tienda #${c.tiendaId}`}</td>
                    <td style={{ padding: '12px 14px', color: 'var(--success)', fontWeight: 600 }}>
                      {inDate ? inDate.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'N/A'}
                    </td>
                    <td style={{ padding: '12px 14px', color: 'var(--text-muted)' }}>
                      {outDate ? outDate.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'N/A'}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span className="badge badge-secondary" style={{ fontSize: '0.72rem' }}>{durationStr}</span>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span className="badge badge-success" style={{ fontSize: '0.72rem' }}>{c.estado.toUpperCase()}</span>
                    </td>
                  </tr>
                );
              })}
              {closedCasesWithTech.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No hay registros de asistencias finalizadas todavía.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
