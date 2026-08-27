import React from 'react';
import type { TechAvailability, User } from '../types';

interface DisponibilidadTabProps {
  disponibilidadTab: 'cuadrante' | 'horarios';
  setDisponibilidadTab: (val: 'cuadrante' | 'horarios') => void;
  techAvailability: TechAvailability[];
  users: User[];
  handleImportTechAvailability: (e: React.ChangeEvent<HTMLInputElement>) => void;
  loadSheetJS: () => Promise<any>;
}

export const DisponibilidadTab: React.FC<DisponibilidadTabProps> = ({
  disponibilidadTab,
  setDisponibilidadTab,
  techAvailability,
  users,
  handleImportTechAvailability,
  loadSheetJS
}) => {
  const exportTechAvailabilityExcel = async () => {
    const XLSX = await loadSheetJS();
    const rows = techAvailability.map(t => ({
      'ID': t.id,
      'Técnico': t.tecnicoNombre,
      'Días Libres': (t.diasLibres || []).join(', '),
      'Estatus': t.estatus
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Disponibilidad');
    XLSX.writeFile(workbook, `Disponibilidad_Tecnicos_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="view-container animate-fade">
      <div className="view-header" style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>📆</span> Cuadrante y Disponibilidad Técnica
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Planificación de días libres, turnos y presencia operativa del personal
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <label className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', cursor: 'pointer', margin: 0 }}>
            <span>📤</span> Importar Excel
            <input type="file" accept=".xlsx,.xls" onChange={handleImportTechAvailability} style={{ display: 'none' }} />
          </label>

          <button 
            type="button" 
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 700 }}
            onClick={exportTechAvailabilityExcel}
          >
            <span>📥</span> Exportar Excel
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
        <button
          type="button"
          className={`btn ${disponibilidadTab === 'cuadrante' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
          style={{ fontSize: '0.82rem', fontWeight: 600 }}
          onClick={() => setDisponibilidadTab('cuadrante')}
        >
          📊 Matriz de Disponibilidad
        </button>
        <button
          type="button"
          className={`btn ${disponibilidadTab === 'horarios' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
          style={{ fontSize: '0.82rem', fontWeight: 600 }}
          onClick={() => setDisponibilidadTab('horarios')}
        >
          📋 Lista de Técnicos ({techAvailability.length})
        </button>
      </div>

      {disponibilidadTab === 'cuadrante' ? (
        <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="custom-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '12px 14px', textAlign: 'left' }}>Técnico</th>
                  <th style={{ padding: '12px 8px' }}>Lun</th>
                  <th style={{ padding: '12px 8px' }}>Mar</th>
                  <th style={{ padding: '12px 8px' }}>Mié</th>
                  <th style={{ padding: '12px 8px' }}>Jue</th>
                  <th style={{ padding: '12px 8px' }}>Vie</th>
                  <th style={{ padding: '12px 8px' }}>Sáb</th>
                  <th style={{ padding: '12px 8px' }}>Dom</th>
                  <th style={{ padding: '12px 14px' }}>Estatus</th>
                </tr>
              </thead>
              <tbody>
                {techAvailability.map(t => {
                  const diasLibres = t.diasLibres || [];
                  const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
                  return (
                    <tr key={t.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 700, color: 'var(--text-main)' }}>
                        {t.tecnicoNombre}
                      </td>
                      {days.map(d => {
                        const isFree = diasLibres.includes(d);
                        return (
                          <td key={d} style={{ padding: '12px 8px' }}>
                            <span style={{ 
                              display: 'inline-block', 
                              padding: '4px 8px', 
                              borderRadius: '4px', 
                              fontSize: '0.72rem', 
                              fontWeight: 700,
                              background: isFree ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                              color: isFree ? 'var(--danger)' : 'var(--success)'
                            }}>
                              {isFree ? 'LIBRE' : 'DISP'}
                            </span>
                          </td>
                        );
                      })}
                      <td style={{ padding: '12px 14px' }}>
                        <span className={`badge ${t.estatus === 'activo' ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '0.72rem' }}>
                          {t.estatus.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
          {techAvailability.map(t => (
            <div key={t.id} className="card" style={{ padding: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>{t.tecnicoNombre}</h4>
                <span className={`badge ${t.estatus === 'activo' ? 'badge-success' : 'badge-secondary'}`} style={{ fontSize: '0.7rem' }}>
                  {t.estatus}
                </span>
              </div>
              <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Días Libres: <strong>{(t.diasLibres || []).join(', ') || 'Ninguno'}</strong>
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
