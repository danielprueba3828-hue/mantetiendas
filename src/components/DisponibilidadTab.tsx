import React from 'react';
import type { ShiftEntry, TechAvailability } from '../types';

interface DisponibilidadTabProps {
  disponibilidadTab: 'cuadrante' | 'horarios';
  setDisponibilidadTab: (val: 'cuadrante' | 'horarios') => void;
  shiftSchedule?: ShiftEntry[];
  techAvailability: TechAvailability[];
  handleImportTechAvailability: (e: React.ChangeEvent<HTMLInputElement>) => void;
  loadSheetJS: () => Promise<any>;
}

export const DisponibilidadTab: React.FC<DisponibilidadTabProps> = ({
  disponibilidadTab,
  setDisponibilidadTab,
  shiftSchedule = [],
  techAvailability,
  handleImportTechAvailability,
  loadSheetJS
}) => {
  const [activeMonth, setActiveMonth] = React.useState<string>('todos');
  const [search, setSearch] = React.useState<string>('');

  const months = ['todos', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];

  const filteredSchedule = shiftSchedule.filter(s => {
    if (activeMonth !== 'todos' && s.mes.toUpperCase() !== activeMonth.toUpperCase()) return false;
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      const supT = s.supervisorTurno?.toLowerCase().includes(q);
      const supA = s.supervisorApoyo?.toLowerCase().includes(q);
      const tech = s.tecnicoGuardia?.toLowerCase().includes(q);
      const evt = s.evento?.toLowerCase().includes(q);
      const date = s.fechas?.toLowerCase().includes(q);
      if (!supT && !supA && !tech && !evt && !date) return false;
    }
    return true;
  });

  const exportScheduleExcel = async () => {
    const XLSX = await loadSheetJS();
    const rows = filteredSchedule.map(s => ({
      'Mes': s.mes,
      'Fechas': s.fechas,
      'Supervisor Turno': s.supervisorTurno,
      'Supervisor Apoyo': s.supervisorApoyo || '-',
      'Técnico Guardia': s.tecnicoGuardia || '-'
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Turnos_Supervision');
    XLSX.writeFile(workbook, `Agenda_Turnos_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="view-container animate-fade">
      {/* Header */}
      <div className="view-header" style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', margin: 0, fontFamily: 'Outfit, sans-serif', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>📅</span> Disponibilidad y Horarios del Personal
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '3px 0 0 0' }}>
            Cuadrante de turnos de guardia, fines de semana, feriados y horarios regulares.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <label className="btn btn-primary btn-sm" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 700, borderRadius: '8px', padding: '8px 14px' }}>
            <span>📥</span> Importar Excel
            <input type="file" accept=".xlsx, .xls, .csv" onChange={handleImportTechAvailability} style={{ display: 'none' }} />
          </label>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={exportScheduleExcel}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 700, borderRadius: '8px', padding: '8px 14px' }}
          >
            <span>📊</span> Exportar Excel
          </button>
        </div>
      </div>

      {/* Tabs Switcher: Guardias & Feriados vs Horarios Regulares */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
        <button
          type="button"
          className={`btn ${disponibilidadTab === 'cuadrante' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '0.86rem', fontWeight: 700, padding: '10px', borderRadius: '12px' }}
          onClick={() => setDisponibilidadTab('cuadrante')}
        >
          <span>📋 Guardias & Feriados</span>
          <span style={{ background: disponibilidadTab === 'cuadrante' ? 'rgba(255,255,255,0.25)' : 'var(--bg-surface)', padding: '2px 8px', borderRadius: '999px', fontSize: '0.72rem' }}>
            {shiftSchedule.length}
          </span>
        </button>
        <button
          type="button"
          className={`btn ${disponibilidadTab === 'horarios' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '0.86rem', fontWeight: 700, padding: '10px', borderRadius: '12px' }}
          onClick={() => setDisponibilidadTab('horarios')}
        >
          <span>👷 Horarios Regulares</span>
          <span style={{ background: disponibilidadTab === 'horarios' ? 'rgba(255,255,255,0.25)' : 'var(--bg-surface)', padding: '2px 8px', borderRadius: '999px', fontSize: '0.72rem' }}>
            {techAvailability.length}
          </span>
        </button>
      </div>

      {disponibilidadTab === 'cuadrante' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Filters */}
          <div className="detail-card" style={{ padding: '12px 16px', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-muted)' }}>Mes:</span>
              {months.map(m => (
                <button
                  key={m}
                  type="button"
                  className={`btn btn-sm ${activeMonth === m ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setActiveMonth(m)}
                  style={{ fontSize: '0.74rem', padding: '4px 10px', borderRadius: '999px', fontWeight: 700 }}
                >
                  {m === 'todos' ? 'Todos Los Meses' : m.charAt(0).toUpperCase() + m.slice(1).toLowerCase()}
                </button>
              ))}
            </div>

            <div style={{ minWidth: '180px', flex: 1, maxWidth: '280px' }}>
              <input
                type="text"
                className="input-box"
                placeholder="🔍 Buscar persona o evento..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ width: '100%', fontSize: '0.82rem', padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-surface)', color: 'var(--text-main)' }}
              />
            </div>
          </div>

          {/* Cards List */}
          {filteredSchedule.length === 0 ? (
            <div className="detail-card" style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.88rem', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
              No se encontraron turnos programados con los filtros seleccionados.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
              {filteredSchedule.map(s => (
                <div
                  key={s.id}
                  className="card animate-fade"
                  style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '14px', boxShadow: 'var(--shadow-sm)' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ background: 'rgba(59, 130, 246, 0.12)', color: 'var(--primary)', fontSize: '0.72rem', padding: '3px 8px', borderRadius: '6px', fontWeight: 800 }}>
                      {s.mes.toUpperCase()}
                    </span>
                    <strong style={{ fontSize: '0.96rem', color: 'var(--text-main)' }}>
                      {s.fechas}
                    </strong>
                  </div>

                  <div style={{ background: 'var(--bg-surface)', padding: '10px 12px', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.82rem' }}>
                    <div>
                      👔 Supervisor de Turno: <strong style={{ color: '#1e40af' }}>{s.supervisorTurno.toUpperCase()}</strong>
                    </div>
                    {s.supervisorApoyo && (
                      <div style={{ color: 'var(--text-muted)' }}>
                        👥 Supervisor Apoyo: <strong style={{ color: 'var(--text-main)' }}>{s.supervisorApoyo.toUpperCase()}</strong>
                      </div>
                    )}
                    {s.tecnicoGuardia && (
                      <div style={{ color: 'var(--text-muted)' }}>
                        👷 Técnico de Guardia: <strong style={{ color: '#059669' }}>{s.tecnicoGuardia.toUpperCase()}</strong>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* HORARIOS REGULARES / MATRIZ */
        <div className="card" style={{ padding: '0', overflow: 'hidden', borderRadius: '14px', border: '1px solid var(--border-color)' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="custom-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', fontSize: '0.82rem' }}>
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
                </tr>
              </thead>
              <tbody>
                {techAvailability.map(t => (
                  <tr key={t.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 700 }}>
                      {t.tecnicoNombre}
                    </td>
                    <td style={{ padding: '12px 8px' }}><span className="badge badge-success" style={{ fontSize: '0.7rem' }}>DISP</span></td>
                    <td style={{ padding: '12px 8px' }}><span className="badge badge-success" style={{ fontSize: '0.7rem' }}>DISP</span></td>
                    <td style={{ padding: '12px 8px' }}><span className="badge badge-success" style={{ fontSize: '0.7rem' }}>DISP</span></td>
                    <td style={{ padding: '12px 8px' }}><span className="badge badge-success" style={{ fontSize: '0.7rem' }}>DISP</span></td>
                    <td style={{ padding: '12px 8px' }}><span className="badge badge-success" style={{ fontSize: '0.7rem' }}>DISP</span></td>
                    <td style={{ padding: '12px 8px' }}><span className="badge badge-secondary" style={{ fontSize: '0.7rem' }}>LIBRE</span></td>
                    <td style={{ padding: '12px 8px' }}><span className="badge badge-secondary" style={{ fontSize: '0.7rem' }}>LIBRE</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
